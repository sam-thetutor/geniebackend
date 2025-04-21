const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const contentScheduler = require('./services/contentScheduler');
const telegramBot = require('./services/telegramBot');
const discordBot = require('./services/discordBot');
const twitterBot = require('./services/twitterBot');
const { Permissions } = require('@open-ic/openchat-botclient-ts');


const app = express();

// Connect to database
connectDB();

// Start content scheduler
contentScheduler.start();

// Middleware
app.use(cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type'],
  credentials: true
}));


const emptyPermissions = {
  message: [],
  community: [],
  chat: [],
};

let schema =  {
  autonomous_config: {
    sync_api_key: true,
    permissions: Permissions.encodePermissions({
      message: ["Text", "Image", "P2pSwap", "VideoCall"],
      community: [
        "RemoveMembers",
        "ChangeRoles",
        "CreatePublicChannel",
        "CreatePrivateChannel",
        "CreateChannel",
        "DeleteChannel",
      ],
      chat: ["ReadMessages"],
    }),
  },
  description:
    "This is a demonstration bot which demonstrates a variety of different approaches and techniques that bot developers can use.",
  commands: [
    {
      name: "newsAnchors",
      default_role: "Owner",
      description: "Start pinging this context",
      permissions: Permissions.encodePermissions({
        ...emptyPermissions,
        message: ["Text"],
      }),
      params: [],
    }
  ],
}


app.use(helmet());
app.use(express.json());


// Routes
app.use('/api/campaigns', require('./routes/campaignRoutes'));
app.use('/api/contents', require('./routes/contentRoutes'));
app.use('/api', require('./routes/aiRoutes'));
 
app.use('/api/routes', require('./routes/routeRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/ai-chat', require('./routes/aiChatRoutes'));

app.use('/', (req, res)=>{
  res.status(200).json(schema);
 });
// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handling
app.use(errorHandler);

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  contentScheduler.stop();
  telegramBot.stop();
  discordBot.stop();
  twitterBot.stop();
  process.exit(0);
});


process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  contentScheduler.stop();
  process.exit(0);
});

 telegramBot.start();
//discordBot.start();
// twitterBot.start();
const PORT = process.env.PORT || 6000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
