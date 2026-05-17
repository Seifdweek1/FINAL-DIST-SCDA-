const crypto = require('crypto');

/** Deterministic L2-normalized embedding (cosine in Qdrant). */
function embedText(text, dim) {
  const d = Number(dim) || 384;
  const vec = [];
  const input = String(text);
  for (let i = 0; i < d; i += 1) {
    const h = crypto.createHash('sha256').update(`${input}\n${i}`).digest();
    const x = h.readInt32BE(0) / 2147483648;
    vec.push(Math.max(-1, Math.min(1, x)));
  }
  let sumSq = 0;
  for (const v of vec) {
    sumSq += v * v;
  }
  const norm = Math.sqrt(sumSq) || 1;
  return vec.map((v) => v / norm);
}

module.exports = { embedText };
