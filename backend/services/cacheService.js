const { createClient } = require('redis');

const redisUrl = process.env.REDIS_URL;
let client = null;
let isConnected = false;

if (redisUrl) {
  console.log('[Cache Service] Initializing Redis client...');
  client = createClient({
    url: redisUrl,
    socket: {
      reconnectStrategy: (retries) => {
        // Retry connection with exponential delay capped at 10 seconds
        const delay = Math.min(retries * 500, 10000);
        console.warn(`[Cache Service] Redis connection lost. Retrying in ${delay}ms...`);
        return delay;
      }
    }
  });

  client.on('error', (err) => {
    // Silently capture errors to prevent crashes, log as warning
    console.warn(`[Cache Service] Redis Warning: ${err.message}`);
    isConnected = false;
  });

  client.on('connect', () => {
    console.log('[Cache Service] Redis client establishing connection...');
  });

  client.on('ready', () => {
    console.log('[Cache Service] Redis connection established successfully.');
    isConnected = true;
  });

  client.on('end', () => {
    console.log('[Cache Service] Redis client connection closed.');
    isConnected = false;
  });

  // Connect client asynchronously
  client.connect().catch((err) => {
    console.error('[Cache Service] Failed to initiate Redis connection:', err.message);
    isConnected = false;
  });
} else {
  console.log('[Cache Service] REDIS_URL not defined. Cache operations will fall back to database directly.');
}

/**
 * Get item from cache.
 * @param {string} key
 * @returns {Promise<any|null>}
 */
const get = async (key) => {
  if (!client || !isConnected) return null;
  try {
    const data = await client.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  } catch (err) {
    console.warn(`[Cache Service] Failed to retrieve key "${key}":`, err.message);
    return null;
  }
};

/**
 * Set item in cache.
 * @param {string} key
 * @param {any} value
 * @param {number} [ttlSeconds] Optional TTL in seconds
 * @returns {Promise<boolean>}
 */
const set = async (key, value, ttlSeconds) => {
  if (!client || !isConnected) return false;
  try {
    const valStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
    const options = {};
    if (ttlSeconds && typeof ttlSeconds === 'number') {
      options.EX = ttlSeconds;
    }
    await client.set(key, valStr, options);
    return true;
  } catch (err) {
    console.warn(`[Cache Service] Failed to set key "${key}":`, err.message);
    return false;
  }
};

/**
 * Delete item from cache.
 * @param {string} key
 * @returns {Promise<boolean>}
 */
const del = async (key) => {
  if (!client || !isConnected) return false;
  try {
    await client.del(key);
    return true;
  } catch (err) {
    console.warn(`[Cache Service] Failed to delete key "${key}":`, err.message);
    return false;
  }
};

/**
 * Check if the cache is connected.
 * @returns {boolean}
 */
const isReady = () => {
  return isConnected;
};

module.exports = {
  get,
  set,
  del,
  isReady
};
