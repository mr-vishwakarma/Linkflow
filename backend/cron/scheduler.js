const cron = require('node-cron');
const Post = require('../models/Post');
const Config = require('../models/Config');
const { publishToLinkedIn } = require('../services/linkedinService');
const { updateNotionPageStatus } = require('../services/notionService');
const { sendSuccessNotification } = require('../services/notificationService');

/**
 * Checks for pending posts whose scheduled time is in the past, and publishes them.
 * This function is used by both local node-cron and Vercel serverless cron routes.
 */
const runScheduledJobs = async () => {
  const now = new Date();
  console.log(`[Scheduler] Checking for due posts at ${now.toISOString()}...`);
  
  try {
    const duePosts = await Post.find({
      status: 'pending',
      scheduledTime: { $lte: now }
    });

    if (duePosts.length === 0) {
      console.log('[Scheduler] No due posts found.');
      return { processed: 0, success: 0, failed: 0 };
    }

    console.log(`[Scheduler] Found ${duePosts.length} due posts at ${now.toISOString()}. Processing...`);
    const config = await Config.getOrCreate();
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
