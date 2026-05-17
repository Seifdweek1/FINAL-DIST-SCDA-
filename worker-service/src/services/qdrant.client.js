const { AppError } = require('../errors/AppError');

function createQdrantClient(config) {
  const base = config.qdrantUrl;
  const collection = config.qdrantCollection;
  const dim = config.embeddingDim;

  function headers(extra = {}) {
    const h = { ...extra };
    if (config.qdrantApiKey) {
      h['api-key'] = config.qdrantApiKey;
    }
    return h;
  }

  async function request(method, path, body) {
    const url = `${base}${path}`;
    const opts = {
      method,
      headers: headers(body ? { 'Content-Type': 'application/json' } : {}),
    };
    if (body !== undefined) {
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(url, opts);
    const text = await res.text();
    let json;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { raw: text };
    }
    if (!res.ok) {
      const msg = json.status?.error || json.message || text || res.statusText;
      throw new AppError(`Qdrant error: ${msg}`, 500);
    }
    return json;
  }

  async function ensureCollection() {
    const getRes = await fetch(`${base}/collections/${encodeURIComponent(collection)}`, {
      method: 'GET',
      headers: headers(),
    });
    if (getRes.ok) return;
    if (getRes.status !== 404) {
      const text = await getRes.text();
      throw new AppError(`Qdrant collection check failed: ${text}`, 500);
    }
    await request('PUT', `/collections/${encodeURIComponent(collection)}`, {
      vectors: { size: dim, distance: 'Cosine' },
    });
  }

  async function deletePointsForDocument(documentId) {
    return request('POST', `/collections/${encodeURIComponent(collection)}/points/delete?wait=true`, {
      filter: {
        must: [{ key: 'document_id', match: { value: documentId } }],
      },
    });
  }

  async function upsertPoints(points) {
    if (!points.length) return;
    return request('PUT', `/collections/${encodeURIComponent(collection)}/points?wait=true`, {
      points,
    });
  }

  return {
    ensureCollection,
    deletePointsForDocument,
    upsertPoints,
    collectionName: collection,
  };
}

module.exports = { createQdrantClient };
