const { Client } = require('@notionhq/client');

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

module.exports = {
  queryNotionDatabase,
  updateNotionPageStatus
};
