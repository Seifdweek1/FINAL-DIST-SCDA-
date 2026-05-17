const jwt = require('jsonwebtoken');
const { signAccessToken } = require('../utils/jwt.util');
const { toPublicUser } = require('../utils/userPublic.util');

function buildLoginResult(user, config) {
  const accessToken = signAccessToken(
    { userId: user.id, email: user.email, role: user.role },
    config.jwtSecret,
    config.jwtExpiresIn,
  );

  const decoded = jwt.decode(accessToken);
  const expiresIn =
    decoded && typeof decoded.exp === 'number'
      ? Math.max(0, decoded.exp - Math.floor(Date.now() / 1000))
      : undefined;

  return {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: expiresIn,
    user: toPublicUser({
      id: user.id,
      email: user.email,
      role: user.role,
      created_at: user.created_at,
    }),
  };
}

module.exports = { buildLoginResult };
