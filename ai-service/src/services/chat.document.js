const { isReadablePassage, cleanPassage } = require('../utils/textQuality');

/**
 * Document-scoped chat: filename parsing, ownership, session focus, text grounding.
 */

const FILENAME_PATTERNS = [
  /\bin\s+file\s+["']?([^\s"'?,;]+)["']?/i,
  /\bsearch\s+in\s+["']?([^\s"'?,;]+)["']?/i,
  /\bfrom\s+["']?([^\s"'?,;]+)["']?/i,
  /\binside\s+["']?([^\s"'?,;]+)["']?/i,
  /\bin\s+["']?([^\s"'?,;]+\.[a-z0-9]{1,12})["']?/i,
];

function normalizeFilenameToken(raw) {
  return String(raw || '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/[.,;:!?]+$/g, '');
}

/**
 * @param {string} message
 * @returns {string|null}
 */
function extractFilenameFromMessage(message) {
  const text = String(message || '').trim();
  if (!text) return null;

  for (const re of FILENAME_PATTERNS) {
    const m = text.match(re);
    if (m && m[1]) {
      const name = normalizeFilenameToken(m[1]);
      if (name.length >= 2) return name;
    }
  }

  const bare = text.match(/\b([\w.-]+\.[a-z0-9]{1,12})\b/i);
  if (bare && bare[1] && /\b(in|file|search|from|inside|about)\b/i.test(text)) {
    return normalizeFilenameToken(bare[1]);
  }

  return null;
}

function stripFilenameFromQuery(message, filename) {
  if (!filename) return String(message || '').trim();
  const esc = filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return (
    String(message || '')
      .replace(new RegExp(esc, 'gi'), '')
      .replace(/\b(in file|search in|from|inside|in)\b/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim() || String(message || '').trim()
  );
}

/**
 * @returns {'clear_document'|'which_document'|'list_documents'|null}
 */
function detectSpecialCommand(message) {
  const n = String(message || '').trim().toLowerCase();
  if (!n) return null;
  if (/^clear\s+selected\s+document\.?$/.test(n) || n === 'clear file' || n === 'clear document') {
    return 'clear_document';
  }
  if (/^which\s+file\s+are\s+we\s+using\??$/.test(n) || n === 'which document are we using?') {
    return 'which_document';
  }
  if (
    /\bwhat\s+documents?\s+do\s+i\s+have\b/.test(n) ||
    /\blist\s+(my\s+)?(uploaded\s+)?(files?|documents?)\b/.test(n) ||
    /\bwhat\s+files?\s+do\s+i\s+have\b/.test(n)
  ) {
    return 'list_documents';
  }
  return null;
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 */
async function resolveDocumentByFilename(prisma, userId, filename) {
  const token = normalizeFilenameToken(filename);
  if (!token) return { error: 'invalid_name' };

  const exact = await prisma.$queryRaw`
    SELECT id, user_id, original_filename, mime_type, status::text AS status
    FROM documents
    WHERE user_id = ${userId}
      AND LOWER(original_filename) = LOWER(${token})
    LIMIT 1
  `;
  if (Array.isArray(exact) && exact.length > 0) {
    return { document: exact[0] };
  }

  const partial = await prisma.$queryRaw`
    SELECT id, user_id, original_filename, mime_type, status::text AS status
    FROM documents
    WHERE user_id = ${userId}
      AND LOWER(original_filename) LIKE ${`%${token.toLowerCase()}%`}
    ORDER BY updated_at DESC
    LIMIT 5
  `;
  if (!Array.isArray(partial) || partial.length === 0) {
    return { error: 'not_found', filename: token };
  }
  if (partial.length > 1) {
    const exactCi = partial.find(
      (d) => String(d.original_filename).toLowerCase() === token.toLowerCase(),
    );
    if (exactCi) return { document: exactCi };
  }
  return { document: partial[0] };
}

async function getDocumentByIdForUser(prisma, userId, documentId) {
  const rows = await prisma.$queryRaw`
    SELECT id, user_id, original_filename, mime_type, status::text AS status
    FROM documents
    WHERE id = ${documentId}
    LIMIT 1
  `;
  if (!Array.isArray(rows) || rows.length === 0) {
    return { error: 'not_found' };
  }
  const doc = rows[0];
  if (String(doc.user_id) !== String(userId)) {
    return { error: 'forbidden' };
  }
  return { document: doc };
}

async function getDocumentFilename(prisma, documentId) {
  if (!documentId) return null;
  const rows = await prisma.$queryRaw`
    SELECT original_filename FROM documents WHERE id = ${documentId} LIMIT 1
  `;
  if (!Array.isArray(rows) || !rows[0]) return null;
  return String(rows[0].original_filename);
}

/**
 * Simple passage ranking without an LLM.
 */
function extractRelevantPassages(plainText, query, maxPassages = 3, passageLen = 600) {
  const text = String(plainText || '').replace(/\r\n/g, '\n');
  if (!text.trim()) return [];

  const q = String(query || '')
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 12);
  if (q.length === 0) {
    return [text.slice(0, passageLen)];
  }

  const paragraphs = text
    .split(/\n{2,}|(?<=[.!?])\s+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 40 && isReadablePassage(p, { minLen: 40 }));

  const scored = paragraphs.map((p) => {
    const lower = p.toLowerCase();
    let score = 0;
    for (const w of q) {
      if (lower.includes(w)) score += 1;
    }
    return { p, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.filter((s) => s.score > 0).slice(0, maxPassages);
  if (top.length === 0) {
    const fallback = cleanPassage(text, passageLen);
    return isReadablePassage(fallback, { minLen: 40 }) ? [fallback] : [];
  }
  return top.map((s) => cleanPassage(s.p, passageLen));
}

module.exports = {
  extractFilenameFromMessage,
  stripFilenameFromQuery,
  detectSpecialCommand,
  resolveDocumentByFilename,
  getDocumentByIdForUser,
  getDocumentFilename,
  extractRelevantPassages,
  normalizeFilenameToken,
};
