const fs = require('fs');
const path = require('path');
const axios = require('axios');

const LINKEDIN_API_VERSION = '202605';
const LINKEDIN_BASE = 'https://api.linkedin.com';

/**
 * Reads an image as a binary buffer.
 * For local /uploads files, reads directly from disk (avoids loopback HTTP 403).
 * For remote URLs, fetches via HTTP.
 * @param {string} imageUrl
 * @returns {Promise<Buffer>}
 */
const getImageBuffer = async (imageUrl) => {
  if (imageUrl.includes('localhost:') && imageUrl.includes('/uploads/')) {
    const filename = imageUrl.split('/uploads/')[1];
    const filePath = path.join(__dirname, '..', 'uploads', filename);
    return fs.readFileSync(filePath);
  }
  const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
  return Buffer.from(response.data, 'binary');
};

/**
 * Publishes text and optional image to LinkedIn using the modern /rest API.
 * @param {Object} post   - { text, imageUrl }
 * @param {Object} config - { linkedinToken, linkedinUrn }
 * @returns {Promise<boolean>}
 */
const publishToLinkedIn = async (post, config) => {
  if (!config.linkedinToken || !config.linkedinUrn) {
    throw new Error('LinkedIn credentials (Access Token and Owner URN) are not configured.');
  }

  const { linkedinToken, linkedinUrn: author } = config;

  const headers = {
    'Authorization': `Bearer ${linkedinToken}`,
    'Content-Type': 'application/json',
    'LinkedIn-Version': LINKEDIN_API_VERSION,
    'X-Restli-Protocol-Version': '2.0.0'
  };

  // Verify the token is still valid before attempting to post
  try {
    const { data } = await axios.get(`${LINKEDIN_BASE}/v2/userinfo`, {
      headers: { 'Authorization': `Bearer ${linkedinToken}` }
    });
    console.log(`[LinkedIn Service] Authenticated as: ${data.name || data.sub}`);
  } catch (err) {
    throw new Error('Your LinkedIn Access Token is invalid or expired. Please reconnect via Settings.');
  }

  let uploadedMedia = [];
  if (post.media && post.media.length > 0) {
    for (const item of post.media) {
      console.log(`[LinkedIn Service] Uploading ${item.type}: ${item.url}`);

      let buffer;
      try {
        buffer = await getImageBuffer(item.url);
      } catch (err) {
        throw new Error(`Failed to read ${item.type}: ${err.message}`);
      }

      let endpoint = '';
      let payloadInit = { initializeUploadRequest: { owner: author } };

      if (item.type === 'image') {
        endpoint = '/rest/images?action=initializeUpload';
      } else if (item.type === 'video') {
        endpoint = '/rest/videos?action=initializeUpload';
        payloadInit.initializeUploadRequest.fileSizeBytes = buffer.length;
        payloadInit.initializeUploadRequest.uploadCaptions = false;
        payloadInit.initializeUploadRequest.uploadThumbnails = false;
      } else if (item.type === 'document') {
        endpoint = '/rest/documents?action=initializeUpload';
      }

      let initData;
      try {
        const { data } = await axios.post(`${LINKEDIN_BASE}${endpoint}`, payloadInit, { headers });
        initData = data.value;
      } catch (err) {
        const detail = err.response ? JSON.stringify(err.response.data) : err.message;
        console.error(`[LinkedIn Service] ${item.type} init failed:`, detail);
        throw new Error(`LinkedIn ${item.type} Init Failed: ${detail}`);
      }

      // Support various LinkedIn response structures (video, document, image)
      const uploadUrl = initData.uploadUrl || (initData.uploadInstructions && initData.uploadInstructions[0]?.uploadUrl);
      const mediaUrn = initData.image || initData.video || initData.document;

      if (!uploadUrl || !mediaUrn) {
        throw new Error(`Unexpected ${item.type} init response: ${JSON.stringify(initData)}`);
      }

      try {
        await axios.put(uploadUrl, buffer, {
          headers: {
            'Authorization': `Bearer ${linkedinToken}`,
            'Content-Type': 'application/octet-stream'
          }
        });
        uploadedMedia.push({ type: item.type, urn: mediaUrn });
        console.log(`[LinkedIn Service] ${item.type} uploaded. URN: ${mediaUrn}`);
      } catch (err) {
        const detail = err.response ? JSON.stringify(err.response.data) : err.message;
        console.error(`[LinkedIn Service] Binary upload failed:`, detail);
        throw new Error(`LinkedIn Binary Upload Failed: ${detail}`);
      }
    }
  } else if (post.imageUrl) {
    // Legacy support for older posts with just imageUrl
    console.log(`[LinkedIn Service] Uploading legacy image: ${post.imageUrl}`);
    let imgBuffer;
    try { imgBuffer = await getImageBuffer(post.imageUrl); } catch (err) { throw new Error(`Failed to read image: ${err.message}`); }
    
    let initData;
    try {
      const { data } = await axios.post(`${LINKEDIN_BASE}/rest/images?action=initializeUpload`, { initializeUploadRequest: { owner: author } }, { headers });
      initData = data.value;
    } catch (err) { throw new Error(`LinkedIn Image Init Failed: ${err.message}`); }
    
    try {
      await axios.put(initData.uploadUrl, imgBuffer, { headers: { 'Authorization': `Bearer ${linkedinToken}`, 'Content-Type': 'application/octet-stream' } });
      uploadedMedia.push({ type: 'image', urn: initData.image });
    } catch (err) { throw new Error(`LinkedIn Binary Upload Failed: ${err.message}`); }
  }

  console.log('[LinkedIn Service] Creating post via /rest/posts...');
  
  let finalCommentary = post.text;
  if (post.githubLink) {
    finalCommentary += `\n\nGitHub Project: ${post.githubLink}`;
  }
  if (post.liveLink) {
    finalCommentary += `\nLive Project: ${post.liveLink}`;
  }

  const payload = {
    author,
    commentary: finalCommentary,
    visibility: 'PUBLIC',
    distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false
  };

  if (uploadedMedia.length === 1) {
    payload.content = { media: { id: uploadedMedia[0].urn, title: 'Post Media' } };
  } else if (uploadedMedia.length > 1) {
    // Multiple images (Carousel)
    const images = uploadedMedia.filter(m => m.type === 'image').map(m => ({ id: m.urn }));
    if (images.length > 0) {
      payload.content = { multiImage: { images } };
    }
  }

  try {
    const response = await axios.post(`${LINKEDIN_BASE}/rest/posts`, payload, { headers });
    const postUrn = response.headers['x-restli-id'] || '';
    console.log(`[LinkedIn Service] Post published successfully. URN: ${postUrn}`);
    return postUrn;
  } catch (err) {
    const detail = err.response ? JSON.stringify(err.response.data) : err.message;
    console.error('[LinkedIn Service] Post creation failed:', detail);
    throw new Error(`LinkedIn Post Creation Failed: ${detail}`);
  }
};

/**
 * Fetches engagement statistics (likes and comments) for a specific post URN.
 * @param {string} postUrn
 * @param {Object} config - { linkedinToken }
 * @returns {Promise<Object>} - { likes: Number, comments: Number }
 */
const getPostMetrics = async (postUrn, config) => {
  if (!config.linkedinToken) {
    throw new Error('LinkedIn Access Token is not configured.');
  }

  const headers = {
    'Authorization': `Bearer ${config.linkedinToken}`,
    'Content-Type': 'application/json',
    'LinkedIn-Version': LINKEDIN_API_VERSION,
    'X-Restli-Protocol-Version': '2.0.0'
  };

  try {
    const encodedUrn = encodeURIComponent(postUrn);
    const { data } = await axios.get(`${LINKEDIN_BASE}/rest/socialActions/${encodedUrn}`, { headers });
    
    const likes = data.likesSummary?.totalLikes || 0;
    const comments = data.commentsSummary?.totalFirstLevelComments || 0;
    
    return { likes, comments };
  } catch (err) {
    console.error(`[LinkedIn Service] Failed to fetch metrics for ${postUrn}:`, err.response?.data || err.message);
    return { likes: 0, comments: 0 };
  }
};

module.exports = { publishToLinkedIn, getPostMetrics };
