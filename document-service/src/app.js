const express = require('express');
const { createDocumentRoutes } = require('./routes/document.routes');
const { errorMiddleware } = require('./middleware/error.middleware');

function createApp(config) {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '512kb' }));

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'document-service' });
  });

  app.use('/api/documents', createDocumentRoutes(config));

  app.get('/', (req, res) => {
    res.json({
      service: 'document-service',
      status: 'running',
      api: '/api/documents',
    });
  });

  app.use((req, res) => {
    res.status(404).json({ error: { message: 'Not found' } });
  });

  app.use(errorMiddleware);

  return app;
}

module.exports = { createApp };
