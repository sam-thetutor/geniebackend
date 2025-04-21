const PostingPattern = require('../models/PostingPattern');
const natural = require('natural');
const tokenizer = new natural.WordTokenizer();
const TfIdf = natural.TfIdf;
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

class ContentAnalyzer {
  async analyzeScheduledContent(content, userId) {
    try {
      let pattern = await PostingPattern.findOne({
        userId,
        platform: 'scheduled'
      });

      if (!pattern) {
        pattern = new PostingPattern({
          userId,
          platform: 'scheduled',
          channelId: 'scheduled',
          patterns: {
            averageLength: 0,
            commonPhrases: [],
            emojiUsage: new Map(),
            hashtagUsage: [],
            formality: 'neutral',
            topics: [],
            mediaUsage: { images: 0, videos: 0, links: 0 },
            sentiment: {
              positive: 0,
              neutral: 0,
              negative: 0
            },
            keyPhrases: [],
            contentCategories: [],
            toneAttributes: {
              professional: 0,
              casual: 0,
              humorous: 0,
              serious: 0,
              persuasive: 0
            },
            callToAction: {
              hasCtA: false,
              types: []
            }
          }
        });
      }

      await this.updateContentPatterns(pattern, content);
      await this.analyzeSentiment(pattern, content);
      await this.extractKeyPhrases(pattern, content);
      await this.categorizeContent(pattern, content);
      await this.analyzeTone(pattern, content);
      await this.detectCallToAction(pattern, content);

      pattern.sampleSize += 1;
      await pattern.save();

      return pattern;
    } catch (error) {
      console.error('Error analyzing scheduled content:', error);
    }
  }

  async analyzeSentiment(pattern, content) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{
          role: "system",
          content: "Analyze the sentiment of this text. Respond with only: POSITIVE, NEUTRAL, or NEGATIVE"
        }, {
          role: "user",
          content
        }],
      });

      const sentiment = response.choices[0].message.content.trim().toLowerCase();
      pattern.patterns.sentiment[sentiment]++;
    } catch (error) {
      console.error('Sentiment analysis error:', error);
    }
  }

  async extractKeyPhrases(pattern, content) {
    const tfidf = new TfIdf();
    tfidf.addDocument(content);
    
    const phrases = [];
    tfidf.listTerms(0).slice(0, 5).forEach(item => {
      phrases.push(item.term);
    });

    pattern.patterns.keyPhrases = [...new Set([
      ...pattern.patterns.keyPhrases,
      ...phrases
    ])].slice(0, 20);
  }

  async categorizeContent(pattern, content) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{
          role: "system",
          content: "Categorize this content into one or more categories: PROMOTIONAL, INFORMATIVE, ENTERTAINMENT, NEWS, ENGAGEMENT, ANNOUNCEMENT. Return categories as comma-separated list."
        }, {
          role: "user",
          content
        }],
      });

      const categories = response.choices[0].message.content.split(',').map(c => c.trim());
      pattern.patterns.contentCategories = [...new Set([
        ...pattern.patterns.contentCategories,
        ...categories
      ])];
    } catch (error) {
      console.error('Content categorization error:', error);
    }
  }

  async analyzeTone(pattern, content) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{
          role: "system",
          content: "Analyze the tone of this text. For each attribute (professional, casual, humorous, serious, persuasive), respond with a score from 0 to 1. Format: professional:0.8,casual:0.2,..."
        }, {
          role: "user",
          content
        }],
      });

      const toneScores = response.choices[0].message.content
        .split(',')
        .reduce((acc, curr) => {
          const [key, value] = curr.split(':');
          acc[key] = parseFloat(value);
          return acc;
        }, {});

      Object.keys(toneScores).forEach(key => {
        pattern.patterns.toneAttributes[key] = 
          (pattern.patterns.toneAttributes[key] * pattern.sampleSize + toneScores[key]) / 
          (pattern.sampleSize + 1);
      });
    } catch (error) {
      console.error('Tone analysis error:', error);
    }
  }

  detectCallToAction(pattern, content) {
    const ctaPatterns = [
      /click|tap|visit|check out|learn more|sign up|register|buy|shop|order/i,
      /call|contact|reach out|get in touch|dm|message/i,
      /follow|subscribe|like|share|comment|join/i
    ];

    const hasCtA = ctaPatterns.some(pattern => pattern.test(content));
    if (hasCtA) {
      pattern.patterns.callToAction.hasCtA = true;
      ctaPatterns.forEach((regex, index) => {
        if (regex.test(content)) {
          const ctaTypes = ['action', 'contact', 'social'];
          if (!pattern.patterns.callToAction.types.includes(ctaTypes[index])) {
            pattern.patterns.callToAction.types.push(ctaTypes[index]);
          }
        }
      });
    }
  }
}

module.exports = new ContentAnalyzer(); 