const { BotClientFactory } = require('@open-ic/openchat-botclient-ts');
const Content = require('../models/Content');
const Encryption = require('../utils/encryption');
const Campaign = require('../models/Campaign');


const factory = new BotClientFactory({
  openchatPublicKey: process.env.OC_PUBLIC,
  icHost: process.env.IC_HOST,
  openStorageCanisterId: process.env.STORAGE_INDEX_CANISTER,
  identityPrivateKey: process.env.IDENTITY_PRIVATE,
});


class ContentScheduler {
  constructor() {
    this.isRunning = false;
    this.checkInterval = 1 * 60 * 1000; // Check every minute
  }

  async start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('Content scheduler started');
    
    this.intervalId = setInterval(async () => {
      try {
        await this.checkAndPostContent();
      } catch (error) {
        console.error('Error in content scheduler:', error);
      }
    }, this.checkInterval);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.isRunning = false;
      console.log('Content scheduler stopped');
    }
  }

  async checkAndPostContent() {
    const now = new Date();
    console.log('Checking for content to post at:', now.toISOString());

    try {
      // Find all pending content that should be posted
      const contentToPost = await Content.find({
        status: 'pending',
        scheduledTime: { $lte: now }
      }).populate({
        path: 'campaignId',
        select: 'name apiKey status'
      });

      // Process each content item independently
      for (const content of contentToPost) {
        try {
          // Check if campaign exists and is active
          if (!content.campaignId) {
            console.error(`Campaign not found for content ${content._id}`);
            await this.updateContentStatus(content, 'failed', 'Campaign not found');
            continue;
          }
          
          if (content.campaignId.status !== 'active') {
            console.log(`Skipping content ${content._id} - campaign ${content.campaignId.name} is not active`);
            continue;
          }

          // Attempt to post content
          await this.postToOpenChat(content);
          await this.updateContentStatus(content, 'posted');
          console.log(`Posted content ${content._id} successfully`);

        } catch (error) {
          // Handle specific OpenChat errors
          let errorMessage = 'Unknown error occurred';
          if (error.response) {
            // OpenChat API error response
            errorMessage = `OpenChat API Error: ${error.response.data?.message || error.message}`;
          } else if (error.request) {
            // Network error
            errorMessage = 'Network error - Failed to reach OpenChat API';
          } else {
            // Other errors
            errorMessage = error.message;
          }

          console.error(`Failed to post content ${content._id}:`, errorMessage);
          await this.updateContentStatus(content, 'failed', errorMessage);

          // Implement retry logic if needed
          if (content.attempts < 3) {
            await this.scheduleRetry(content);
          }
        }
      }
    } catch (error) {
      console.error('Error in content scheduler:', error);
      // The scheduler will continue running despite errors
    }
  }

  // Helper method to update content status
  async updateContentStatus(content, status, errorMessage = null) {
    try {
      content.status = status;
      content.lastAttempt = new Date();
      content.attempts += 1;
      if (errorMessage) {
        content.lastError = errorMessage;
      }
      await content.save();
    } catch (error) {
      console.error(`Failed to update content ${content._id} status:`, error);
    }
  }
  
  // Helper method to schedule content retry
  async scheduleRetry(content) {
    try {
      const retryDelay = Math.pow(2, content.attempts) * 60000; // Exponential backoff
      const newScheduledTime = new Date(Date.now() + retryDelay);
      
      content.scheduledTime = newScheduledTime;
      content.status = 'pending';
      await content.save();
      
      console.log(`Scheduled retry for content ${content._id} at ${newScheduledTime.toISOString()}`);
    } catch (error) {
      console.error(`Failed to schedule retry for content ${content._id}:`, error);
    }
  }

  async postToOpenChat(content) {
    return new Promise(async (resolve, reject) => {
      try {
//fetch the campagin in order to get the apiKey
        const campaign = await Campaign.findById(content.campaignId);
        //decrypt the apikey
        const decryptedApiKey = await Encryption.decrypt(content.campaignId.apiKey);

        // Create the OpenChat context object
        let client = factory.createClientFromApiKey(decryptedApiKey);
        let resz = await client.createTextMessage(content.content);
                
        await client.sendMessage(resz)
          .then(() => {
            console.log(`Successfully sent message to OpenChat for content ${content._id}`);
            resolve();
          })
          .catch((err) => {
            console.error("sendMessage failed with:", err);
            reject(err);
          });
      } catch (error) {
        console.error("Error in postToOpenChat:", error);
        reject(error);
      }
    });
  }
}

module.exports = new ContentScheduler(); 



// The RouteList component
// Backend routes and controllers
// Telegram bot integration
// Database hook updates