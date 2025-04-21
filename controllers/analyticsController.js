const PostingPattern = require('../models/PostingPattern');
const OpenAI = require('openai');
const Campaign = require('../models/Campaign');
const Route = require('../models/Route');
const Content = require('../models/Content');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

exports.getUserPatterns = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('Fetching patterns for user:', userId);
    
    let pattern = await PostingPattern.findOne({
      userId,
      platform: 'scheduled'
    });

    // If no pattern exists, create a default one
    if (!pattern) {
      pattern = new PostingPattern({
        userId,
        platform: 'scheduled',
        channelId: 'scheduled',
        patterns: {
          sentiment: {
            positive: 0,
            neutral: 0,
            negative: 0
          },
          toneAttributes: {
            professional: 0,
            casual: 0,
            humorous: 0,
            serious: 0,
            persuasive: 0
          },
          contentCategories: [],
          keyPhrases: [],
          callToAction: {
            hasCtA: false,
            types: []
          }
        }
      });
      await pattern.save();
    }

    // Ensure all required properties exist with default values
    const patterns = pattern.patterns || {};
    const sentiment = patterns.sentiment || { positive: 0, neutral: 0, negative: 0 };
    const toneAttributes = patterns.toneAttributes || {
      professional: 0,
      casual: 0,
      humorous: 0,
      serious: 0,
      persuasive: 0
    };

    // Calculate success metrics
    const metrics = {
      sentiment: {
        positive: sentiment.positive,
        neutral: sentiment.neutral,
        negative: sentiment.negative
      },
      toneDistribution: toneAttributes,
      topCategories: patterns.contentCategories || [],
      popularPhrases: (patterns.keyPhrases || []).slice(0, 5),
      ctaEffectiveness: {
        hasCtA: patterns.callToAction?.hasCtA || false,
        types: patterns.callToAction?.types || []
      }
    };

    res.json(metrics);
  } catch (error) {
    console.error('Error fetching patterns:', error.message, error.stack);
    res.status(500).json({ message: 'Error fetching patterns' });
  }
};

