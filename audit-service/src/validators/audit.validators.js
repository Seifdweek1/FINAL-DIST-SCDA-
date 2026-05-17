const { validationResult, body, query, param } = require('express-validator');

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

const createLogValidators = [
  body('service').trim().isLength({ min: 1, max: 128 }).withMessage('service is required'),
  body('action').trim().isLength({ min: 1, max: 256 }).withMessage('action is required'),
  body('status').trim().isLength({ min: 1, max: 64 }).withMessage('status is required'),
  body('user_id').optional({ nullable: true }).isUUID().withMessage('user_id must be a UUID'),
  body('ip_address').optional({ nullable: true }).isLength({ max: 128 }).withMessage('ip_address too long'),
  body('details').optional({ nullable: true }).isObject().withMessage('details must be an object'),
];

const listQueryValidators = [
  query('user_id').optional().isUUID().withMessage('user_id must be a UUID'),
  query('service').optional().isLength({ max: 128 }),
  query('action').optional().isLength({ max: 256 }),
  query('status').optional().isLength({ max: 64 }),
  query('from').optional().isISO8601().withMessage('from must be ISO-8601 date'),
  query('to').optional().isISO8601().withMessage('to must be ISO-8601 date'),
  query('limit').optional().isInt({ min: 1, max: 200 }).toInt(),
  query('offset').optional().isInt({ min: 0 }).toInt(),
];

const logIdParam = [param('id').isUUID().withMessage('Invalid log id')];

module.exports = {
  handleValidationErrors,
  createLogValidators,
  listQueryValidators,
  logIdParam,
};
