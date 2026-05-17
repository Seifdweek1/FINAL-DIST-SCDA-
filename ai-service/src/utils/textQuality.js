/**
 * Detect PDF/binary garbage vs human-readable prose for RAG and chat.
 */

const GARBAGE_PATTERNS = [
  /%PDF/i,
  /\bendobj\b/i,
  /\bstream\b/i,
  /\/Type\s*\//i,
  /Mozilla\/5\.0/i,
  /\\x[0-9a-f]{2}/i,
  /ï¿½/,
  /[^\x20-\x7e\n\r\t]{8,}/,
  /\bCREATE\s+EXTENSION\b/i,
  /\bCREATE\s+TABLE\b/i,
  /\bpgcrypto\b/i,
];

function isReadablePassage(text, options = {}) {
  const minLen = options.minLen ?? 40;
  const t = String(text ?? '')
    .replace(/\0/g, '')
    .replace(/[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '')
    .trim();
  if (t.length < minLen) return false;

  for (const re of GARBAGE_PATTERNS) {
    if (re.test(t)) return false;
  }

  const printable = (t.match(/[\x20-\x7e\n\r\t\u00c0-\u024f]/g) || []).length;
  if (printable / t.length < 0.78) return false;

  const letters = (t.match(/[a-zA-Z]/g) || []).length;
  if (letters / t.length < 0.35) return false;

  const words = t.match(/\b[a-zA-Z]{3,}\b/g) || [];
  if (words.length < 5) return false;

  const weird = (t.match(/[^\w\s.,;:!?'"()-]/g) || []).length;
  if (weird / t.length > 0.22) return false;

  return true;
}

function cleanPassage(text, maxLen = 900) {
  let s = String(text ?? '')
    .replace(/\0/g, '')
    .replace(/[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (maxLen > 0 && s.length > maxLen) {
    const cut = s.slice(0, maxLen);
    const lastSpace = cut.lastIndexOf(' ');
    s = lastSpace > maxLen * 0.6 ? cut.slice(0, lastSpace) : cut;
    s += '…';
  }
  return s;
}

/** Penalize cover pages, page headers, name lists (common in PDF chunk 0). */
function boilerplatePenalty(passage) {
  let penalty = 0;
  const t = String(passage || '');
  const lower = t.toLowerCase();

  if (/page\s+\d+\s*\|/i.test(t) || /\|\s*page\s+\d+/i.test(t)) penalty += 6;
  if (/^page\s+\d+/im.test(t)) penalty += 4;
  if (lower.includes('executive risk report') && t.length < 500) penalty += 4;
  if ((t.match(/\b[A-Z][a-z]{2,}\s+[A-Z][a-z]{2,}\b/g) || []).length >= 6 && t.length < 700) {
    penalty += 5;
  }
  if ((lower.match(/\breport\b/g) || []).length >= 2 && t.length < 350) penalty += 2;

  return penalty;
}

/**
 * @returns {'bullets'|'conclusion'|'recommendations'|'overview'|'general'}
 */
/** Whole-document questions (summarize, overview) — should not require keyword overlap. */
function isBroadDocumentQuery(query) {
  const q = String(query || '').toLowerCase();
  return (
    /\b(summariz(e|ing|ation)?|summary|overview|tldr|tl;dr)\b/.test(q) ||
    /\b(describe|explain)\b.*\b(document|file|report|paper)\b/.test(q) ||
    /\b(document|file|report)\b.*\b(about|contain|say|cover)\b/.test(q) ||
    /\bwhat\s+is\s+(this|the)\s+(document|file|report)\b/.test(q) ||
    /\b(main|key)\s+points?\b/.test(q) ||
    /\btell\s+me\s+about\b/.test(q)
  );
}

function detectAnswerStyle(query) {
  const q = String(query || '').toLowerCase();
  if (
    /\b(bullet|bullets|bullet points?|numbered list)\b/.test(q) ||
    /\bin\s+\d+\s+bullet/.test(q) ||
    /\d+\s+bullet\s+point/.test(q)
  ) {
    return 'bullets';
  }
  if (/\b(recommend|recommendation|should we|action items?|mitigation|controls? to)\b/.test(q)) {
    return 'recommendations';
  }
  if (/\b(conclusion|conclude|summarize|summary|overview|executive summary)\b/.test(q)) {
    return 'conclusion';
  }
  if (/\b(what is this|about this|describe|explain)\b/.test(q)) {
    return 'overview';
  }
  return 'general';
}

function scorePassageForQuery(passage, query) {
  const p = passage.toLowerCase();
  const q = String(query || '').toLowerCase();
  let score = 0;

  const terms = q
    .split(/\s+/)
    .filter((w) => w.length > 3 && !['what', 'which', 'where', 'when', 'does', 'document', 'file'].includes(w));
  for (const term of terms) {
    if (p.includes(term)) score += 2;
  }

  const style = detectAnswerStyle(query);
  if (style === 'conclusion' && /\b(conclusion|in summary|to conclude|overall|finally|key takeaway)\b/i.test(passage)) {
    score += 10;
  }
  if (style === 'recommendations' && /\b(recommend|should|must|shall|propose|suggest|mitigation|control|implement)\b/i.test(passage)) {
    score += 10;
  }
  if (style === 'overview' && /\b(purpose|scope|objective|introduction|overview|architecture|system)\b/i.test(passage)) {
    score += 6;
  }
  if (/\b(how|why|what)\b/.test(q)) {
    const qWords = q.split(/\s+/).filter((w) => w.length > 4);
    for (const w of qWords) {
      if (p.includes(w)) score += 1;
    }
  }

  score -= boilerplatePenalty(passage);
  return score;
}

function splitSentences(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 25 && isReadablePassage(s, { minLen: 25 }));
}

function uniquePassages(passages, max = 8) {
  const out = [];
  const seen = new Set();
  for (const raw of passages) {
    const t = cleanPassage(raw, 0);
    if (!t || !isReadablePassage(t, { minLen: 40 })) continue;
    const key = t.slice(0, 100).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

module.exports = {
  isReadablePassage,
  cleanPassage,
  scorePassageForQuery,
  boilerplatePenalty,
  detectAnswerStyle,
  isBroadDocumentQuery,
  splitSentences,
  uniquePassages,
};
