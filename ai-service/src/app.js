const express = require('express');
const { errorMiddleware } = require('./middleware/error.middleware');
const { createAiRouter } = require('./routes/ai.routes');
const { createChatRouter } = require('./routes/chat.routes');

function createApp(config, deps) {
  const { qdrant, prisma } = deps;
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'ai-service' });
  });

  app.use('/api/ai', createAiRouter(config, qdrant, prisma));

  app.get('/', (req, res) => {
    res.json({
      service: 'ai-service',
      status: 'running',
      api: '/api/ai',
    });
  });

  app.use((req, res) => {
    res.status(404).json({ error: { message: 'Not found' } });
  });

  app.use(errorMiddleware);

  return app;
}

module.exports = { createApp };
