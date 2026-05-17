const { body } = require('express-validator');

const registerValidators = [
  body('email').trim().isEmail().withMessage('Invalid email format').normalizeEmail(),
  body('password')
    .isString()
    .withMessage('Password is required')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters'),
];

const loginValidators = [
  body('email').trim().isEmail().withMessage('Invalid email format').normalizeEmail(),
  body('password')
    .isString()
    .withMessage('Password is required')
    .isLength({ min: 1, max: 128 })
    .withMessage('Invalid credentials'),
];

module.exports = { registerValidators, loginValidators };
