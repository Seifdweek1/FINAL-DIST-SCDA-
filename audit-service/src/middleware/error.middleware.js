const { AppError } = require('../errors/AppError');

function errorMiddleware(err, req, res, next) {
  if (res.headersSent) {
    next(err);
    return;
  }

  let status = err instanceof AppError ? err.statusCode : 500;
  let message =
    err instanceof AppError ? err.message : 'An unexpected error occurred';

  if (status === 500 && err && err.name === 'PrismaClientKnownRequestError') {
    status = 400;
    message = 'Request could not be completed';
  }

  if (status >= 500) {
    console.error('Unhandled error', { name: err.name, code: err.code });
  }

  res.status(status).json({
    error: {
      message,
    },
  });
}

module.exports = { errorMiddleware };
