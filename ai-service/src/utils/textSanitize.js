/**
 * PostgreSQL text columns reject NUL (0x00). PDF/binary extraction may include them.
 */
function sanitizeForPostgresText(input, maxLen = 32_000) {
  let s = String(input ?? '');
  // Remove NUL and other C0 controls except tab/newline/carriage return
  s = s.replace(/\0/g, '').replace(/[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');
  if (maxLen > 0 && s.length > maxLen) {
    return `${s.slice(0, maxLen - 1)}…`;
  }
  return s;
}

module.exports = { sanitizeForPostgresText };
