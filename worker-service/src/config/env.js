function requireEnv(name) {
  const value = process.env[name];
  if (value === undefined || value === null || String(value).trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return String(value).trim();
}

function loadEnv() {
  const embeddingDim = Math.min(
    4096,
    Math.max(32, Number(process.env.EMBEDDING_DIM) || 384),
  );

  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    databaseUrl: requireEnv('DATABASE_URL'),
    rabbitmqUrl: requireEnv('RABBITMQ_URL'),
    internalApiKey: requireEnv('INTERNAL_API_KEY'),
    auditServiceUrl: requireEnv('AUDIT_SERVICE_URL').replace(/\/+$/, ''),
    encryptionKey: requireEnv('ENCRYPTION_KEY'),
    uploadDir: process.env.UPLOAD_DIR || '/app/uploads',
    qdrantUrl: (process.env.QDRANT_URL || 'http://qdrant:6333').replace(/\/+$/, ''),
    qdrantApiKey: process.env.QDRANT_API_KEY ? String(process.env.QDRANT_API_KEY).trim() : '',
    qdrantCollection: process.env.QDRANT_COLLECTION || 'scda_ai',
    embeddingDim,
    chunkSize: Math.min(4000, Math.max(400, Number(process.env.CHUNK_SIZE) || 1000)),
    chunkOverlap: Math.min(500, Math.max(50, Number(process.env.CHUNK_OVERLAP) || 150)),
    documentJobsQueue: process.env.DOCUMENT_JOBS_QUEUE || 'document.jobs',
    documentJobsDlq: process.env.DOCUMENT_JOBS_DLQ || 'document.jobs.dlq',
    prefetch: Number(process.env.RABBIT_PREFETCH || 1),
  };
}

module.exports = { loadEnv, requireEnv };
