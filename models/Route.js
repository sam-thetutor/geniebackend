const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema({
  principal: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  platform: {
    type: String,
    required: true,
    enum: ['discord', 'telegram', 'twitter']
  },
  sourceId: {
    type: String,
    required: true
  },
  openchatApiKey: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'paused'],
    default: 'active'
  },
  filters: {
    includeText: Boolean,
    includeImages: Boolean,
    includeLinks: Boolean,
    keywords: [String]
  },
  lastSync: Date,
  errorCount: {
    type: Number,
    default: 0
  },
  lastError: String,
  twitterUsername: String,
  telegramUsername: String,
  discordUsername: String,
  lastTweetId: String,
  monitoringInterval: {
    type: Number,
    default: 5
  },
  includeRetweets: {
    type: Boolean,
    default: false
  },
  includeReplies: {
    type: Boolean,
    default: false
  },
  lastCheck: Date,
  sourceType: {
    type: String,
    required: true,
    enum: ['telegram', 'twitter', 'discord']
  },
  source: {
    chatId: String,
    channelId: String,
    username: String,
    groupId: String
  },
  destinationType: {
    type: String,
    required: true,
    enum: ['openchat', 'telegram', 'twitter', 'discord']
  },
  destination: {
    chatId: String,
    channelId: String,
    groupId: String
  },
  active: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Route', routeSchema); 