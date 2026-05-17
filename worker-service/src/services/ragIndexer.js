const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { parseEncryptionKey, decryptBuffer } = require('../utils/encryption.util');
const { extractTextFromBuffer } = require('../processing/textExtract');
const { chunkText } = require('../processing/chunking');
const { embedText } = require('./embedding.service');
const documentRepo = require('./document.repository');
const chunkRepo = require('./documentChunk.repository');

function absStoragePath(uploadDir, encryptedRelative) {
  return path.join(uploadDir, ...String(encryptedRelative).split('/'));
}

/**
 * Full RAG ingest: decrypt → extract → chunk → PostgreSQL chunks → Qdrant vectors.
 */
async function indexDocumentForRag({ config, qdrant, auditClient, documentId, userId }) {
  const doc = await documentRepo.findDocument(documentId);
  if (!doc) {
    throw new Error('document_not_found');
  }

  const encryptionKey = parseEncryptionKey(config.encryptionKey);
  const filePath = absStoragePath(config.uploadDir, doc.encrypted_path);
  const cipherBuf = await fs.readFile(filePath);
  const plainBuf = decryptBuffer(cipherBuf, encryptionKey);

  const extracted = await extractTextFromBuffer(plainBuf, doc.mime_type, doc.original_filename);

  await auditClient.logEntry({
    service: 'worker-service',
    action: 'document.text.extracted',
    status: extracted.text?.length ? 'success' : 'warning',
    user_id: doc.user_id,
    ip_address: null,
    details: {
      documentId,
      method: extracted.method,
      char_count: extracted.text?.length || 0,
      warning: extracted.warning || null,
      error: extracted.error || null,
    },
  });

  const text = String(extracted.text || '').trim();
  if (text.length < 40) {
    const reason = extracted.warning || extracted.error || 'no_extractable_text';
    await documentRepo.setStatus(documentId, 'failed');
    await auditClient.logEntry({
      service: 'worker-service',
      action: 'document.indexing.failed',
      status: 'error',
      user_id: doc.user_id,
      ip_address: null,
      details: { documentId, reason },
    });
    return { ok: false, reason };
  }

  const chunks = chunkText(text, {
    chunkSize: config.chunkSize,
    overlap: config.chunkOverlap,
  });

  if (!chunks.length) {
    await documentRepo.setStatus(documentId, 'failed');
    await auditClient.logEntry({
      service: 'worker-service',
      action: 'document.indexing.failed',
      status: 'error',
      user_id: doc.user_id,
      ip_address: null,
      details: { documentId, reason: 'chunking_produced_no_segments' },
    });
    return { ok: false, reason: 'chunking_produced_no_segments' };
  }

  await auditClient.logEntry({
    service: 'worker-service',
    action: 'document.chunks.created',
    status: 'success',
    user_id: doc.user_id,
    ip_address: null,
    details: { documentId, chunk_count: chunks.length },
  });

  await auditClient.logEntry({
    service: 'worker-service',
    action: 'document.indexing.started',
    status: 'success',
    user_id: doc.user_id,
    ip_address: null,
    details: { documentId, chunk_count: chunks.length },
  });

  await chunkRepo.deleteChunksForDocument(documentId);
  try {
    await qdrant.deletePointsForDocument(documentId);
  } catch (err) {
    console.warn('worker: qdrant delete old points', err.message);
  }

  const documentName = doc.original_filename;
  const now = new Date().toISOString();
  const qdrantPoints = [];
  const dbRows = [];

  for (const chunk of chunks) {
    const pointId = crypto.randomUUID();
    const vector = embedText(chunk.content, config.embeddingDim);
    const preview = chunk.content.slice(0, 500);

    qdrantPoints.push({
      id: pointId,
      vector,
      payload: {
        user_id: doc.user_id,
        document_id: documentId,
        document_name: documentName,
        chunk_index: chunk.chunk_index,
        content: chunk.content,
        text_preview: preview,
        created_at: now,
      },
    });

    dbRows.push({
      document_id: documentId,
      user_id: doc.user_id,
      chunk_index: chunk.chunk_index,
      content: chunk.content,
      qdrant_point_id: pointId,
    });
  }

  await chunkRepo.insertChunks(dbRows);
  await qdrant.upsertPoints(qdrantPoints);

  await documentRepo.setStatus(documentId, 'indexed');
  await documentRepo.setStatus(documentId, 'ready');

  await auditClient.logEntry({
    service: 'worker-service',
    action: 'document.indexing.completed',
    status: 'success',
    user_id: doc.user_id,
    ip_address: null,
    details: {
      documentId,
      chunk_count: chunks.length,
      qdrant_points: qdrantPoints.length,
      collection: qdrant.collectionName,
    },
  });

  return { ok: true, chunk_count: chunks.length };
}

module.exports = { indexDocumentForRag };
