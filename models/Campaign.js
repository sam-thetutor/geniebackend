const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  principal: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  apiKey: {
    type: Object,
    required: true
  },
  schedule: {
    type: Object,
    default: {}
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['active', 'paused'],
    default: 'active'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Campaign', campaignSchema); 