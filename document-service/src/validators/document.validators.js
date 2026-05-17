const { param } = require('express-validator');

const documentIdParam = [
  param('id').isUUID().withMessage('Invalid document id'),
];

module.exports = { documentIdParam };
