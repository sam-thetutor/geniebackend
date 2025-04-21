const OpenAI = require('openai');
const PostingPattern = require('../models/PostingPattern');
const contentAnalyzer = require('../services/contentAnalyzer');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

exports.generateContent = async (req, res) => {
  try {
    const { prompt, userId, platform, channelId } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ message: 'Prompt is required' });
    }

    // Get user's posting pattern
    const pattern = await PostingPattern.findOne({
      userId,
      platform,
      channelId
    });

    console.log("user posting and pattern found", pattern);

    // Build system message using learned patterns
    let systemMessage = "You are a content creator assistant.";
    if (pattern) {
      systemMessage += `\nMatch these patterns:
        - Writing style: ${pattern.patterns.formality}
        - Average length: ${Math.round(pattern.patterns.averageLength)} words
        - Emoji usage: ${pattern.patterns.emojiUsage.size > 0 ? 'Yes' : 'No'}
        - Hashtag usage: ${pattern.patterns.hashtagUsage.length > 0 ? 'Yes' : 'No'}
        - Common topics: ${pattern.patterns.topics.map(t => t.name).join(', ')}`;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: prompt }
      ],
    });

    const generatedContent = completion.choices[0].message.content.trim();
    res.json({ content: generatedContent });
  } catch (error) {
    console.error('OpenAI API Error:', error);
    res.status(500).json({ message: 'Failed to generate content' });
  }
};

exports.analyzeContent = async (req, res) => {
  try {
    const { content, userId } = req.body;

    if (!content) {
      return res.status(400).json({ message: 'Content is required' });
    }

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Analyze the content using contentAnalyzer service
    const pattern = await contentAnalyzer.analyzeScheduledContent(content, userId);

    // If no pattern was created/updated
    if (!pattern) {
      return res.status(500).json({ message: 'Failed to analyze content' });
    }

    // Return the updated pattern metrics
    const metrics = {
      sentiment: {
        positive: pattern.patterns.sentiment.positive,
        neutral: pattern.patterns.sentiment.neutral,
        negative: pattern.patterns.sentiment.negative
      },
      toneDistribution: pattern.patterns.toneAttributes,
      topCategories: pattern.patterns.contentCategories,
      popularPhrases: pattern.patterns.keyPhrases.slice(0, 5),
      ctaEffectiveness: {
        hasCtA: pattern.patterns.callToAction.hasCtA,
        types: pattern.patterns.callToAction.types
      }
    };

    res.json({ 
      message: 'Content analyzed successfully',
      metrics 
    });
  } catch (error) {
    console.error('Content analysis error:', error);
    res.status(500).json({ 
      message: 'Error analyzing content',
      error: error.message 
    });
  }
}; 


