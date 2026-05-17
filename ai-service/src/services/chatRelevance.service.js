const { extractContentFromHit } = require('./chat.replies');
const {
  isReadablePassage,
  cleanPassage,
  scorePassageForQuery,
  isBroadDocumentQuery,
} = require('../utils/textQuality');
const {
  computeKeywordScore,
  computeQueryTermOverlap,
  tokenizeSearchQuery,
} = require('./searchRanking.service');

const MIN_TOP_VECTOR_SCORE = Number(process.env.CHAT_MIN_TOP_VECTOR_SCORE) || 0.15;
const MIN_TERM_OVERLAP = Number(process.env.CHAT_MIN_TERM_OVERLAP) || 0.15;
const MIN_KEYWORD_SCORE = Number(process.env.CHAT_MIN_KEYWORD_SCORE) || 5;

function isLowQualityHit(text, payload) {
  if (!isReadablePassage(text, { minLen: 40 })) return true;
  const meta = payload?.metadata && typeof payload.metadata === 'object' ? payload.metadata : {};
  const source = meta.source || payload?.source || '';
  if (
    source === 'chat-auto-index' &&
    /\b(create\s+extension|create\s+table|pgcrypto|alter\s+table)\b/i.test(text)
  ) {
    return true;
  }
  return false;
}

function sortReadableHits(hits) {
  return (hits || [])
    .map((hit) => ({ hit, text: extractContentFromHit(hit) }))
    .filter((x) => x.text.length >= 30 && !isLowQualityHit(x.text, x.hit.payload))
    .sort((a, b) => (Number(b.hit.score) || 0) - (Number(a.hit.score) || 0));
}

function bestPlainPassage(plainPassages) {
  for (const raw of plainPassages || []) {
    const t = cleanPassage(raw, 0);
    if (t.length >= 30 && isReadablePassage(t, { minLen: 30 })) return t;
  }
  return '';
}

function pickBestReadableForRelevance(query, hits, plainPassages) {
  const q = String(query || '').trim();
  const readableHits = sortReadableHits(hits);
  let best = null;
  let bestScore = -Infinity;

  for (const { hit, text } of readableHits) {
    const payload = hit.payload || {};
    const meta = payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {};
    const keywordScore = computeKeywordScore(q, text, payload);
    const termOverlap = computeQueryTermOverlap(q, text);
    let combined = keywordScore + termOverlap * 14;
    if (meta.source === 'chat-auto-index') {
      combined -= 8;
    }
    if (combined > bestScore) {
      bestScore = combined;
      best = {
        hit,
        text,
        keywordScore,
        termOverlap,
        vectorScore: Number(hit.score) || 0,
      };
    }
  }

  const plain = bestPlainPassage(plainPassages);
  if (plain) {
    const keywordScore = computeKeywordScore(q, plain, {});
    const termOverlap = computeQueryTermOverlap(q, plain);
    const combined = keywordScore + termOverlap * 14;
    if (combined > bestScore) {
      best = {
        hit: null,
        text: plain,
        keywordScore,
        termOverlap,
        vectorScore: null,
      };
    }
  }

  return { best, readableHits };
}

/**
 * Decide whether retrieved context is strong enough to answer from the selected document.
 * @returns {{ relevant: boolean, reason?: string, top_vector_score?: number|null, term_overlap?: number, keyword_score?: number }}
 */
function assessChatDocumentRelevance({ query, hits, plainPassages }) {
  const q = String(query || '').trim();
  const broad = isBroadDocumentQuery(q);
  const { best, readableHits } = pickBestReadableForRelevance(q, hits, plainPassages);

  const readablePlain = (plainPassages || []).filter((p) =>
    isReadablePassage(cleanPassage(p, 0), { minLen: 40 }),
  );

  if (broad && (readablePlain.length > 0 || readableHits.length > 0)) {
    return {
      relevant: true,
      reason: 'broad_document_query',
      top_vector_score: readableHits[0] ? Number(readableHits[0].hit.score) || 0 : null,
      term_overlap: best?.termOverlap ?? 1,
      keyword_score: best?.keywordScore ?? 0,
    };
  }

  if (!best) {
    return { relevant: false, reason: 'no_results' };
  }

  const topText = best.text;
  const topVectorScore =
    readableHits.length > 0
      ? Math.max(...readableHits.map((r) => Number(r.hit.score) || 0))
      : best.vectorScore;
  const payload = best.hit?.payload || {};

  const termOverlap = best.termOverlap;
  const keywordScore = Math.max(
    best.keywordScore,
    scorePassageForQuery(topText, q),
  );

  const ql = q.toLowerCase();
  const pl = topText.toLowerCase();
  if (
    /\bintegrity|sha|hash|verify\b/.test(ql) &&
    /sha-?256/.test(pl) &&
    /\bintegrity|hash|compar|verify|recomput/i.test(pl)
  ) {
    return {
      relevant: true,
      top_vector_score: topVectorScore,
      term_overlap: termOverlap,
      keyword_score: keywordScore,
    };
  }

  if (
    readableHits.length > 0 &&
    topVectorScore < MIN_TOP_VECTOR_SCORE &&
    readablePlain.length === 0
  ) {
    return {
      relevant: false,
      reason: 'low_vector_score',
      top_vector_score: topVectorScore,
      term_overlap: termOverlap,
      keyword_score: keywordScore,
    };
  }

  const queryTerms = tokenizeSearchQuery(q);
  if (queryTerms.length >= 2 && termOverlap === 0 && keywordScore < MIN_KEYWORD_SCORE + 4) {
    return {
      relevant: false,
      reason: 'no_term_overlap',
      top_vector_score: topVectorScore,
      term_overlap: termOverlap,
      keyword_score: keywordScore,
    };
  }

  if (termOverlap < MIN_TERM_OVERLAP && keywordScore < MIN_KEYWORD_SCORE) {
    return {
      relevant: false,
      reason: 'low_keyword_overlap',
      top_vector_score: topVectorScore,
      term_overlap: termOverlap,
      keyword_score: keywordScore,
    };
  }

  if (queryTerms.length >= 1 && termOverlap < MIN_TERM_OVERLAP && keywordScore < MIN_KEYWORD_SCORE + 2) {
    return {
      relevant: false,
      reason: 'low_keyword_overlap',
      top_vector_score: topVectorScore,
      term_overlap: termOverlap,
      keyword_score: keywordScore,
    };
  }

  return {
    relevant: true,
    top_vector_score: topVectorScore,
    term_overlap: termOverlap,
    keyword_score: keywordScore,
  };
}

function buildNoRelevantContextReply(filename) {
  const name = filename || 'the selected document';
  return `I could not find enough relevant information in ${name} to answer this question.`;
}

module.exports = {
  assessChatDocumentRelevance,
  pickBestReadableForRelevance,
  buildNoRelevantContextReply,
  MIN_TOP_VECTOR_SCORE,
  MIN_TERM_OVERLAP,
  MIN_KEYWORD_SCORE,
};
