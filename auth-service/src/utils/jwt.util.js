const jwt = require('jsonwebtoken');

function signAccessToken({ userId, email, role }, secret, expiresIn) {
  return jwt.sign(
    {
      sub: userId,
      email,
      role,
    },
    secret,
    { expiresIn, algorithm: 'HS256' },
  );
}

function verifyAccessToken(token, secret) {
  return jwt.verify(token, secret, { algorithms: ['HS256'] });
}

module.exports = { signAccessToken, verifyAccessToken };
