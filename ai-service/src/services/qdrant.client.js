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
      // Use 500 (not 502): nginx gateway uses error_page 502/503/504 for dead upstreams;
      // 502 from the app would be replaced and hide the real Qdrant message.
      const err = new AppError(`Qdrant error: ${msg}`, 500);
      err.qdrantStatus = res.status;
      throw err;
    }
    return json;
  }

  async function health() {
    try {
      const res = await fetch(`${base}/`, { method: 'GET', headers: headers() });
      return { ok: res.ok, status: res.status };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  async function ensureCollection() {
    const getRes = await fetch(`${base}/collections/${encodeURIComponent(collection)}`, {
      method: 'GET',
      headers: headers(),
    });
    if (getRes.ok) {
      return;
    }
    if (getRes.status !== 404) {
      const text = await getRes.text();
      throw new AppError(`Qdrant collection check failed: ${text}`, 500);
    }
    await request('PUT', `/collections/${encodeURIComponent(collection)}`, {
      vectors: {
        size: dim,
        distance: 'Cosine',
      },
    });
  }

  async function upsertPoint({ id, vector, payload }) {
    return request(
      'PUT',
      `/collections/${encodeURIComponent(collection)}/points?wait=true`,
      {
        points: [
          {
            id,
            vector,
            payload,
          },
        ],
      },
    );
  }

  async function searchPoints({ vector, userId, limit, documentId }) {
    const must = [
      {
        key: 'user_id',
        match: { value: userId },
      },
    ];

    if (documentId) {
      must.push({
        should: [
          { key: 'document_id', match: { value: documentId } },
          { key: 'metadata.document_id', match: { value: documentId } },
        ],
      });
    }

    const body = {
      vector,
      limit,
      with_payload: true,
      with_vector: false,
      filter: { must },
    };
    return request(
      'POST',
      `/collections/${encodeURIComponent(collection)}/points/search`,
      body,
    );
  }

  return {
    health,
    ensureCollection,
    upsertPoint,
    searchPoints,
    collectionName: collection,
  };
}

module.exports = { createQdrantClient };