exports.getContentRecommendations = async (req, res) => {
  try {
    const { userId } = req.params;
    let pattern = await PostingPattern.findOne({
      userId,
      platform: 'scheduled'
    });

    // If no pattern exists, return default recommendations
    if (!pattern) {
      return res.json({
        recommendations: [
          {
            title: "Getting Started",
            description: "Start building your content strategy",
            example: "Share your first post to begin analyzing patterns!"
          }
        ]
      });
    }

    // Ensure all required properties exist
    const patterns = pattern.patterns || {};
    const toneAttributes = patterns.toneAttributes || {};
    const toneEntries = Object.entries(toneAttributes);
    const mostSuccessfulTone = toneEntries.length > 0 
      ? toneEntries.sort((a, b) => b[1] - a[1])[0][0]
      : 'neutral';

    // Generate recommendations based on patterns
    const prompt = `Based on these content patterns:
      - Most successful tone: ${mostSuccessfulTone}
      - Top categories: ${(patterns.contentCategories || []).join(', ')}
      - Key phrases: ${(patterns.keyPhrases || []).slice(0, 5).join(', ')}
      - CTA types: ${(patterns.callToAction?.types || []).join(', ')}

      Generate exactly 3 content recommendations. Format your response as a strict JSON array with this structure:
      [
        {
          "title": "First Recommendation",
          "description": "Strategy description",
          "example": "Example content"
        }
      ]
      
      Keep titles under 30 characters, descriptions under 100 characters, and examples under 150 characters.
      Do not include any additional text or explanation outside the JSON structure.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are a JSON-only response bot. Only output valid JSON arrays containing recommendations." },
        { role: "user", content: prompt }
      ],
      temperature: 0.5
    });

    let recommendations;
    try {
      const content = completion.choices[0].message.content.trim();
      console.log('Raw AI response:', content);
      // Try to extract JSON if there's any surrounding text
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      const jsonContent = jsonMatch ? jsonMatch[0] : content;
      
      const parsedRecommendations = JSON.parse(jsonContent);
      
      // Validate that we got an array of recommendations
      if (!Array.isArray(parsedRecommendations)) {
        throw new Error('Invalid response structure');
      }
      
      recommendations = {
        recommendations: parsedRecommendations
      };

    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Return default recommendations if parsing fails
      recommendations = {
        recommendations: [
          {
            title: "Content Strategy Basics",
            description: "Focus on consistent, engaging content",
            example: "Share valuable insights about your industry regularly"
          },
          {
            title: "Engagement Tactics",
            description: "Use questions to spark discussions",
            example: "What's your biggest challenge with social media?"
          },
          {
            title: "Value-First Approach",
            description: "Share actionable tips and insights",
            example: "Here are 3 quick tips to improve your workflow..."
          }
        ]
      };
    }

    console.log('Generated recommendations:', recommendations);
    res.json(recommendations);
  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({ message: 'Error generating recommendations', error: error.message });
  }
};

exports.getDashboardMetrics = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Campaign Statistics
    const campaigns = await Campaign.find({ principal: userId });
    const activeCampaigns = campaigns.filter(c => c.status === 'active');
    const latestCampaign = await Campaign.findOne({ principal: userId })
      .sort({ createdAt: -1 });

    // Content Statistics
    const contents = await Content.find({ 
      campaignId: { $in: campaigns.map(c => c._id) }
    });
    const contentStats = contents.reduce((acc, content) => {
      acc[content.status] = (acc[content.status] || 0) + 1;
      return acc;
    }, {});

    // Integration Statistics
    const routes = await Route.find({ principal: userId });
    const routesByPlatform = routes.reduce((acc, route) => {
      acc[route.platform] = (acc[route.platform] || 0) + 1;
      return acc;
    }, {});

    // Time-Based Analytics
    const timeMetrics = {
      postingTrends: {
        lastWeek: contents.filter(c => 
          new Date(c.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        ).length,
        lastMonth: contents.filter(c => 
          new Date(c.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        ).length,
        byDayOfWeek: contents.reduce((acc, content) => {
          const day = new Date(content.scheduledTime).getDay();
          acc[day] = (acc[day] || 0) + 1;
          return acc;
        }, {})
      }
    };

    // Platform Engagement Metrics
    const engagementMetrics = {
      platformEngagement: {
        discord: {
          messagesSent: contents.filter(c => c.platform === 'discord' && c.status === 'posted').length,
          errorRate: contents.filter(c => c.platform === 'discord').length ? 
            (contents.filter(c => c.platform === 'discord' && c.status === 'failed').length / 
            contents.filter(c => c.platform === 'discord').length * 100).toFixed(1) : 0
        },
        telegram: {
          messagesSent: contents.filter(c => c.platform === 'telegram' && c.status === 'posted').length,
          errorRate: contents.filter(c => c.platform === 'telegram').length ?
            (contents.filter(c => c.platform === 'telegram' && c.status === 'failed').length /
            contents.filter(c => c.platform === 'telegram').length * 100).toFixed(1) : 0
        }
      }
    };

    // Campaign Performance
    const topCampaigns = await Campaign.aggregate([
      { $match: { principal: userId } },
      { $lookup: {
        from: 'contents',
        localField: '_id',
        foreignField: 'campaignId',
        as: 'posts'
      }},
      { $project: {
        name: 1,
        successRate: {
          $cond: [
            { $eq: [{ $size: '$posts' }, 0] },
            0,
            {
              $multiply: [
                {
                  $divide: [
                    { $size: { $filter: {
                      input: '$posts',
                      cond: { $eq: ['$$this.status', 'posted'] }
                    }}},
                    { $size: '$posts' }
                  ]
                },
                100
              ]
            }
          ]
        },
        totalPosts: { $size: '$posts' }
      }},
      { $sort: { successRate: -1 } },
      { $limit: 5 }
    ]);

    // System Health
    const systemHealth = {
      routeHealth: routes.map(route => ({
        platform: route.platform,
        status: route.status,
        lastSync: route.lastSync,
        errorCount: route.errorCount,
        uptime: route.lastSync ? 
          ((Date.now() - new Date(route.lastSync)) / (1000 * 60 * 60)).toFixed(1) : 0
      }))
    };

    const metrics = {
      campaigns: {
        total: campaigns.length,
        active: activeCampaigns.length,
        paused: campaigns.length - activeCampaigns.length,
        latest: latestCampaign ? {
          name: latestCampaign.name,
          createdAt: latestCampaign.createdAt
        } : null
      },
      content: {
        total: contents.length,
        byStatus: contentStats,
        averagePerCampaign: campaigns.length ? 
          (contents.length / campaigns.length).toFixed(1) : 0
      },
      integrations: {
        total: routes.length,
        byPlatform: routesByPlatform,
        activeCount: routes.filter(r => r.status === 'active').length,
        errorCount: routes.filter(r => r.errorCount > 0).length
      },
      performance: {
        successRate: contents.length ? 
          ((contents.filter(c => c.status === 'posted').length / contents.length) * 100).toFixed(1) : 0,
        errorRate: routes.length ?
          ((routes.filter(r => r.errorCount > 0).length / routes.length) * 100).toFixed(1) : 0
      },
      timeMetrics,
      engagementMetrics,
      campaignPerformance: { topCampaigns },
      systemHealth,
      twitter: {
        monitored: routes.filter(r => r.platform === 'twitter').length,
        activeMonitoring: routes.filter(r => r.platform === 'twitter' && r.status === 'active').length,
        totalTweets: contents.filter(c => c.platform === 'twitter').length,
        lastCheck: routes
          .filter(r => r.platform === 'twitter')
          .reduce((latest, route) => 
            !latest || (route.lastCheck && route.lastCheck > latest) ? route.lastCheck : latest
          , null)
      }
    };

    res.json(metrics);
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    res.status(500).json({ message: 'Error fetching dashboard metrics' });
  }
}; 