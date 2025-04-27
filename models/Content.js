const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema({
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    required: true,
    index: true
  },
  content: {
    type: String,
    required: true
  },
  scheduledTime: {
    type: Date,
    required: true,
    get: (time) => {
      if (!time) return time;
      return new Date(time);
    },
    set: (time) => {
      if (!time) return time;
      // Ensure time is stored as UTC
      const date = new Date(time);
      return new Date(Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        date.getUTCHours(),
        date.getUTCMinutes()
      ));
    }
  },
  status: {
    type: String,
    enum: ['pending', 'posted', 'failed'],
    default: 'pending'
  },
  lastError: {
    type: String
  },
  attempts: {
    type: Number,
    default: 0
  },
  lastAttempt: {
    type: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Content', contentSchema); 