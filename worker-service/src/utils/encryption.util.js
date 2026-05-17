const crypto = require('crypto');

const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const ALGO = 'aes-256-gcm';

function parseEncryptionKey(hexKey) {
  const key = Buffer.from(String(hexKey).trim(), 'hex');
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  }
  return key;
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

module.exports = { parseEncryptionKey, decryptBuffer };
