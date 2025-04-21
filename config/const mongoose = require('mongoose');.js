const mongoose = require('mongoose');
const ChatInstance = require('../models/ChatInstance');
const { OpenAI } = require('@langchain/openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const saveChatInstance = async (req, res) => {
  try {
    const { name, principal } = req.body;
    
    const chatInstance = new ChatInstance({
      name,
      principal,
      messages: [],
      createdAt: new Date()
    });

    await chatInstance.save();
    res.status(201).json(chatInstance);
  } catch (error) {
    console.error('Error saving chat instance:', error);
    res.status(500).json({ message: 'Error creating chat instance' });
  }
};

const getChatInstances = async (req, res) => {
  try {
    const { principal } = req.query;
    const instances = await ChatInstance.find({ principal })
      .sort({ createdAt: -1 });
    res.json(instances);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching chat instances' });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { instanceId, message } = req.body;
    
    const chatInstance = await ChatInstance.findById(instanceId);
    if (!chatInstance) {
      return res.status(404).json({ message: 'Chat instance not found' });
    }

    // Add user message
    chatInstance.messages.push({
      role: 'user',
      content: message
    });

    // Get AI response
    const completion = await openai.chat.completions.create({
      messages: chatInstance.messages,
      model: "gpt-3.5-turbo",
    });

    // Add AI response
    const aiResponse = completion.choices[0].message.content;
    chatInstance.messages.push({
      role: 'assistant',
      content: aiResponse
    });

    await chatInstance.save();
    res.json({ message: aiResponse });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Error processing message' });
  }
};

module.exports = {
  saveChatInstance,
  getChatInstances,
  sendMessage
};




