const {
  cleanPassage,
  detectAnswerStyle,
  isReadablePassage,
  scorePassageForQuery,
  splitSentences,
  uniquePassages,
  isBroadDocumentQuery,
} = require('../utils/textQuality');
const {
  computeKeywordScore,
  computeQueryTermOverlap,
  pickBestScoredPassage,
  extractPassageText,
} = require('./searchRanking.service');
const { formatDomainShortAnswer } = require('./searchAnswer.service');

function isChatAutoIndexHit(hit) {
  const p = hit?.payload || {};
  const meta = p.metadata && typeof p.metadata === 'object' ? p.metadata : {};
  return (meta.source || p.source) === 'chat-auto-index';
}

function rankPassageCandidates(hits, plainPassages, query) {
  const candidates = [];

  for (const h of hits || []) {
    const text = extractPassageText(h.payload);
    if (!text || !isReadablePassage(text, { minLen: 40 })) continue;

    const keywordScore = computeKeywordScore(query, text, h.payload || {});
    const vectorScore = typeof h.score === 'number' ? h.score : 0;
    candidates.push({
      text,
      score: keywordScore + vectorScore * 0.08,
      keywordScore,
      vectorScore,
    });
  }

  for (const text of plainPassages || []) {
    const t = cleanPassage(text, 0);
    if (!t || !isReadablePassage(t, { minLen: 40 })) continue;
    if (candidates.some((c) => c.text.slice(0, 90) === t.slice(0, 90))) continue;
    const keywordScore = computeKeywordScore(query, t, {});
    candidates.push({
      text: t,
      score: keywordScore + 12,
      keywordScore,
      vectorScore: 0,
    });
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates;
}

function hitsForPickBest(hits, plainPassages) {
  const list = (hits || []).map((h, i) => ({
    id: h.id || `q-${i}`,
    score: Number(h.score) || 0,
    payload: h.payload || {},
  }));
  for (let i = 0; i < (plainPassages || []).length; i += 1) {
    const text = cleanPassage(plainPassages[i], 0);
    if (!text || text.length < 40) continue;
    list.push({
      id: `pg-${i}`,
      score: 0,
      payload: { content: text, text_preview: text },
    });
  }
  return list;
}

function pickSentencesForStyle(passages, query, style) {
  const allSentences = [];
  for (const p of passages) {
    for (const s of splitSentences(p)) {
      allSentences.push({ sentence: s, score: scorePassageForQuery(s, query) });
    }
  }
  allSentences.sort((a, b) => b.score - a.score);

  const seen = new Set();
  const picked = [];
  for (const item of allSentences) {
    const key = item.sentence.slice(0, 60).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    if (style === 'recommendations') {
      if (!/\b(recommend|should|must|shall|control|mitigat|implement|risk|ensure)\b/i.test(item.sentence)) {
        continue;
      }
    }
    if (style === 'conclusion') {
      if (
        item.score < 2 &&
        !/\b(conclusion|summary|overall|therefore|thus|in short|key)\b/i.test(item.sentence)
      ) {
        continue;
      }
    }

    picked.push(item.sentence);
    if (picked.length >= 8) break;
  }

  if (picked.length === 0) {
    for (const item of allSentences.slice(0, 5)) {
      picked.push(item.sentence);
    }
  }

  return picked;
}

function formatBullets(sentences, count) {
  const n = Math.min(count || 3, sentences.length);
  if (n === 0) return '';
  return sentences
    .slice(0, n)
    .map((s) => `• ${cleanPassage(s, 320)}`)
    .join('\n');
}

function buildDocumentAnswer({ filename, userQuery, hits, plainPassages }) {
  const name = filename || 'the selected document';
  const query = String(userQuery || '').trim();
  const style = detectAnswerStyle(query);

  const ranked = rankPassageCandidates(hits, plainPassages, query);
  const passages = uniquePassages(
    ranked.map((c) => c.text),
    6,
  );

  if (passages.length === 0) {
    return `I could not find readable passages in **${name}** that match your question.\n\nTry re-uploading a **text-based PDF** or **.txt**, wait for **READY**, or ask about a specific section (e.g. “risk recommendations”, “architecture”, “conclusion”).`;
  }

  const sentences = pickSentencesForStyle(passages, query, style);

  if (style === 'bullets') {
    const bulletCountMatch = query.match(/\b(\d+)\s+bullet/);
    const count = bulletCountMatch ? Math.min(8, Number(bulletCountMatch[1]) || 3) : 3;
    const bullets = formatBullets(sentences, count);
    if (!bullets) {
      return `**${name}** does not contain a clear section I could turn into bullet points for that question. Try asking about **recommendations**, **risks**, or **architecture** using words that appear in the document.`;
    }
    return `From **${name}**, here are the main points relevant to your question:\n\n${bullets}`;
  }

  if (style === 'recommendations') {
    const rec = sentences.filter((s) =>
      /\b(recommend|should|must|control|mitigat|implement|ensure|policy)\b/i.test(s),
    );
    const use = rec.length ? rec : sentences;
    const bullets = formatBullets(use, Math.min(5, use.length));
    return `Main recommendations and controls mentioned in **${name}**:\n\n${bullets || cleanPassage(use[0], 600)}`;
  }

  if (style === 'conclusion') {
    const lead = sentences.slice(0, 3).map((s) => cleanPassage(s, 400)).join(' ');
    return `**Conclusion (from ${name}):**\n\n${lead || cleanPassage(passages[0], 700)}`;
  }

  const body = sentences.slice(0, 3).map((s) => cleanPassage(s, 380)).join('\n\n');
  return `**${name}** — based on the indexed content:\n\n${body || cleanPassage(passages[0], 650)}`;
}

function buildConciseChatAnswer({ userQuery, hits, plainPassages }) {
  const query = String(userQuery || '').trim();
  const best = pickBestScoredPassage(query, hitsForPickBest(hits, plainPassages));
  if (!best?.passage) return null;

  const overlap = computeQueryTermOverlap(query, best.passage);
  if (overlap === 0 && best.keywordScore < 4) {
    return null;
  }

  return formatDomainShortAnswer(query, best.passage);
}

/**
 * Grounded chat reply: keyword-first ranking, domain-aware short answers, structured fallbacks.
 */
function buildChatAnswerFromContext({ filename, userQuery, hits, plainPassages }) {
  const query = String(userQuery || '').trim();
  const style = detectAnswerStyle(query);
  const broad = isBroadDocumentQuery(query);

  if (broad || style === 'bullets' || style === 'conclusion' || style === 'overview' || style === 'recommendations') {
    return buildDocumentAnswer({ filename, userQuery: query, hits, plainPassages });
  }

  const concise = buildConciseChatAnswer({ userQuery: query, hits, plainPassages });
  if (concise) {
    return concise;
  }

  return buildDocumentAnswer({ filename, userQuery: query, hits, plainPassages });
}

module.exports = {
  buildDocumentAnswer,
  buildConciseChatAnswer,
  buildChatAnswerFromContext,
  rankPassageCandidates,
  isChatAutoIndexHit,
};
