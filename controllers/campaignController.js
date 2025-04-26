const Campaign = require('../models/Campaign');
const { validationResult } = require('express-validator');
const Encryption = require('../utils/encryption');

exports.createCampaign = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, apiKey, schedule, principal, startDate, endDate } = req.body;

    if (!principal) {
      return res.status(400).json({ message: 'Principal is required' });
    }

    // Encrypt the API key
    const encryptedApiKey = await Encryption.encrypt(apiKey);

    const campaign = new Campaign({
      name,
      principal,
      apiKey: encryptedApiKey,
      schedule,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
      status: 'active'
    });

    await campaign.save();
    
    // Return the campaign without sensitive data
    const campaignResponse = campaign.toObject();
    delete campaignResponse.apiKey;

    res.status(201).json(campaignResponse);
  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.getCampaigns = async (req, res) => {
  try {
    const { principal } = req.query;
    
    if (!principal) {
      return res.status(400).json({ message: 'Principal is required' });
    }
    
    const campaigns = await Campaign.find({ principal });

    // Decrypt API keys if needed
    const decryptedCampaigns = await Promise.all(campaigns.map(async (campaign) => {
      const decryptedKeys = {};
      if (campaign.apiKeys && typeof campaign.apiKeys === 'object') {
        for (const [key, value] of Object.entries(campaign.apiKeys)) {
          if (value) {
            try {
              decryptedKeys[key] = await Encryption.decrypt(value);
            } catch (error) {
              console.error(`Error decrypting key ${key}:`, error);
              decryptedKeys[key] = null;
            }
          }
        }
      }
      return {
        ...campaign.toObject(),
        apiKeys: decryptedKeys
      };
    }));

    res.json(decryptedCampaigns);
  } catch (error) {
    console.error('Error getting campaigns:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.updateCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    const { apiKeys, ...otherUpdates } = req.body;

    // Encrypt new API keys if provided
    let updates = { ...otherUpdates };
    if (apiKeys && typeof apiKeys === 'object') {
      const encryptedKeys = {};
      for (const [key, value] of Object.entries(apiKeys)) {
        if (value) {
          encryptedKeys[key] = await Encryption.encrypt(value);
        }
      }
      updates.apiKeys = encryptedKeys;
    }

    Object.assign(campaign, updates);
    await campaign.save();

    // Decrypt API keys if needed
    const decryptedKeys = {};
    if (campaign.apiKeys && typeof campaign.apiKeys === 'object') {
      for (const [key, value] of Object.entries(campaign.apiKeys)) {
        if (value) {
          try {
            decryptedKeys[key] = await Encryption.decrypt(value);
          } catch (error) {
            console.error(`Error decrypting key ${key}:`, error);
            decryptedKeys[key] = null;
          }
        }
      }
    }

    // Create a new object with decrypted keys
    const campaignWithDecryptedKeys = {
      ...campaign.toObject(),
      apiKeys: decryptedKeys
    };

    res.json({ success: true, campaign: campaignWithDecryptedKeys });
  } catch (error) {
    console.error('Error updating campaign:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteCampaign = async (req, res) => {
  try {
    console.log('Delete request:', {
      campaignId: req.params.id,
      principal: req.body.principal
    });
    
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    // Check if user owns this campaign
    if (campaign.principal != req.body.principal) {
      console.log('Authorization failed:', {
        campaignPrincipal: campaign.principal,
        requestPrincipal: req.body.principal
      });
      return res.status(403).json({ message: 'Not authorized to delete this campaign' });
    }

    await campaign.deleteOne();
    console.log('Campaign successfully deleted');
    return res.status(200).json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    return res.status(500).json({ message: error.message });
  }
}; 