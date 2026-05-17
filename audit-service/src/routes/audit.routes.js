const { Router } = require('express');
const { createAuthenticateMiddleware } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/rbac.middleware');
const { createInternalApiMiddleware } = require('../middleware/internalApi.middleware');
const {
  handleValidationErrors,
  createLogValidators,
  listQueryValidators,
  logIdParam,
} = require('../validators/audit.validators');
const { createAuditService } = require('../services/audit.service');
const { createAuditController } = require('../controllers/audit.controller');

function createAuditRoutes(config) {
  const router = Router();
  const authenticate = createAuthenticateMiddleware(config);
  const internalApi = createInternalApiMiddleware(config);
  const auditService = createAuditService(config);
  const controller = createAuditController(auditService);

  router.post(
    '/log',
    internalApi,
    createLogValidators,
    handleValidationErrors,
    controller.createLog,
  );

  router.get(
    '/logs/stats',
    authenticate,
    requireAdmin(),
    listQueryValidators,
    handleValidationErrors,
    controller.stats,
  );

  router.get(
    '/logs/:id',
    authenticate,
    requireAdmin(),
    logIdParam,
    handleValidationErrors,
    controller.getById,
  );

  router.get(
    '/logs',
    authenticate,
    requireAdmin(),
    listQueryValidators,
    handleValidationErrors,
    controller.list,
  );

  return router;
}

module.exports = { createAuditRoutes };
