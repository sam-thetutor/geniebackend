const mongoose = require('mongoose');

const postingPatternSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  platform: {
    type: String,
    required: true,
    enum: ['telegram', 'discord', 'scheduled']
  },
  channelId: {
    type: String,
    required: true
  },
  patterns: {
    // Tone and style patterns
    averageLength: Number,
    commonPhrases: [String],
    emojiUsage: {
      type: Map,
      of: Number
    },
    hashtagUsage: [String],
    formality: {
      type: String,
      enum: ['casual', 'neutral', 'formal']
    },
    // Timing patterns
    postingTimes: [{
      hour: Number,
      dayOfWeek: Number,
      frequency: Number
    }],
    postFrequency: {
      daily: Number,
      weekly: Number
    },
    // Content patterns
    topics: [{
      name: String,
      frequency: Number
    }],
    mediaUsage: {
      images: Number,
      videos: Number,
      links: Number
    }
  },
  lastAnalyzed: {
    type: Date,
    default: Date.now
  },
  sampleSize: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('PostingPattern', postingPatternSchema); 