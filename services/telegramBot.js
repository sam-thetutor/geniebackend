const TelegramBot = require('node-telegram-bot-api');
const Route = require('../models/Route');
const { BotClientFactory } = require('@open-ic/openchat-botclient-ts');

class TelegramBotService {
  constructor() {
    this.bot = null;
  }

  async start() {
    if (this.bot) return;

    try {
      this.bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { 
        polling: true,
        webHook: false,
        onlyFirstMatch: false
      });
      console.log('Telegram bot started');

      const botInfo = await this.bot.getMe();
      this.botId = botInfo.id;

      this.bot.on('new_chat_members', async (msg) => {
        console.log("bot is added to the group")
        try {
          const newMembers = msg.new_chat_members;
          if (newMembers.some(member => member.id === this.botId)) {
            console.log(`Bot was added to group: ${msg.chat.title} (${msg.chat.id})`);
            await this.handleBotAddedToGroup(msg.chat);
          }
        } catch (error) {
          console.error('Error handling bot addition to group:', error);
        }
      });


      this.bot.on('message', async (msg) => {
        try {
          console.log('New message received:', msg);
          
          if (['group', 'supergroup', 'channel'].includes(msg.chat.type)) {
            await this.handleMessage(msg);
          }
        } catch (error) {
          console.error('Error handling Telegram message:', error);
        }
      });

      this.bot.on('error', (error) => {
        console.error('Telegram bot error:', error);
      });

      this.bot.on('polling_error', (error) => {
        console.error('Telegram bot polling error:', error);
      });
    } catch (error) {
      console.error('Failed to start Telegram bot:', error);
    }
  }

  async handleBotAddedToGroup(chat) {
    try {
      const botMember = await this.bot.getChatMember(chat.id, this.botId);
      const isAdmin = ['administrator', 'creator'].includes(botMember.status);
      
      await this.bot.sendMessage(chat.id, 
        `Hello! I've been added to ${chat.title}.\n` +
        `Group ID: ${chat.id}\n` +
        `Bot admin status: ${isAdmin ? '✅' : '❌'}\n\n` +
        (isAdmin ? 
          'I am an admin and can monitor messages.' : 
          'Please make me an admin so I can monitor messages.')
      );
    } catch (error) {
      console.error('Error sending welcome message:', error);
    }
  }

  async handleMessage(msg) {
    try {
      console.log("handleMessage")
      // Find routes that match this chat
      const routes = await Route.find({ 
        sourceType: 'telegram',
        'source.chatId': msg.chat.id.toString(),
        active: true 
      });
      console.log("routes",routes)

      for (const route of routes) {
        // Skip if username filter is set and doesn't match
        if (route.source.username && msg.from.username != route.source.username) {
          continue;
        }

        // Process the message
        const content = msg.text || msg.caption || '';
        const media = msg.photo ? msg.photo[msg.photo.length - 1] : null;

        // Forward to destinations...
        await this.forwardToOpenChat(msg, route);
        // Your existing forwarding logic here
      }
    } catch (error) {
      console.error('Error handling Telegram message:', error);
    }
  }

  async forwardToOpenChat(msg, route) {

    const factory = new BotClientFactory({
      openchatPublicKey: process.env.OC_PUBLIC,
      icHost: process.env.IC_HOST,
      openStorageCanisterId: process.env.STORAGE_INDEX_CANISTER,
      identityPrivateKey: process.env.IDENTITY_PRIVATE,
    })


    const client = factory.createClientFromApiKey(route.openchatApiKey);

    let content = '';
    if (msg.text) {
      content = msg.text;
    } else if (msg.caption) {
      content = msg.caption;
    }

    if (!content) {
      console.log('Skipping message without text content');
      return;
    }

    if (route.filters) {
      if (!route.filters.includeLinks && content.includes('http')) {
        return;
      }
      if (route.filters.keywords && route.filters.keywords.length > 0) {
        const hasKeyword = route.filters.keywords.some(keyword => 
          content.toLowerCase().includes(keyword.toLowerCase())
        );
        if (!hasKeyword) {
          return;
        }
      }
    }

    const message = await client.createTextMessage(content);
    await client.sendMessage(message);
  }

  stop() {
    if (this.bot) {
      this.bot.stopPolling();
      this.bot = null;
      console.log('Telegram bot stopped');
    }
  }


}

module.exports = new TelegramBotService(); 