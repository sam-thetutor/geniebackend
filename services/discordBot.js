const { Client, GatewayIntentBits, Events } = require('discord.js');
const Route = require('../models/Route');
const openChatService = require('./openChatApi');
const MessageFormatter = require('./messageFormatter');
const patternAnalyzer = require('./patternAnalyzer');

class DiscordBotService {
  constructor() {
    this.client = null;
    this.openChat = openChatService;
    this.messageQueue = [];
    this.isProcessing = false;
  }

  async start() {
    if (this.client) return;

    try {
      this.client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.MessageContent,
          GatewayIntentBits.DirectMessages,
          GatewayIntentBits.GuildMessageReactions,
          GatewayIntentBits.GuildEmojisAndStickers
        ]
      });

      // Start message queue processor
      this.startQueueProcessor();

      // Log when bot is ready
      this.client.once(Events.ClientReady, (client) => {
        console.log(`Discord bot logged in as ${client.user.tag}`);
      });

      // Handle incoming messages
      this.client.on(Events.MessageCreate, async (message) => {
        try {
          // Ignore bot messages
          if (message.author.bot) return;
          
          console.log('New Discord message:', {
            channelId: message.channelId,
            channelName: message.channel.name,
            guildName: message.guild?.name,
            content: message.content,
            author: message.author.username
          });

          await this.handleMessage(message);
        } catch (error) {
          console.error('Error handling Discord message:', error);
        }
      });

      // Handle message edits
      this.client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
        try {
          if (newMessage.author.bot) return;
          
          const routes = await Route.find({
            platform: 'discord',
            sourceId: newMessage.channelId,
            status: 'active'
          });
          
          if (routes.length === 0) return;
          
          const content = MessageFormatter.formatDiscordMessage(newMessage);
          content = `[EDITED]\n${content}`;
          
          for (const route of routes) {
            this.queueMessage(route, content);
          }
        } catch (error) {
          console.error('Error handling edited message:', error);
        }
      });

      // Handle message deletions
      this.client.on(Events.MessageDelete, async (message) => {
        try {
          if (message.author.bot) return;
          
          const routes = await Route.find({
            platform: 'discord',
            sourceId: message.channelId,
            status: 'active'
          });
          
          if (routes.length === 0) return;
          
          const content = `[DELETED] Message from ${message.author.username} was deleted`;
          
          for (const route of routes) {
            this.queueMessage(route, content);
          }
        } catch (error) {
          console.error('Error handling deleted message:', error);
        }
      });

      // Login
      await this.client.login(process.env.DISCORD_BOT_TOKEN);
      console.log('Discord bot started');
    } catch (error) {
      console.error('Failed to start Discord bot:', error);
    }
  }

  // Message queue processor
  async startQueueProcessor() {
    setInterval(async () => {
      if (this.isProcessing || this.messageQueue.length === 0) return;
      
      this.isProcessing = true;
      try {
        const { route, content } = this.messageQueue.shift();
        await this.openChat.sendMessage(route.openchatApiKey, route.openchatGroupId, content);
      } catch (error) {
        console.error('Error processing message queue:', error);
      } finally {
        this.isProcessing = false;
      }
    }, 1000); // Process one message per second
  }

  queueMessage(route, content) {
    this.messageQueue.push({ route, content });
    console.log(`Queued message for route ${route._id}. Queue length: ${this.messageQueue.length}`);
  }

  async handleMessage(message) {
    // Analyze message patterns
    await patternAnalyzer.analyzeMessage(message, 'discord');

    const routes = await Route.find({
      platform: 'discord',
      sourceId: message.channelId,
      status: 'active'
    });

    if (routes.length === 0) return;

    const content = MessageFormatter.formatDiscordMessage(message);

    for (const route of routes) {
      try {
        this.queueMessage(route, content);
        
        route.lastSync = new Date();
        route.lastError = null;
        route.errorCount = 0;
        await route.save();
      } catch (error) {
        console.error(`Failed to queue Discord message for route ${route._id}:`, error);
        route.lastError = error.message;
        route.errorCount += 1;
        await route.save();
      }
    }
  }

  stop() {
    if (this.client) {
      this.client.destroy();
      this.client = null;
      clearInterval(this.queueProcessor);
      console.log('Discord bot stopped');
    }
  }
}

module.exports = new DiscordBotService(); 