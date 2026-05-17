const { sanitizeForPostgresText } = require('../utils/textSanitize');
const {
  isReadablePassage,
  scorePassageForQuery,
  isBroadDocumentQuery,
} = require('../utils/textQuality');
const { tokenizeSearchQuery } = require('./searchRanking.service');

/**
 * PostgreSQL chunk fallback when Qdrant returns no hits (same tenant + document).
 */

function tokenizeQuery(query) {
  return tokenizeSearchQuery(query);
}

function isMissingChunksTableError(err) {
  const msg = String(err?.message || '');
  return err?.code === 'P2010' || msg.includes('document_chunks') || msg.includes('42P01');
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 */
async function fetchChunksForDocument(prisma, documentId, userId, maxRows = 80) {
  try {
    const rows = await prisma.$queryRaw`
      SELECT chunk_index, content
      FROM document_chunks
      WHERE document_id = ${documentId}
        AND user_id = ${userId}
      ORDER BY chunk_index ASC
      LIMIT ${maxRows}
    `;
    return Array.isArray(rows) ? rows : [];
  } catch (err) {
    if (isMissingChunksTableError(err)) {
      console.warn('document_chunks table missing — run document-service migrations');
      return [];
    }
    throw err;
  }
}

/**
 * Rank stored chunks by keyword overlap (no LLM).
 * @param {import('@prisma/client').PrismaClient} prisma
 */
async function searchChunksByKeywords(prisma, { documentId, userId, query, limit = 5 }) {
  const chunks = await fetchChunksForDocument(prisma, documentId, userId);
  if (!chunks.length) return [];

  const terms = tokenizeQuery(query);
  if (!terms.length || isBroadDocumentQuery(query)) {
    return chunks
      .map((c) => sanitizeForPostgresText(String(c.content || '').trim()))
      .filter((c) => c.length > 40 && isReadablePassage(c, { minLen: 40 }))
      .slice(0, limit);
  }

  const scored = chunks
    .map((row) => {
      const content = sanitizeForPostgresText(String(row.content || '').trim());
      if (!isReadablePassage(content, { minLen: 40 })) {
        return { content: '', score: -1, chunk_index: row.chunk_index };
      }
      let score = scorePassageForQuery(content, query);
      const lower = content.toLowerCase();
      for (const t of terms) {
        if (lower.includes(t)) score += 1;
      }
      return { content, score, chunk_index: row.chunk_index };
    })
    .filter((s) => s.score >= 0);

  scored.sort((a, b) => b.score - a.score || a.chunk_index - b.chunk_index);
  const withHits = scored.filter((s) => s.score > 0);
  const pick = (withHits.length ? withHits : scored).slice(0, limit);
  return pick.map((s) => s.content).filter((c) => c.length > 40);
}

module.exports = { fetchChunksForDocument, searchChunksByKeywords };
