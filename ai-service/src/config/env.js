function requireEnv(name) {
  const value = process.env[name];
  if (value === undefined || value === null || String(value).trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return String(value).trim();
}

function loadEnv() {
  const qdrantUrl = requireEnv('QDRANT_URL').replace(/\/+$/, '');
  const auditServiceUrl = requireEnv('AUDIT_SERVICE_URL').replace(/\/+$/, '');
  const databaseUrl = requireEnv('DATABASE_URL');
  const embeddingDim = Math.min(
    4096,
    Math.max(32, Number(process.env.EMBEDDING_DIM) || 384),
  );
  const chatMaxMessageLength = Math.min(
    64_000,
    Math.max(256, Number(process.env.CHAT_MAX_MESSAGE_LENGTH) || 8000),
  );

  const documentServiceUrl = (process.env.DOCUMENT_SERVICE_URL || 'http://document-service:3002')
    .replace(/\/+$/, '');

  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: Number(process.env.PORT || 3003),
    host: process.env.HOST || '0.0.0.0',
    jwtSecret: requireEnv('JWT_SECRET'),
    internalApiKey: requireEnv('INTERNAL_API_KEY'),
    auditServiceUrl,
    databaseUrl,
    documentServiceUrl,
    qdrantUrl,
    qdrantApiKey: process.env.QDRANT_API_KEY ? String(process.env.QDRANT_API_KEY).trim() : '',
    qdrantCollection: process.env.QDRANT_COLLECTION || 'scda_ai',
    embeddingDim,
    chatMaxMessageLength,
  };
}

module.exports = { loadEnv, requireEnv };
