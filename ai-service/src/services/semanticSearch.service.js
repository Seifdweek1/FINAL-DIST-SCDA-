const { embedText } = require('./embedding.service');
const { expandSearchQueries } = require('./queryExpansion.service');
const { rankSearchResults, extractPassageText } = require('./searchRanking.service');
const { buildSearchAnswer } = require('./searchAnswer.service');

function confidenceLabel(score) {
  const s = Number(score) || 0;
  if (s >= 0.75) return 'high';
  if (s >= 0.45) return 'medium';
  if (s >= 0.2) return 'low';
  return 'weak';
}

function enrichHit(hit, query) {
  const payload = hit.payload && typeof hit.payload === 'object' ? hit.payload : {};
  const passage = extractPassageText(payload);
  const documentId = payload.document_id || null;
  const documentName =
    payload.document_name ||
    payload.metadata?.filename ||
    payload.metadata?.source ||
    null;

  return {
    id: hit.id,
    score: hit.score,
    confidence: confidenceLabel(hit.score),
    document_id: documentId,
    document_name: documentName,
    chunk_index: payload.chunk_index ?? null,
    text_preview: payload.text_preview || passage.slice(0, 500) || null,
    payload,
  };
}

function mergeRawHits(hitLists) {
  const byId = new Map();

  for (const list of hitLists) {
    for (const hit of list || []) {
      const id = String(hit.id);
      const prev = byId.get(id);
      const score = Number(hit.score) || 0;
      if (!prev || score > prev.score) {
        byId.set(id, { ...hit, score });
      }
    }
  }

  return [...byId.values()].sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));
}

function relatedDocumentsFromHits(enriched, limit = 5) {
  const byDoc = new Map();

  for (const hit of enriched) {
    const docId = hit.document_id;
    if (!docId) continue;
    const prev = byDoc.get(docId);
    const score = Number(hit.score) || 0;
    if (!prev || score > prev.best_score) {
      byDoc.set(docId, {
        document_id: docId,
        document_name: hit.document_name,
        best_score: score,
        hit_count: (prev?.hit_count || 0) + 1,
      });
    } else {
      prev.hit_count += 1;
      byDoc.set(docId, prev);
    }
  }

  return [...byDoc.values()]
    .sort((a, b) => b.best_score - a.best_score)
    .slice(0, limit)
    .map(({ document_id, document_name, best_score, hit_count }) => ({
      document_id,
      document_name,
      best_score,
      hit_count,
      confidence: confidenceLabel(best_score),
    }));
}

/**
 * Multi-query semantic search: original + expanded concepts, cosine retrieval, hybrid re-rank.
 */
async function runSemanticSearch({ qdrant, userId, query, limit, embeddingDim }) {
  const qStr = String(query || '').trim();
  const capped = Math.max(1, Math.min(Number(limit) || 10, 50));
  const fetchPerQuery = Math.min(Math.max(capped * 5, 25), 50);

  const queries = expandSearchQueries(qStr, 4);
  const hitLists = [];

  for (const qVariant of queries) {
    const vector = embedText(qVariant, embeddingDim);
    const raw = await qdrant.searchPoints({
      vector,
      userId,
      limit: fetchPerQuery,
    });
    hitLists.push(raw.result || []);
  }

  const merged = mergeRawHits(hitLists);
  const ranked = rankSearchResults(merged, qStr, capped);
  const enriched = ranked.map((h) => enrichHit(h, qStr));
  const answer = buildSearchAnswer(qStr, ranked);
  const related_documents = relatedDocumentsFromHits(enriched, 6);

  return {
    query: qStr,
    answer,
    limit: capped,
    results: enriched,
    related_documents,
    expanded_queries: queries,
    retrieval: {
      strategy: 'multi-query-cosine',
      embedding_model: 'hash-simulated',
      distance: 'cosine',
      variant_count: queries.length,
      candidate_count: merged.length,
    },
  };
}

module.exports = {
  runSemanticSearch,
  enrichHit,
  relatedDocumentsFromHits,
  confidenceLabel,
  mergeRawHits,
};
