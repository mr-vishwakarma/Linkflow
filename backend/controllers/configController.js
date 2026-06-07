const axios = require('axios');
const { Client } = require('@notionhq/client');
const Config = require('../models/Config');

// Helper to mask secrets
const maskToken = (token) => {
  if (!token) return '';
  if (token.length <= 8) return '********';
  return `${token.substring(0, 4)}...${token.substring(token.length - 4)}`;
};

const getConfig = async (req, res) => {
  try {
    const config = await Config.getOrCreate();
    res.json({
      success: true,
      config: {
        linkedinUrn:          config.linkedinUrn || '',
        notionDatabaseId:     config.notionDatabaseId || '',
        hasLinkedinToken:     !!config.linkedinToken,
        hasNotionToken:       !!config.notionToken,
        linkedinTokenMasked:  maskToken(config.linkedinToken),
        notionTokenMasked:    maskToken(config.notionToken),
        linkedinTokenDaysLeft: config.linkedinTokenDaysLeft  // null if not set, 0–60 if connected
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateConfig = async (req, res) => {
  try {
    const { linkedinToken, linkedinUrn, notionToken, notionDatabaseId } = req.body;
    const config = await Config.getOrCreate();

    if (linkedinToken && !linkedinToken.includes('...')) {
      config.linkedinToken = linkedinToken.trim();
    }
    if (linkedinUrn !== undefined) {
      config.linkedinUrn = linkedinUrn.trim();
    }
    if (notionToken && !notionToken.includes('...')) {
      config.notionToken = notionToken.trim();
    }
    if (notionDatabaseId !== undefined) {
      let cleanedId = notionDatabaseId.trim();
      const match = cleanedId.match(/([a-f0-9]{32})/i);
      if (match) cleanedId = match[1];
      config.notionDatabaseId = cleanedId;
    }

    config.updatedAt = new Date();
    await config.save();

    res.json({
      success: true,
      message: 'Configuration credentials updated successfully',
      config: {
        linkedinUrn: config.linkedinUrn,
        notionDatabaseId: config.notionDatabaseId,
        hasLinkedinToken: !!config.linkedinToken,
        hasNotionToken: !!config.notionToken,
        linkedinTokenMasked: maskToken(config.linkedinToken),
        notionTokenMasked: maskToken(config.notionToken)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const testLinkedin = async (req, res) => {
  try {
    const { token, urn } = req.body;
    const config = await Config.getOrCreate();
    const activeToken = (token && !token.includes('...')) ? token.trim() : config.linkedinToken;

    if (!activeToken) {
      return res.status(400).json({ success: false, message: 'LinkedIn Access Token is not set.' });
    }

    const headers = {
      'Authorization': `Bearer ${activeToken}`,
      'X-Restli-Protocol-Version': '2.0.0'
    };

    let profileData = {};

    try {
      // Method A: Modern OpenID Connect API
      const uiRes = await axios.get('https://api.linkedin.com/v2/userinfo', { headers });
      profileData = {
        firstName: uiRes.data.given_name || 'N/A',
        lastName: uiRes.data.family_name || 'N/A',
        id: uiRes.data.sub
      };
    } catch (uiErr) {
      // Method B: Legacy profile API fallback
      if (uiErr.response && uiErr.response.status === 403) {
        console.log('[Config Controller] v2/userinfo returned 403. Attempting /v2/me legacy fallback...');
        try {
          const meRes = await axios.get('https://api.linkedin.com/v2/me', { headers });
          profileData = {
            firstName: meRes.data.localizedFirstName || 'N/A',
            lastName: meRes.data.localizedLastName || 'N/A',
            id: meRes.data.id
          };
        } catch (meErr) {
          console.error('[Config Controller] Fallback /v2/me also failed:', meErr.message);
          throw uiErr; // Throw the original 403 error if both fail
        }
      } else {
        throw uiErr;
      }
    }

    res.json({
      success: true,
      profile: profileData
    });
  } catch (err) {
    console.error('LinkedIn connection test failed:', err.response ? err.response.data : err.message);
    res.status(500).json({
      success: false,
      message: `LinkedIn Authenticating Error: ${err.message}`,
      details: err.response ? JSON.stringify(err.response.data) : null
    });
  }
};

const testNotion = async (req, res) => {
  try {
    const { token, databaseId } = req.body;
    const config = await Config.getOrCreate();
    const activeToken = (token && !token.includes('...')) ? token.trim() : config.notionToken;
    let activeDatabaseId = databaseId ? databaseId.trim() : config.notionDatabaseId;

    if (activeDatabaseId) {
      const match = activeDatabaseId.match(/([a-f0-9]{32})/i);
      if (match) activeDatabaseId = match[1];
    }

    if (!activeToken || !activeDatabaseId) {
      return res.status(400).json({ success: false, message: 'Notion Token and Database ID are required.' });
    }

    const notion = new Client({ auth: activeToken });
    const dbRes = await notion.databases.retrieve({ database_id: activeDatabaseId });
    
    const titleText = dbRes.title && dbRes.title.length > 0 
      ? dbRes.title.map(t => t.plain_text).join('') 
      : 'Untitled Database';

    res.json({
      success: true,
      database: {
        title: titleText,
        id: dbRes.id
      }
    });
  } catch (err) {
    console.error('Notion connection test failed:', err.message);
    res.status(500).json({
      success: false,
      message: `Notion Authenticating Error: ${err.message}`
    });
  }
};

module.exports = {
  getConfig,
  updateConfig,
  testLinkedin,
  testNotion
};
