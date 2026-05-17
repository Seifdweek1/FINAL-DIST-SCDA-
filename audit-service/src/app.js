const express = require('express');
const { createAuditRoutes } = require('./routes/audit.routes');
const { errorMiddleware } = require('./middleware/error.middleware');

function createApp(config) {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '512kb' }));

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'audit-service' });
  });

  app.use('/api/audit', createAuditRoutes(config));

  app.get('/', (req, res) => {
    res.json({ service: 'audit-service', status: 'running', api: '/api/audit' });
  });

  app.use((req, res) => {
    res.status(404).json({ error: { message: 'Not found' } });
  });

  app.use(errorMiddleware);

  return app;
}

module.exports = { createApp };
