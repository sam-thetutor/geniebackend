const Route = require('../models/Route');
const { validationResult } = require('express-validator');

const createRoute = async (req, res) => {
  try {
    const {
      principal,
      name,
      platform,
      sourceId,
      openchatApiKey,
      twitterUsername,
      telegramUsername,
      discordUsername,
      includeRetweets,
      includeReplies,
      filters,
      sourceType,
      destinationType,
      source,
      destination
    } = req.body;

    // Validate platform-specific requirements
    if (platform === 'twitter') {
      if (!twitterUsername) {
        return res.status(400).json({ message: 'Twitter username is required' });
      }
    }

    const route = new Route({
      principal,
      name,
      platform,
      sourceId,
      openchatApiKey,
      sourceType: platform,
      destinationType: 'openchat',
      source: {
        chatId: sourceId,
        username: platform === 'telegram' ? telegramUsername : 
                 platform === 'discord' ? discordUsername : 
                 twitterUsername
      },
      destination: {
        chatId: openchatApiKey
      },
      ...(platform === 'twitter' && {
        twitterUsername,
        includeRetweets: includeRetweets || false,
        includeReplies: includeReplies || false,
      }),
      ...(platform === 'telegram' && {
        telegramUsername,
      }),
      ...(platform === 'discord' && {
        discordUsername,
      }),
      filters: filters || {
        includeText: true,
        includeImages: true,
        includeLinks: true,
        keywords: []
      }
    });

    await route.save();
    res.status(201).json(route);
  } catch (error) {
    console.error('Error creating route:', error);
    res.status(500).json({ message: 'Error creating route', error: error.message });
  }
};

const getRoutes = async (req, res) => {
  try {
    const { principal } = req.query;
    
    if (!principal) {
      return res.status(400).json({ message: 'Principal is required' });
    }
    
    const routes = await Route.find({ principal });
    res.json(routes);
  } catch (error) {
    console.error('Error getting routes:', error);
    res.status(500).json({ message: error.message });
  }
};

const updateRoute = async (req, res) => {
  try {
    const {
      principal,
      name,
      platform,
      sourceId,
      openchatApiKey,
      twitterUsername,
      telegramUsername,
      discordUsername,
      includeRetweets,
      includeReplies,
      filters
    } = req.body;

    // Validate Twitter-specific fields
    if (platform === 'twitter') {
      if (!twitterUsername) {
        return res.status(400).json({ message: 'Twitter username is required' });
      }
    }

    const route = await Route.findByIdAndUpdate(
      req.params.id,
      {
        principal,
        name,
        platform,
        sourceId,
        openchatApiKey,
        // Add Twitter-specific fields if platform is Twitter
        ...(platform === 'twitter' && {
          twitterUsername,
          includeRetweets,
          includeReplies,
          monitoringInterval: 1 // Fixed 1-minute interval
        }),
        filters
      },
      { new: true }
    );

    if (!route) {
      return res.status(404).json({ message: 'Route not found' });
    }

    res.json(route);
  } catch (error) {
    console.error('Error updating route:', error);
    res.status(500).json({ message: 'Error updating route' });
  }
};

const deleteRoute = async (req, res) => {
  try {
    const route = await Route.findById(req.params.id);
    if (!route) {
      return res.status(404).json({ message: 'Route not found' });
    }

    // Check ownership
    if (route.principal !== req.body.principal) {
      return res.status(403).json({ message: 'Not authorized to delete this route' });
    }

    await route.deleteOne();
    res.json({ message: 'Route deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createRoute,
  getRoutes,
  updateRoute,
  deleteRoute
}; 