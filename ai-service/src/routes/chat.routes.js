const { Router } = require('express');
const { body, param } = require('express-validator');
const { createAuthenticateMiddleware } = require('../middleware/auth.middleware');
const { createChatService } = require('../services/chat.service');
const { createChatController } = require('../controllers/chat.controller');
const { createAuditClient } = require('../services/audit.client');

function createChatRouter(config, deps) {
  const router = Router();
  const { prisma, qdrant } = deps;
  const authenticate = createAuthenticateMiddleware(config);
  const audit = createAuditClient(config);
  const chatService = createChatService(prisma, qdrant, config);
  const ctrl = createChatController(config, { chatService, audit });

  const maxMsg = config.chatMaxMessageLength;

  const createSessionValidators = [
    body('title').optional({ checkFalsy: true }).isString().trim().isLength({ min: 1, max: 200 }),
  ];

  const sessionIdParam = param('id').isUUID().withMessage('Invalid session id');

  const postMessageValidators = [
    sessionIdParam,
    body('content')
      .isString()
      .trim()
      .isLength({ min: 1, max: maxMsg })
      .withMessage(`Message must be 1–${maxMsg} characters`),
    body('metadata').optional().isObject(),
  ];

  router.post(
    '/sessions',
    authenticate,
    createSessionValidators,
    ctrl.handleValidationErrors,
    ctrl.createSession,
  );

  router.get('/sessions', authenticate, ctrl.listSessions);

  router.get('/history', authenticate, ctrl.getHistory);

  router.delete('/history', authenticate, ctrl.clearHistory);

  router.get(
    '/admin/sessions',
    authenticate,
    ctrl.requireAdmin(),
    ctrl.listSessionsAdmin,
  );

  router.get(
    '/sessions/:id/messages',
    authenticate,
    sessionIdParam,
    ctrl.handleValidationErrors,
    ctrl.getMessages,
  );

  router.post(
    '/sessions/:id/messages',
    authenticate,
    postMessageValidators,
    ctrl.handleValidationErrors,
    ctrl.postMessage,
  );

  router.delete(
    '/sessions/:id',
    authenticate,
    sessionIdParam,
    ctrl.handleValidationErrors,
    ctrl.deleteSession,
  );

  return router;
}

module.exports = { createChatRouter };
