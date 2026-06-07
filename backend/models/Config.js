const mongoose = require('mongoose');

// LinkedIn Access Tokens last exactly 60 days
const LINKEDIN_TOKEN_TTL_DAYS = 60;

const ConfigSchema = new mongoose.Schema({
  linkedinToken: {
    type: String,
    default: ''
  },
  linkedinUrn: {
    type: String,
    default: ''
  },
  // Tracks when the LinkedIn token was last issued so we can warn before expiry
  linkedinTokenIssuedAt: {
    type: Date,
    default: null
  },
  notionToken: {
    type: String,
    default: ''
  },
  notionDatabaseId: {
    type: String,
    default: ''
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Returns the number of days remaining before the LinkedIn token expires.
// Returns null if the token issue date is not recorded.
ConfigSchema.virtual('linkedinTokenDaysLeft').get(function () {
  if (!this.linkedinTokenIssuedAt) return null;
  const expiresAt = new Date(this.linkedinTokenIssuedAt);
  expiresAt.setDate(expiresAt.getDate() + LINKEDIN_TOKEN_TTL_DAYS);
  const msLeft = expiresAt - Date.now();
  return Math.max(0, Math.floor(msLeft / (1000 * 60 * 60 * 24)));
});

ConfigSchema.set('toJSON', { virtuals: true });
ConfigSchema.set('toObject', { virtuals: true });

// Post-save hook to invalidate cache
ConfigSchema.post('save', async function () {
  const cacheService = require('../services/cacheService');
  try {
    await cacheService.del('config:global');
    console.log('[Config Model] Cache invalidated for config:global');
  } catch (err) {
    console.warn('[Config Model] Failed to invalidate cache on save:', err.message);
  }
});

// Since we only need a single active configuration row:
ConfigSchema.statics.getOrCreate = async function () {
  const cacheService = require('../services/cacheService');
  const cacheKey = 'config:global';
  
  try {
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return this.hydrate(cached);
    }
  } catch (err) {
    console.warn('[Config Model] Cache retrieval warning:', err.message);
  }

  let config = await this.findOne();
  if (!config) {
    config = await this.create({});
  }

  try {
    await cacheService.set(cacheKey, config.toObject({ virtuals: true }), 86400); // 24 hours TTL
  } catch (err) {
    console.warn('[Config Model] Cache storage warning:', err.message);
  }

  return config;
};

module.exports = mongoose.model('Config', ConfigSchema);
