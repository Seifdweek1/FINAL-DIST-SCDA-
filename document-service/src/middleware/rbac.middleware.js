const { AppError } = require('../errors/AppError');

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

module.exports = { requireRoles, requireAdmin };
