const { AppError } = require('../errors/AppError');

function errorMiddleware(err, req, res, next) {
  if (res.headersSent) {
    next(err);
    return;
  }

  const status = err instanceof AppError ? err.statusCode : 500;
  let message = err instanceof AppError ? err.message : 'An unexpected error occurred';

  if (status >= 500) {
    console.error('Unhandled error', { name: err.name, message: err.message });
    if (err?.message?.includes('invalid byte sequence') || err?.message?.includes('0x00')) {
      message = 'Message could not be saved (invalid characters in document text). Re-upload as TXT or re-index the file.';
    }
  }

  res.type('application/json').status(status).json({
    error: {
      message,
    },
  });
}

module.exports = { errorMiddleware };
