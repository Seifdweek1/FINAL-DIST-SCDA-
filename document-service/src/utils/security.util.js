const path = require('path');
const { AppError } = require('../errors/AppError');

const BLOCKED_EXTENSIONS = new Set(['.exe', '.php', '.js', '.bat', '.sh']);

const BLOCKED_IN_NAME_RE = /\.(exe|php|js|bat|sh)(\.|$)/i;

function normalizeExt(filename) {
  const ext = path.extname(String(filename || '').toLowerCase());
  return ext;
}

function assertSafeExtension(originalFilename) {
  const base = path.basename(String(originalFilename || ''));
  if (!base || base === '.' || base === '..') {
    throw new AppError('Invalid filename', 400);
  }
  if (BLOCKED_IN_NAME_RE.test(base)) {
    throw new AppError('File extension not allowed', 415);
  }
  const ext = normalizeExt(base);
  if (BLOCKED_EXTENSIONS.has(ext)) {
    throw new AppError('File extension not allowed', 415);
  }
  return ext;
}

function assertAllowedExtension(originalFilename, allowedExtensionsLower) {
  const ext = assertSafeExtension(originalFilename);
  if (!allowedExtensionsLower.includes(ext)) {
    throw new AppError('File extension not allowed', 415);
  }
}

function assertAllowedMime(mimeType, allowedMimesLower) {
  const mime = String(mimeType || '').toLowerCase();
  if (!allowedMimesLower.includes(mime)) {
    throw new AppError('File type not allowed', 415);
  }
}

module.exports = {
  assertAllowedExtension,
  assertAllowedMime,
  assertSafeExtension,
  BLOCKED_EXTENSIONS,
};
