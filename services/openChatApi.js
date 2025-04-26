const { BotClientFactory } = require('@open-ic/openchat-botclient-ts');

class OpenChatService {
  constructor() {}

  async sendMessage(apiKey, content) {
    try {
      const factory = new BotClientFactory({
        openchatPublicKey: process.env.OC_PUBLIC,
        icHost: process.env.IC_HOST,
        openStorageCanisterId: process.env.STORAGE_INDEX_CANISTER,
        identityPrivateKey: process.env.IDENTITY_PRIVATE,
      });
      const client = factory.createClientFromApiKey(apiKey);

      const message = await client.createTextMessage(content);
      let response = await client.sendMessage(message);
    } catch (error) {
      console.error('OpenChat API error:', error);
      throw new Error(`OpenChat API error: ${error.message}`);
    }
  }
}

module.exports = new OpenChatService(); 