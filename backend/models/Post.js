const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
  notionPageId: {
    type: String,
    required: true,
    unique: true
  },
  text: {
    type: String,
    required: true
  },
  imageUrl: {
    type: String,
    default: ''
  },
  scheduledTime: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'publishing', 'posted', 'failed'],
    default: 'pending'
  },
  postUrl: {
    type: String,
    default: ''
  },
  error: {
    type: String,
    default: null
  },
  postedAt: {
    type: Date,
    default: null
  },
  syncedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Post', PostSchema);
