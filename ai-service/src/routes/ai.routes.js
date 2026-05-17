const { Router } = require('express');
const { createAuthenticateMiddleware } = require('../middleware/auth.middleware');
const { createAiController } = require('../controllers/ai.controller');
const { createAuditClient } = require('../services/audit.client');
const { createChatRouter } = require('./chat.routes');

function createAiRouter(config, qdrant, prisma) {
  const router = Router();
  const audit = createAuditClient(config);
  const authenticate = createAuthenticateMiddleware(config);
  const ctrl = createAiController(config, { qdrant, audit });

  router.get('/health', ctrl.health);

  router.post(
    '/analyze',
    authenticate,
    ctrl.analyzeValidators,
    ctrl.handleValidationErrors,
    ctrl.analyze,
  );

  router.get(
    '/search/suggest',
    authenticate,
    ctrl.suggestValidators,
    ctrl.handleValidationErrors,
    ctrl.searchSuggest,
  );

  router.get(
    '/search',
    authenticate,
    ctrl.searchValidators,
    ctrl.handleValidationErrors,
    ctrl.search,
  );

  router.use('/chat', createChatRouter(config, { prisma, qdrant }));

  return router;
}

module.exports = { createAiRouter };
