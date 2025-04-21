const PostingPattern = require('../models/PostingPattern');
const natural = require('natural');
const tokenizer = new natural.WordTokenizer();

class PatternAnalyzer {
  async analyzeMessage(message, platform) {
    try {
      const userId = message.author?.id || message.from?.id;
      const channelId = message.channelId || message.chat.id;
      
      let pattern = await PostingPattern.findOne({
        userId,
        platform,
        channelId
      });

      if (!pattern) {
        pattern = new PostingPattern({
          userId,
          platform,
          channelId,
          patterns: {
            averageLength: 0,
            commonPhrases: [],
            emojiUsage: new Map(),
            hashtagUsage: [],
            formality: 'neutral',
            postingTimes: [],
            postFrequency: { daily: 0, weekly: 0 },
            topics: [],
            mediaUsage: { images: 0, videos: 0, links: 0 }
          }
        });
      }

      // Update patterns
      await this.updateMessagePatterns(pattern, message);
      await this.updateTimingPatterns(pattern, message);
      await this.updateContentPatterns(pattern, message);

      pattern.sampleSize += 1;
      pattern.lastAnalyzed = new Date();
      await pattern.save();

    } catch (error) {
      console.error('Error analyzing message pattern:', error);
    }
  }

  async updateMessagePatterns(pattern, message) {
    const content = message.content || message.text;
    const words = tokenizer.tokenize(content);

    // Update average length
    pattern.patterns.averageLength = 
      (pattern.patterns.averageLength * pattern.sampleSize + words.length) / 
      (pattern.sampleSize + 1);

    // Update emoji usage
    const emojis = content.match(/[\p{Emoji}]/gu) || [];
    emojis.forEach(emoji => {
      const count = pattern.patterns.emojiUsage.get(emoji) || 0;
      pattern.patterns.emojiUsage.set(emoji, count + 1);
    });

    // Update hashtag usage
    const hashtags = content.match(/#[\w-]+/g) || [];
    pattern.patterns.hashtagUsage = [...new Set([
      ...pattern.patterns.hashtagUsage,
      ...hashtags
    ])];

    // Analyze formality
    const formalityScore = this.analyzeFormalityScore(content);
    pattern.patterns.formality = this.getFormalityLevel(formalityScore);
  }

  async updateTimingPatterns(pattern, message) {
    const timestamp = message.createdAt || message.date;
    const date = new Date(timestamp);
    const hour = date.getHours();
    const dayOfWeek = date.getDay();

    // Update posting times
    let timeSlot = pattern.patterns.postingTimes.find(
      t => t.hour === hour && t.dayOfWeek === dayOfWeek
    );

    if (!timeSlot) {
      pattern.patterns.postingTimes.push({
        hour,
        dayOfWeek,
        frequency: 1
      });
    } else {
      timeSlot.frequency += 1;
    }

    // Update posting frequency
    pattern.patterns.postFrequency.daily = 
      pattern.sampleSize / (
        (Date.now() - pattern.createdAt) / (24 * 60 * 60 * 1000)
      );
  }

  async updateContentPatterns(pattern, message) {
    // Update media usage
    if (message.attachments?.size > 0 || message.photo) {
      pattern.patterns.mediaUsage.images += 1;
    }
    if (message.video) {
      pattern.patterns.mediaUsage.videos += 1;
    }
    if (message.content?.includes('http') || message.text?.includes('http')) {
      pattern.patterns.mediaUsage.links += 1;
    }

    // Topic analysis would require more sophisticated NLP
    // Consider using OpenAI API for topic extraction
  }

  analyzeFormalityScore(text) {
    // Simple formality analysis
    const formalIndicators = [
      'please', 'thank you', 'sincerely', 'regards',
      'would', 'could', 'may', 'shall'
    ];
    const casualIndicators = [
      'hey', 'lol', 'omg', 'gonna', 'wanna',
      'yeah', 'nah', 'cool'
    ];

    let score = 0;
    const words = text.toLowerCase().split(' ');

    words.forEach(word => {
      if (formalIndicators.includes(word)) score += 1;
      if (casualIndicators.includes(word)) score -= 1;
    });

    return score;
  }

  getFormalityLevel(score) {
    if (score > 2) return 'formal';
    if (score < -2) return 'casual';
    return 'neutral';
  }
}

module.exports = new PatternAnalyzer(); 