const ImageKit = require('imagekit');

let imagekitInstance = null;

/**
 * Initializes and returns the ImageKit SDK instance.
 */
const getImageKitInstance = () => {
  if (imagekitInstance) return imagekitInstance;

  const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;

  if (!publicKey || !privateKey) {
    console.warn('[ImageKit Service] IMAGEKIT_PUBLIC_KEY and/or IMAGEKIT_PRIVATE_KEY is missing from environment. Uploads will fail.');
    return null;
  }

  imagekitInstance = new ImageKit({
    publicKey,
    privateKey,
    urlEndpoint: urlEndpoint || `https://ik.imagekit.io/${publicKey.split('_')[1]?.split('/')[0] || ''}`
  });

  console.log('[ImageKit Service] Initialized ImageKit client successfully.');
  return imagekitInstance;
};

/**
 * Uploads a base64 string to ImageKit.
 * @param {string} base64Data - Raw base64 data (without the data URI header)
 * @param {string} fileName - Destination filename
 * @returns {Promise<string>} The public HTTPS URL of the uploaded image
 */
const uploadBase64ToImageKit = async (base64Data, fileName) => {
  const ik = getImageKitInstance();
  if (!ik) {
    throw new Error('ImageKit credentials are not configured.');
  }

  const response = await ik.upload({
    file: base64Data, // can be base64 string
    fileName: fileName || `upload-${Date.now()}.png`,
    folder: '/linkflow'
  });

  return response.url;
};

module.exports = {
  uploadBase64ToImageKit
};
