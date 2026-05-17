const crypto = require('crypto');

const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const ALGO = 'aes-256-gcm';

function encryptBuffer(plainBuffer, key32) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, key32, iv, { authTagLength: TAG_LENGTH });
  const ciphertext = Buffer.concat([cipher.update(plainBuffer), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]);
}

function decryptBuffer(payload, key32) {
  if (!Buffer.isBuffer(payload) || payload.length < IV_LENGTH + TAG_LENGTH) {
    throw new Error('Invalid ciphertext');
  }
  const iv = payload.subarray(0, IV_LENGTH);
  const tag = payload.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = payload.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = crypto.createDecipheriv(ALGO, key32, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

function sha256Buffer(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

module.exports = { encryptBuffer, decryptBuffer, sha256Buffer };
