const Config = require('../models/Config');
const { syncNotionDatabase } = require('../services/notionService');

const syncNotion = async (req, res) => {
  try {
    const config = await Config.getOrCreate();
    if (!config.notionToken || !config.notionDatabaseId) {
      return res.status(400).json({ success: false, message: 'Notion Integration API keys are not configured.' });
    }

    const { addedCount, updatedCount } = await syncNotionDatabase(config);

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
