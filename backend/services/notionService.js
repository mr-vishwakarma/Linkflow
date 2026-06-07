const { Client } = require('@notionhq/client');
const Post = require('../models/Post');

/**
 * Queries Notion database for pages marked as 'Scheduled' or 'Ready'.
 * @param {Object} config - Config details containing notionToken and notionDatabaseId.
 * @returns {Promise<Array>}
 */
const queryNotionDatabase = async (config) => {
  if (!config.notionToken || !config.notionDatabaseId) {
    throw new Error('Notion token and database ID are not configured.');
  }

  const notion = new Client({ auth: config.notionToken });

  // 1. Fetch database details to detect the exact type of the 'Status' property dynamically
  let statusType = 'status'; // default fallback
  let matchedKey = 'Status';
  try {
    const dbDetails = await notion.databases.retrieve({ database_id: config.notionDatabaseId });
    const propertyKeys = Object.keys(dbDetails.properties);
    const key = propertyKeys.find(k => k.toLowerCase() === 'status');
    if (key) {
      matchedKey = key;
      statusType = dbDetails.properties[key].type || 'status';
    }
  } catch (err) {
    console.warn('[Notion Service] Could not retrieve database schema to detect Status type, falling back to status:', err.message);
  }

  // 2. Build strictly-typed filter clauses matching the detected column type
  const filterOrClauses = [];
  const targetStatuses = ['Scheduled', 'Ready'];

  for (const statusVal of targetStatuses) {
    if (statusType === 'status') {
      filterOrClauses.push({
        property: matchedKey,
        status: {
          equals: statusVal
        }
      });
    } else if (statusType === 'select') {
      filterOrClauses.push({
        property: matchedKey,
        select: {
          equals: statusVal
        }
      });
    } else {
      // Default fallback
      filterOrClauses.push({
        property: matchedKey,
        status: {
          equals: statusVal
        }
      });
    }
  }

  const response = await notion.databases.query({
    database_id: config.notionDatabaseId,
    filter: {
      or: filterOrClauses
    }
  });

  return response.results;
};

/**
 * Updates page status on Notion to 'Published'.
 * @param {string} pageId - Notion page URN ID.
 * @param {Object} config - Configurations.
 * @returns {Promise<void>}
 */
const updateNotionPageStatus = async (pageId, config, postUrl = '') => {
  if (!config.notionToken) return;

  const notion = new Client({ auth: config.notionToken });

  try {
    const pageDetails = await notion.pages.retrieve({ page_id: pageId });
    const propertiesKeys = Object.keys(pageDetails.properties);
    const statusPropKey = propertiesKeys.find(key => key.toLowerCase() === 'status') || 'Status';
    const statusProp = pageDetails.properties[statusPropKey];
    
    const patchProperties = {};

    if (statusProp) {
      patchProperties[statusPropKey] = {
        ...(statusProp.type === 'status' ? { status: { name: 'Published' } } : { select: { name: 'Published' } })
      };
    }

    if (postUrl) {
      const urlPropKey = propertiesKeys.find(key => {
        const prop = pageDetails.properties[key];
        return prop.type === 'url' || key.toLowerCase().includes('url') || key.toLowerCase().includes('link');
      });

      if (urlPropKey) {
        const urlPropType = pageDetails.properties[urlPropKey].type;
        if (urlPropType === 'url') {
          patchProperties[urlPropKey] = { url: postUrl };
        } else if (urlPropType === 'rich_text') {
          patchProperties[urlPropKey] = {
            rich_text: [{ text: { content: postUrl } }]
          };
        }
      }
    }

    if (Object.keys(patchProperties).length > 0) {
      await notion.pages.update({
        page_id: pageId,
        properties: patchProperties
      });
      console.log(`[Notion Service] Updated page ${pageId} properties successfully`);
    }
  } catch (err) {
    console.error(`[Notion Service] Failed to update status on Notion for page ${pageId}:`, err.message);
  }
};

/**
  * Synchronizes posts from Notion database to local MongoDB queue.
  * @param {Object} config - Config details containing notionToken and notionDatabaseId.
  * @returns {Promise<Object>} Object containing counts of added and updated posts.
  */
const syncNotionDatabase = async (config) => {
  if (!config.notionToken || !config.notionDatabaseId) {
    throw new Error('Notion token and database ID are not configured.');
  }

  console.log('[Notion Service] Fetching Notion content schedule...');
  const results = await queryNotionDatabase(config);
  console.log(`[Notion Service] Notion sync returned ${results.length} rows.`);

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
        console.warn(`[Notion Service] Fallback body fetch failed for page ${pageId}:`, notionErr.message);
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

  return { addedCount, updatedCount };
};

module.exports = {
  queryNotionDatabase,
  updateNotionPageStatus,
  syncNotionDatabase
};
