class MessageFormatter {
  static formatDiscordMessage(message, includeMetadata = true) {
    let content = '';

    // Add metadata header if requested
    if (includeMetadata) {
      content += `[Discord | ${message.guild.name} | #${message.channel.name}]\n`;
      content += `${message.author.username}: `;
    }

    // Add main message content
    content += message.content;

    // Handle attachments
    if (message.attachments.size > 0) {
      content += '\n\nAttachments:\n';
      message.attachments.forEach(attachment => {
        content += `📎 ${attachment.url}\n`;
      });
    }

    // Handle embeds
    if (message.embeds.length > 0) {
      content += '\nEmbeds:\n';
      message.embeds.forEach(embed => {
        if (embed.title) content += `📌 ${embed.title}\n`;
        if (embed.description) content += `${embed.description}\n`;
        if (embed.url) content += `🔗 ${embed.url}\n`;
        if (embed.image) content += `🖼️ ${embed.image.url}\n`;
      });
    }

    // Handle stickers
    if (message.stickers.size > 0) {
      content += '\nStickers:\n';
      message.stickers.forEach(sticker => {
        content += `🏷️ ${sticker.name}\n`;
      });
    }

    return content.trim();
  }

  static formatTelegramMessage(message) {
    let content = '';
    
    // Add metadata header
    content += `[Telegram | ${message.chat.title}]\n`;
    content += `${message.from.username || message.from.first_name}: `;

    // Add main message content
    if (message.text) {
      content += message.text;
    }

    // Handle media captions
    if (message.caption) {
      content += message.caption;
    }

    // Handle different types of media
    if (message.photo) {
      content += '\n📷 Photo attached';
    }
    if (message.video) {
      content += '\n🎥 Video attached';
    }
    if (message.document) {
      content += `\n📄 Document: ${message.document.file_name}`;
    }
    if (message.sticker) {
      content += `\n🏷️ Sticker: ${message.sticker.emoji || message.sticker.set_name}`;
    }

    return content.trim();
  }
}

module.exports = MessageFormatter; 