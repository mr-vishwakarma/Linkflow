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

// Since we only need a single active configuration row:
ConfigSchema.statics.getOrCreate = async function () {
  let config = await this.findOne();
  if (!config) {
    config = await this.create({});
  }
  return config;
};

module.exports = mongoose.model('Config', ConfigSchema);
