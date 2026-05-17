const { AppError } = require('../errors/AppError');
const { safeAudit } = require('../services/audit.client');
const { clientIp } = require('../utils/request.util');

function requireRoles(...allowedRoles) {
  const set = new Set(allowedRoles);
  return function requireRoleMiddleware(req, res, next) {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }
      if (!set.has(req.user.role)) {
        throw new AppError('Forbidden', 403);
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

function requireAdmin() {
  return requireRoles('admin');
}

/** Admin-only route with optional central audit when a non-admin user hits an admin path. */
function createRequireAdminWithAudit(auditClient) {
  return function requireAdminWithAudit(req, res, next) {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }
      if (req.user.role !== 'admin') {
        void safeAudit(auditClient, {
          service: 'auth-service',
          action: 'auth.admin.access_denied',
          status: 'forbidden',
          user_id: req.user.id,
          ip_address: clientIp(req),
          details: { route: req.originalUrl || req.url },
        });
        throw new AppError('Forbidden', 403);
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { requireRoles, requireAdmin, createRequireAdminWithAudit };
