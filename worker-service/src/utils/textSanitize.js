function sanitizeForPostgresText(input, maxLen = 0) {
  let s = String(input ?? '').replace(/\0/g, '').replace(/[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');
  if (maxLen > 0 && s.length > maxLen) {
    return s.slice(0, maxLen);
  }
  return s;
}

module.exports = { sanitizeForPostgresText };
