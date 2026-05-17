const crypto = require('crypto');
const jwt = require('jsonwebtoken');

function createOAuthState(provider, jwtSecret) {
  const nonce = crypto.randomBytes(16).toString('hex');
  return jwt.sign(
    { purpose: 'oauth_state', provider, nonce },
    jwtSecret,
    { expiresIn: '10m', algorithm: 'HS256' },
  );
}

function verifyOAuthState(state, expectedProvider, jwtSecret) {
  const payload = jwt.verify(String(state || ''), jwtSecret, { algorithms: ['HS256'] });
  if (payload.purpose !== 'oauth_state') {
    throw new Error('invalid_oauth_state');
  }
  if (String(payload.provider).toLowerCase() !== String(expectedProvider).toLowerCase()) {
    throw new Error('oauth_provider_mismatch');
  }
  return payload;
}

module.exports = { createOAuthState, verifyOAuthState };
