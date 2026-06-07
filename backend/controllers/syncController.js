const { Client } = require('@notionhq/client');
const Post = require('../models/Post');
const Config = require('../models/Config');
const { queryNotionDatabase } = require('../services/notionService');

const syncNotion = async (req, res) => {
  try {
    const config = await Config.getOrCreate();
    if (!config.notionToken || !config.notionDatabaseId) {
      return res.status(400).json({ success: false, message: 'Notion Integration API keys are not configured.' });
    }

    console.log('[Sync Controller] Fetching Notion content schedule...');
    const results = await queryNotionDatabase(config);
    console.log(`[Sync Controller] Notion sync returned ${results.length} rows.`);

    let addedCount = 0;
    let updatedCount = 0;

    const notion = new Client({ auth: config.notionToken });

    for (const page of results) {
      const pageId = page.id;
      
      // 1. Extract Text Caption
      let captionText = '';
      const titleProp = page.properties.Name || page.properties.Title || page.properties.Caption;
      if (titleProp && titleProp.title && titleProp.title.length > 0) {
        captionText = titleProp.title.map(t => t.plain_text).join('');
      }

      // Fallback: search text blocks in body
      if (!captionText) {
        try {
          const blocks = await notion.blocks.children.list({ block_id: pageId });
          captionText = blocks.results
            .filter(b => b.type === 'paragraph' && b.paragraph.rich_text.length > 0)
            .map(b => b.paragraph.rich_text.map(t => t.plain_text).join(''))
            .join('\n');
        } catch (notionErr) {
          console.warn(`[Sync Controller] Fallback body fetch failed for page ${pageId}:`, notionErr.message);
        }
      }

      if (!captionText) continue;

      // 2. Extract Date Time
      let scheduledDate = null;
      const dateProp = page.properties.Schedule || page.properties.Date || page.properties['Publish Time'];
      if (dateProp && dateProp.date && dateProp.date.start) {
        scheduledDate = new Date(dateProp.date.start);
      } else {
        const fallback = new Date();
        fallback.setHours(fallback.getHours() + 1);
        scheduledDate = fallback;
      }

      // 3. Extract Image URL
      let imgUrl = '';
      const imageProp = page.properties.Image || page.properties['Image URL'] || page.properties.Graphic;
      if (imageProp) {
        if (imageProp.type === 'url' && imageProp.url) {
          imgUrl = imageProp.url;
        } else if (imageProp.type === 'files' && imageProp.files && imageProp.files.length > 0) {
          const file = imageProp.files[0];
          imgUrl = file.type === 'external' ? file.external.url : (file.file ? file.file.url : '');
        }
      }

      // Check if duplicate exists
      const existing = await Post.findOne({ notionPageId: pageId });
      
      if (!existing) {
        await Post.create({
          notionPageId: pageId,
          text: captionText,
          imageUrl: imgUrl,
          scheduledTime: scheduledDate,
          status: 'pending'
        });
        addedCount++;
      } else {
        if (existing.status === 'pending' || existing.status === 'failed') {
          existing.text = captionText;
          existing.imageUrl = imgUrl;
          existing.scheduledTime = scheduledDate;
          existing.status = 'pending';
          existing.error = null;
          await existing.save();
          updatedCount++;
        }
      }
    }

    res.json({
      success: true,
      message: `Sync finished: ${addedCount} posts imported, ${updatedCount} posts updated in queue.`
    });
  } catch (err) {
    console.error('[Sync Controller] Notion sync operation failed:', err);
    res.status(500).json({ success: false, message: `Sync Error: ${err.message}` });
  }
};

module.exports = {
  syncNotion
};
