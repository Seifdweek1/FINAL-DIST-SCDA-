const { validationResult } = require('express-validator');

function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      error: {
        message: 'Validation failed',
        details: errors.array({ onlyFirstError: true }).map((e) => ({
          field: e.path,
          message: e.msg,
        })),
      },
    });
  }
  return next();
}

module.exports = { handleValidationErrors };
