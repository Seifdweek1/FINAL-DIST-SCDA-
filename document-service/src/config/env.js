const fs = require('fs');
const path = require('path');

function requireEnv(name) {
  const value = process.env[name];
  if (value === undefined || value === null || String(value).trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return String(value).trim();
}

function parseEncryptionKeyHex(hex) {
  const s = String(hex).trim();
  if (!/^[0-9a-fA-F]{64}$/.test(s)) {
    throw new Error('ENCRYPTION_KEY must be exactly 64 hexadecimal characters (32 bytes for AES-256-GCM)');
  }
  return Buffer.from(s, 'hex');
}

function parseCommaList(raw, fallback) {
  const list = String(raw || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.length ? list : fallback;
}

function parseAllowedMimeTypes(raw) {
  return parseCommaList(raw, [
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ]);
}

function parseAllowedExtensions(raw) {
  const list = parseCommaList(raw, ['.pdf', '.txt', '.doc', '.docx', '.pptx']);
  return list.map((e) => (e.startsWith('.') ? e : `.${e}`));
}

function loadEnv() {
  const uploadDir = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'));
  const maxFileBytes = Number(
    process.env.MAX_FILE_SIZE || process.env.MAX_FILE_BYTES || 20 * 1024 * 1024,
  );

  if (!Number.isFinite(maxFileBytes) || maxFileBytes < 1) {
    throw new Error('MAX_FILE_SIZE must be a positive number');
  }

  const auditLogFile = path.resolve(
    process.env.AUDIT_LOG_FILE || path.join(uploadDir, '.audit', 'documents.jsonl'),
  );

  const auditServiceUrl = (process.env.AUDIT_SERVICE_URL || '').trim();
  const internalApiKeyRaw = (process.env.INTERNAL_API_KEY || '').trim();
  const centralAuditEnabled = Boolean(auditServiceUrl && internalApiKeyRaw);

  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: Number(process.env.PORT || 3002),
    host: process.env.HOST || '0.0.0.0',
    jwtSecret: requireEnv('JWT_SECRET'),
    databaseUrl: requireEnv('DATABASE_URL'),
    rabbitmqUrl: requireEnv('RABBITMQ_URL'),
    encryptionKey: parseEncryptionKeyHex(requireEnv('ENCRYPTION_KEY')),
    documentJobsQueue: process.env.DOCUMENT_JOBS_QUEUE || 'document.jobs',
    uploadDir,
    maxFileBytes,
    allowedMimeTypes: parseAllowedMimeTypes(process.env.ALLOWED_MIME_TYPES),
    allowedExtensions: parseAllowedExtensions(process.env.ALLOWED_EXTENSIONS),
    auditLogFile,
    auditServiceUrl: centralAuditEnabled ? auditServiceUrl : null,
    internalApiKey: centralAuditEnabled ? internalApiKeyRaw : null,
  };
}

function ensureUploadDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function ensureParentDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

module.exports = { loadEnv, requireEnv, ensureUploadDir, ensureParentDir };
