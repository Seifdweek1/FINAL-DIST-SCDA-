const crypto = require('crypto');
const { AppError } = require('../errors/AppError');

function timingSafeEqualString(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ba.length !== bb.length) {
    return false;
  }
  return crypto.timingSafeEqual(ba, bb);
}

function createInternalApiMiddleware(config) {
  return function internalApi(req, res, next) {
    const provided = req.headers['x-internal-api-key'];
    if (!timingSafeEqualString(provided || '', config.internalApiKey)) {
      next(new AppError('Forbidden', 403));
      return;
    }
    next();
  };
}

module.exports = { createInternalApiMiddleware };
