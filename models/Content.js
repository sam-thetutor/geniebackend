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
    get: (time) => time,
    set: (time) => {
      // Ensure time is stored as UTC
      const date = new Date(time);
      return new Date(date.getTime());
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