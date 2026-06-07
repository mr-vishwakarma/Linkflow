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

  // Step 1: Upload image (if present)
  let imageUrn = null;
  if (post.imageUrl) {
    console.log(`[LinkedIn Service] Uploading image: ${post.imageUrl}`);

    let imgBuffer;
    try {
      imgBuffer = await getImageBuffer(post.imageUrl);
    } catch (err) {
      throw new Error(`Failed to read image: ${err.message}`);
    }

    // Initialize upload slot
    let initData;
    try {
      const { data } = await axios.post(
        `${LINKEDIN_BASE}/rest/images?action=initializeUpload`,
        { initializeUploadRequest: { owner: author } },
        { headers }
      );
      initData = data.value;
    } catch (err) {
      const detail = err.response ? JSON.stringify(err.response.data) : err.message;
      console.error('[LinkedIn Service] Image init failed:', detail);
      throw new Error(`LinkedIn Image Init Failed: ${detail}`);
    }

    if (!initData?.uploadUrl || !initData?.image) {
      throw new Error(`Unexpected image init response: ${JSON.stringify(initData)}`);
    }

    // Binary PUT upload
    try {
      await axios.put(initData.uploadUrl, imgBuffer, {
        headers: {
          'Authorization': `Bearer ${linkedinToken}`,
          'Content-Type': 'application/octet-stream'
        }
      });
      imageUrn = initData.image;
      console.log(`[LinkedIn Service] Image uploaded. URN: ${imageUrn}`);
    } catch (err) {
      const detail = err.response ? JSON.stringify(err.response.data) : err.message;
      console.error('[LinkedIn Service] Binary upload failed:', detail);
      throw new Error(`LinkedIn Binary Upload Failed: ${detail}`);
    }
  }

  // Step 2: Create the post
  console.log('[LinkedIn Service] Creating post via /rest/posts...');
  const payload = {
    author,
    commentary: post.text,
    visibility: 'PUBLIC',
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: []
    },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false
  };

  if (imageUrn) {
    payload.content = { media: { id: imageUrn, title: 'Post Graphic' } };
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

module.exports = { publishToLinkedIn };
