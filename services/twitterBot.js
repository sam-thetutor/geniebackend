const { TwitterApi } = require('twitter-api-v2');
const Route = require('../models/Route');
const openChatService = require('./openChatApi');

class TwitterBotService {
  constructor() {
    this.client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
      accessToken: process.env.TWITTER_ACCESS_TOKEN,
      accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
    });
    this.checkInterval = null;
  }

  async start() {
    console.log('Starting Twitter monitoring service...');
    this.checkInterval = setInterval(this.checkTwitterFeeds.bind(this), 60 * 1000); // Check every minute
  }

  async stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      console.log('Twitter monitoring service stopped');
    }
  }

  async checkTwitterFeeds() {
    try {
      const routes = await Route.find({ 
        platform: 'twitter',
        status: 'active',
        twitterUsername: { $exists: true }
      });

      for (const route of routes) {
        await this.checkUserTimeline(route);
      }
    } catch (error) {
      console.error('Error checking Twitter feeds:', error);
    }
  }

  async checkUserTimeline(route) {
    try {
      const tweets = await this.client.v2.userByUsername("@"+route.twitterUsername);
      const timeline = await this.client.v2.userTimeline(tweets.data.id, {
        exclude: ['retweets', 'replies'],
        since_id: route.lastTweetId,
      });

      for await (const tweet of timeline) {
        await this.forwardToOpenChat(tweet, route);
        route.lastTweetId = tweet.id;
        await route.save();
      }

      route.lastCheck = new Date();
      route.errorCount = 0;
      await route.save();
    } catch (error) {
      console.error(`Error checking timeline for ${route.twitterUsername}:`, error);
      route.errorCount = (route.errorCount || 0) + 1;
      await route.save();
    }
  }

  async forwardToOpenChat(tweet, route) {
    const message = `🐦 New Tweet from @${route.twitterUsername}\n\n${tweet.text}\n\nPosted: ${tweet.created_at}`;
    await openChatService.sendMessage(route.channelId, message);
  }
}

module.exports = new TwitterBotService(); 