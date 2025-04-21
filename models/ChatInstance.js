const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const chatInstanceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  principal: {
    type: String,
    required: true,
    index: true
  },
  messages: [messageSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastMessage: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ChatInstance', chatInstanceSchema); 