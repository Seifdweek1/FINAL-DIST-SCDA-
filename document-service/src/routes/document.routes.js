const { Router } = require('express');
const { createAuthenticateMiddleware } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/rbac.middleware');
const { createUploadMiddleware, handleUploadErrors } = require('../middleware/upload.middleware');
const { handleValidationErrors } = require('../middleware/validate.middleware');
const { documentIdParam } = require('../validators/document.validators');
const { createAuditService } = require('../services/audit.service');
const { createRabbitPublisher } = require('../services/rabbitmq.service');
const { createAuditClient } = require('../services/audit.client');
const { createDocumentService } = require('../services/document.service');
const { createDocumentController } = require('../controllers/document.controller');

function createDocumentRoutes(config) {
  const router = Router();
  const authenticate = createAuthenticateMiddleware(config);

  const centralAudit =
    config.auditServiceUrl && config.internalApiKey
      ? createAuditClient({
          auditServiceUrl: config.auditServiceUrl,
          internalApiKey: config.internalApiKey,
        })
      : null;
  const audit = createAuditService(config, centralAudit);
  const rabbit = createRabbitPublisher(config);
  const documentService = createDocumentService({
    uploadDir: config.uploadDir,
    encryptionKey: config.encryptionKey,
    audit,
    rabbit,
    allowedMimeTypes: config.allowedMimeTypes,
    allowedExtensions: config.allowedExtensions,
  });
  const upload = createUploadMiddleware(config);
  const controller = createDocumentController(documentService);

  router.get('/me', authenticate, (req, res) => {
    res.status(200).json({
      service: 'document-service',
      user: req.user,
    });
  });

  router.get('/admin/ping', authenticate, requireAdmin(), (req, res) => {
    res.status(200).json({
      message: 'document admin ping',
      user: req.user,
    });
  });

  router.post(
    '/upload',
    authenticate,
    upload.single('file'),
    handleUploadErrors,
    controller.upload,
  );

  router.get('/', authenticate, controller.list);

  router.get(
    '/:id/verify',
    authenticate,
    documentIdParam,
    handleValidationErrors,
    controller.verify,
  );

  router.get(
    '/:id/download',
    authenticate,
    documentIdParam,
    handleValidationErrors,
    controller.download,
  );

  router.get(
    '/:id',
    authenticate,
    documentIdParam,
    handleValidationErrors,
    controller.getById,
  );

  router.delete(
    '/:id',
    authenticate,
    documentIdParam,
    handleValidationErrors,
    controller.deleteById,
  );

  return router;
}

module.exports = { createDocumentRoutes };
