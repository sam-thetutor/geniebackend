const Content = require('../models/Content');
const { validationResult } = require('express-validator');

exports.createContent = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const content = new Content(req.body);
    await content.save();
    res.status(201).json(content);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getContents = async (req, res) => {
  try {
    const { campaignId } = req.query;
    if (!campaignId) {
      return res.status(400).json({ message: 'Campaign ID is required' });
    }

    const contents = await Content.find({ campaignId })
      .sort({ scheduledTime: 1 });
    res.json(contents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateContent = async (req, res) => {
  try {
    const content = await Content.findById(req.params.id);
    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }

    // Don't allow updating content that's already posted
    if (content.status === 'posted') {
      return res.status(400).json({ message: 'Cannot update posted content' });
    }

    Object.assign(content, req.body);
    await content.save();
    res.json(content);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteContent = async (req, res) => {
  try {
    console.log('Deleting content with id:', req.params.id);
    const content = await Content.findById(req.params.id);
    
    if (!content) {
      console.log('Content not found');
      return res.status(404).json({ message: 'Content not found' });
    }

    // Don't allow deleting content that's already posted
    if (content.status === 'posted') {
      console.log('Cannot delete posted content');
      return res.status(400).json({ message: 'Cannot delete posted content' });
    }

    await content.deleteOne();
    console.log('Content deleted successfully');
    return res.status(200).json({ message: 'Content deleted successfully' });
  } catch (error) {
    console.error('Error deleting content:', error);
    return res.status(500).json({ message: error.message });
  }
}; 