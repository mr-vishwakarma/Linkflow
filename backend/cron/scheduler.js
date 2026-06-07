const cron = require('node-cron');
const Post = require('../models/Post');
const Config = require('../models/Config');
const { publishToLinkedIn, getPostMetrics } = require('../services/linkedinService');
const { updateNotionPageStatus } = require('../services/notionService');
const { sendSuccessNotification } = require('../services/notificationService');

/**
 * Checks for pending posts whose scheduled time is in the past, and publishes them.
 * This function is used by both local node-cron and Vercel serverless cron routes.
 */
const updateAllPostMetrics = async (config) => {
  try {
    if (!config.linkedinToken) return;

    // Find posts published in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activePosts = await Post.find({
      status: 'posted',
      postedAt: { $gte: thirtyDaysAgo },
      postUrn: { $exists: true, $ne: '' }
    });

    if (activePosts.length === 0) return;

    console.log(`[Scheduler] Checking/updating engagement metrics for ${activePosts.length} posts...`);
    
    for (const post of activePosts) {
      // Throttle: only update if not updated in the last 15 minutes
      const lastUpdated = post.analytics?.lastUpdatedAt;
      if (lastUpdated && (new Date() - lastUpdated < 15 * 60 * 1000)) {
        continue;
      }

      const metrics = await getPostMetrics(post.postUrn, config);
      post.analytics = {
        likes: metrics.likes,
        comments: metrics.comments,
        shares: 0,
        lastUpdatedAt: new Date()
      };
      await post.save();
      console.log(`[Scheduler] Updated metrics for post ${post._id}: likes=${metrics.likes}, comments=${metrics.comments}`);
    }
  } catch (err) {
    console.error('[Scheduler] Failed to update post metrics:', err.message);
  }
};

const runScheduledJobs = async () => {
  const now = new Date();
  console.log(`[Scheduler] Checking for due posts at ${now.toISOString()}...`);
  
  try {
    const config = await Config.getOrCreate();

    // Auto-sync from Notion if configured
    if (config.notionToken && config.notionDatabaseId) {
      console.log('[Scheduler] Auto-syncing from Notion database...');
      try {
        const { syncNotionDatabase } = require('../services/notionService');
        const syncRes = await syncNotionDatabase(config);
        console.log(`[Scheduler] Notion auto-sync complete. Added: ${syncRes.addedCount}, Updated: ${syncRes.updatedCount}`);
      } catch (syncErr) {
        console.error('[Scheduler] Notion auto-sync failed:', syncErr.message);
      }
    }

    // Auto-update engagement metrics
    await updateAllPostMetrics(config);

    const duePosts = await Post.find({
      status: 'pending',
      scheduledTime: { $lte: now }
    });

    if (duePosts.length === 0) {
      console.log('[Scheduler] No due posts found.');
      return { processed: 0, success: 0, failed: 0 };
    }

    console.log(`[Scheduler] Found ${duePosts.length} due posts at ${now.toISOString()}. Processing...`);
    let success = 0;
    let failed = 0;

    for (const post of duePosts) {
      post.status = 'publishing';
      await post.save();
      console.log(`[Scheduler] Publishing post ID: ${post._id}`);

      try {
        const postUrn = await publishToLinkedIn(post, config);
        let postUrl = '';
        if (postUrn) {
          postUrl = `https://www.linkedin.com/feed/update/${postUrn}`;
          post.postUrl = postUrl;
          post.postUrn = postUrn;
        }
        
        post.status = 'posted';
        post.postedAt = new Date();
        post.error = null;
        await post.save();
        console.log(`[Scheduler] Successfully published post ID: ${post._id}`);

        // Two-way sync to Notion
        if (post.notionPageId && !post.notionPageId.startsWith('local-')) {
          await updateNotionPageStatus(post.notionPageId, config, postUrl);
        }

        // Trigger success webhook notification
        sendSuccessNotification(post).catch(err => console.error('[Scheduler] Webhook notification error:', err.message));

        success++;
      } catch (err) {
        console.error(`[Scheduler] Failed to publish post ID ${post._id}:`, err.message);
        post.status = 'failed';
        post.error = err.message || 'Unknown error occurred';
        await post.save();
        failed++;
      }
    }

    return { processed: duePosts.length, success, failed };
  } catch (err) {
    console.error('[Scheduler] Error scanning or running scheduled posts:', err.message);
    throw err;
  }
};

const initScheduler = () => {
  console.log('[Scheduler] Initializing minute-by-minute automation scheduler...');
  
  // Scan every minute in local development
  cron.schedule('* * * * *', async () => {
    try {
      await runScheduledJobs();
    } catch (cronErr) {
      console.error('[Scheduler] Cron job execution encountered an error:', cronErr.message);
    }
  });
};

module.exports = {
  initScheduler,
  runScheduledJobs
};
