require('dotenv').config();

const express = require('express');
const createAuthRoutes = require('./routes/auth.routes');
const { errorMiddleware } = require('./middleware/error.middleware');

function createApp(config) {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '512kb' }));

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', createAuthRoutes(config));

  app.use((req, res) => {
    res.status(404).json({ error: { message: 'Not found' } });
  });

  app.use(errorMiddleware);

  return app;
}

module.exports = { createApp };
