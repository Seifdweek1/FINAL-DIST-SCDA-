const GARBAGE_PATTERNS = [
  /%PDF/i,
  /\bendobj\b/i,
  /\bstream\b/i,
  /Mozilla\/5\.0/i,
  /ï¿½/,
];

function isReadablePassage(text, options = {}) {
  const minLen = options.minLen ?? 80;
  const t = String(text ?? '').trim();
  if (t.length < minLen) return false;
  for (const re of GARBAGE_PATTERNS) {
    if (re.test(t)) return false;
  }
  const printable = (t.match(/[\x20-\x7e\n\r\t]/g) || []).length;
  if (printable / t.length < 0.78) return false;
  const words = t.match(/\b[a-zA-Z]{3,}\b/g) || [];
  return words.length >= 8;
}

module.exports = { isReadablePassage };
