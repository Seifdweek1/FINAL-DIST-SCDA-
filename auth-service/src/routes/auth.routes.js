const { Router } = require('express');
const { createAuthController } = require('../controllers/auth.controller');
const { createOAuthController } = require('../controllers/oauth.controller');
const { registerValidators, loginValidators } = require('../validators/auth.validators');
const { handleValidationErrors } = require('../middleware/validate.middleware');
const { createAuthenticateMiddleware } = require('../middleware/auth.middleware');
const { createRequireAdminWithAudit } = require('../middleware/rbac.middleware');
const { createAuditClient } = require('../services/audit.client');

function createAuthRoutes(config) {
  const router = Router();
  const auditClient =
    config.auditServiceUrl && config.internalApiKey
      ? createAuditClient({
          auditServiceUrl: config.auditServiceUrl,
          internalApiKey: config.internalApiKey,
        })
      : null;
  const controller = createAuthController(config, auditClient);
  const oauthController = createOAuthController(config, auditClient);
  const authenticate = createAuthenticateMiddleware(config);
  const requireAdmin = createRequireAdminWithAudit(auditClient);

  router.get('/oauth/providers', oauthController.listProviders);

  router.get('/oauth/:provider', oauthController.start);
  router.get('/oauth/:provider/callback', oauthController.callback);

  router.post(
    '/register',
    registerValidators,
    handleValidationErrors,
    controller.register,
  );

  router.post('/login', loginValidators, handleValidationErrors, controller.login);

  router.get('/profile', authenticate, controller.profile);

  router.get('/admin', authenticate, requireAdmin, controller.admin);

  return router;
}

module.exports = createAuthRoutes;
