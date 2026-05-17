/**
 * Semantic query expansion: related concepts for retrieval beyond exact keywords.
 * Works with hash-simulated embeddings by enriching the embedding input and multi-query search.
 */

const CONCEPT_MAP = {
  encryption: [
    'encryption',
    'encrypted',
    'aes-256',
    'aes-256-gcm',
    'cryptography',
    'cipher',
    'data protection',
    'secure communication',
    'cybersecurity',
    'confidentiality',
  ],
  integrity: [
    'integrity',
    'sha-256',
    'hash comparison',
    'tamper',
    'checksum',
    'verify',
    'file integrity',
  ],
  security: [
    'security',
    'authentication',
    'authorization',
    'access control',
    'rbac',
    'audit',
    'compliance',
  ],
  storage: ['storage', 'upload', 'document', 'file', 'retention', 'backup'],
  architecture: ['microservices', 'architecture', 'api', 'gateway', 'postgres', 'rabbitmq'],
};

const SUGGESTION_SEEDS = [
  'How are uploaded files encrypted?',
  'How does the system verify file integrity?',
  'What security controls protect documents?',
  'Summarize cryptography and data protection policies',
  'Explain secure communication and cybersecurity requirements',
  'Which documents mention AES-256 or SHA-256?',
];

function detectConcepts(query) {
  const ql = String(query || '').toLowerCase();
  const found = new Set();
  if (/\bencrypt|cipher|aes|gcm|crypto\b/.test(ql)) found.add('encryption');
  if (/\bintegrity|sha-?256|hash|tamper|checksum|verify\b/.test(ql)) found.add('integrity');
  if (/\bsecurity|auth|rbac|compliance|audit\b/.test(ql)) found.add('security');
  if (/\bstorage|upload|retention|backup\b/.test(ql)) found.add('storage');
  if (/\barchitecture|microservice|api\b/.test(ql)) found.add('architecture');
  return [...found];
}

/**
 * Build expanded query strings for multi-vector search (original + semantic variants).
 */
function expandSearchQueries(query, maxVariants = 4) {
  const original = String(query || '').trim();
  if (!original) return [];

  const variants = new Set([original]);
  const concepts = detectConcepts(original);

  for (const concept of concepts) {
    const terms = CONCEPT_MAP[concept] || [];
    const extra = terms.filter((t) => !original.toLowerCase().includes(t)).slice(0, 6);
    if (extra.length) {
      variants.add(`${original} ${extra.join(' ')}`);
    }
  }

  if (concepts.includes('encryption') && !/\bcybersecurity|cryptograph/i.test(original)) {
    variants.add(`${original} cybersecurity cryptography data protection secure communication`);
  }

  return [...variants].slice(0, maxVariants);
}

/**
 * Typeahead suggestions while typing.
 */
function buildSearchSuggestions(query, limit = 8) {
  const q = String(query || '').trim().toLowerCase();
  const cap = Math.min(Math.max(Number(limit) || 8, 1), 20);

  if (!q) {
    return SUGGESTION_SEEDS.slice(0, cap).map((text) => ({ text, kind: 'seed' }));
  }

  const out = [];
  const seen = new Set();

  function push(text, kind) {
    const key = text.toLowerCase();
    if (seen.has(key)) return;
    if (kind !== 'expansion' && !key.includes(q)) return;
    seen.add(key);
    out.push({ text, kind });
  }

  for (const seed of SUGGESTION_SEEDS) {
    if (seed.toLowerCase().includes(q)) push(seed, 'history');
  }

  const concepts = detectConcepts(q);
  for (const concept of concepts) {
    for (const term of CONCEPT_MAP[concept] || []) {
      if (term.includes(q) || q.includes(term.slice(0, 4))) {
        push(`${q} ${term}`, 'expansion');
      }
    }
  }

  for (const expanded of expandSearchQueries(q, 3)) {
    if (expanded.toLowerCase() !== q) push(expanded, 'expansion');
  }

  if (out.length < cap) {
    push(q.charAt(0).toUpperCase() + q.slice(1), 'completion');
  }

  return out.slice(0, cap);
}

module.exports = {
  expandSearchQueries,
  buildSearchSuggestions,
  detectConcepts,
  CONCEPT_MAP,
  SUGGESTION_SEEDS,
};
