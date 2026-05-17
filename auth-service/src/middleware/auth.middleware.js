const { verifyAccessToken } = require('../utils/jwt.util');
const { AppError } = require('../errors/AppError');
const { findPublicById } = require('../services/user.service');

function createAuthenticateMiddleware(config) {
  return async function authenticate(req, res, next) {
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
        payload = verifyAccessToken(token, config.jwtSecret);
      } catch {
        throw new AppError('Invalid or expired token', 401);
      }

      const userId = payload.sub;
      if (!userId) {
        throw new AppError('Invalid or expired token', 401);
      }

      const user = await findPublicById(userId);

      if (!user) {
        throw new AppError('Invalid or expired token', 401);
      }

      req.user = user;
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { createAuthenticateMiddleware };
