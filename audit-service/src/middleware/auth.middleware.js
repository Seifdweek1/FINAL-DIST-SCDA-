const jwt = require('jsonwebtoken');
const { AppError } = require('../errors/AppError');

function createAuthenticateMiddleware(config) {
  return function authenticate(req, res, next) {
    try {
      const header = req.headers.authorization;
      if (!header || !header.startsWith('Bearer ')) {
        throw new AppError('Authentication required', 401);
      }

      const token = header.slice('Bearer '.length).trim();
      if (!token) {
        throw new AppError('Authentication required', 401);
      }

      let payload;
      try {
        payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
      } catch {
        throw new AppError('Invalid or expired token', 401);
      }

      const id = payload.sub;
      if (!id || typeof payload.role !== 'string') {
        throw new AppError('Invalid or expired token', 401);
      }

      req.user = {
        id,
        email: typeof payload.email === 'string' ? payload.email : undefined,
        role: payload.role,
      };
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { createAuthenticateMiddleware };
