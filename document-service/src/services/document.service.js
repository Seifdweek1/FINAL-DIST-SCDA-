const path = require('path');
const fs = require('fs/promises');
const crypto = require('crypto');
const prisma = require('../prisma/client');
const { AppError } = require('../errors/AppError');
const { encryptBuffer, decryptBuffer, sha256Buffer } = require('../utils/encryption.util');
const security = require('../utils/security.util');

function canAccess(user, doc) {
  if (!doc) {
    return false;
  }
  if (user.role === 'admin') {
    return true;
  }
  return doc.user_id === user.id;
}

function sanitizeOriginalFilename(name) {
  const base = path.basename(String(name || 'upload'));
  const cleaned = base.replace(/[\x00-\x1f\x7f]/g, '').trim();
  return (cleaned || 'upload').slice(0, 255);
}

function toPublicDocument(doc) {
  return {
    id: doc.id,
    user_id: doc.user_id,
    original_filename: doc.original_filename,
    mime_type: doc.mime_type,
    size: doc.size,
    sha256_hash: doc.sha256_hash,
    status: doc.status,
    created_at: doc.created_at,
    updated_at: doc.updated_at,
  };
}

function createDocumentService(ctx) {
  const {
    uploadDir,
    encryptionKey,
    audit,
    rabbit,
    allowedMimeTypes,
    allowedExtensions,
  } = ctx;

  function absStoragePath(doc) {
    return path.join(uploadDir, ...String(doc.encrypted_path).split('/'));
  }

  async function readStorageBuffer(doc) {
    return fs.readFile(absStoragePath(doc));
  }

  async function getPlaintextBuffer(doc) {
    const raw = await readStorageBuffer(doc);
    if (!doc.sha256_hash) {
      return raw;
    }
    try {
      return decryptBuffer(raw, encryptionKey);
    } catch {
      return raw;
    }
  }

  async function processUpload({ userId, buffer, originalFilename, mimeType, ip }) {
    if (!buffer || !buffer.length) {
      throw new AppError('File is required', 400);
    }

    security.assertAllowedMime(mimeType, allowedMimeTypes);
    security.assertAllowedExtension(originalFilename, allowedExtensions);

    const originalSafe = sanitizeOriginalFilename(originalFilename);
    const mime = String(mimeType || '').toLowerCase();
    const size = buffer.length;
    const hashHex = sha256Buffer(buffer);

    const fileId = crypto.randomUUID();
    const subRel = path.posix.join('enc', fileId.slice(0, 2), fileId.slice(2, 4));
    const storedFilename = `${fileId}.enc`;
    const encryptedRelative = path.posix.join(subRel, storedFilename);

    const cipherBlob = encryptBuffer(buffer, encryptionKey);
    const fileAbs = path.join(uploadDir, ...encryptedRelative.split('/'));
    await fs.mkdir(path.dirname(fileAbs), { recursive: true });

    let doc;
    try {
      await fs.writeFile(fileAbs, cipherBlob, { mode: 0o600 });

      doc = await prisma.document.create({
        data: {
          user_id: userId,
          original_filename: originalSafe,
          stored_filename: storedFilename,
          encrypted_path: encryptedRelative,
          mime_type: mime,
          size,
          sha256_hash: hashHex,
          status: 'uploaded',
        },
      });
    } catch (err) {
      try {
        await fs.unlink(fileAbs);
      } catch {
        /* ignore */
      }
      throw err;
    }

    await audit.log('document.upload.stored', {
      userId,
      documentId: doc.id,
      ip,
      metadata: { mime_type: mime, size },
    });

    try {
      await rabbit.publishDocumentUploaded({
        event: 'document.uploaded',
        documentId: doc.id,
        userId,
        mimeType: mime,
        size,
        sha256: hashHex,
      });
      doc = await prisma.document.update({
        where: { id: doc.id },
        data: { status: 'queued' },
      });
      await audit.log('document.upload.queued', {
        userId,
        documentId: doc.id,
        ip,
      });
    } catch (err) {
      await audit.log('document.upload.queue_failed', {
        userId,
        documentId: doc.id,
        ip,
        metadata: { error: err.name },
      });
    }

    return doc;
  }

  async function listDocuments(user) {
    const where = user.role === 'admin' ? {} : { user_id: user.id };
    return prisma.document.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });
  }

  async function getDocumentById(user, id) {
    const doc = await prisma.document.findUnique({ where: { id } });
    if (!canAccess(user, doc)) {
      throw new AppError('Not found', 404);
    }
    return doc;
  }

  async function verifyDocument(user, id, ip) {
    const doc = await prisma.document.findUnique({ where: { id } });
    if (!canAccess(user, doc)) {
      throw new AppError('Not found', 404);
    }

    const raw = await readStorageBuffer(doc);

    if (!doc.sha256_hash) {
      const computed = sha256Buffer(raw);
      await audit.log('document.verify.legacy', {
        userId: user.id,
        documentId: doc.id,
        ip,
      });
      return {
        legacy: true,
        integrity_valid: true,
        sha256_hash: computed,
        algorithm: 'sha256',
      };
    }

    let plain;
    try {
      plain = decryptBuffer(raw, encryptionKey);
    } catch {
      plain = raw;
    }

    const computedHex = sha256Buffer(plain);
    const expectedBuf = Buffer.from(doc.sha256_hash, 'hex');
    const computedBuf = Buffer.from(computedHex, 'hex');
    const ok =
      expectedBuf.length === computedBuf.length &&
      crypto.timingSafeEqual(expectedBuf, computedBuf);

    await audit.log('document.verify', {
      userId: user.id,
      documentId: doc.id,
      ip,
      metadata: { integrity_valid: ok },
    });

    return {
      legacy: false,
      integrity_valid: ok,
      sha256_hash: doc.sha256_hash,
      algorithm: 'sha256',
    };
  }

  async function downloadDocument(user, id, ip) {
    const doc = await prisma.document.findUnique({ where: { id } });
    if (!canAccess(user, doc)) {
      throw new AppError('Not found', 404);
    }

    const plain = await getPlaintextBuffer(doc);
    await audit.log('document.download', { userId: user.id, documentId: doc.id, ip });
    return { doc, buffer: plain };
  }

  async function deleteDocument(user, id, ip) {
    const doc = await prisma.document.findUnique({ where: { id } });
    if (!canAccess(user, doc)) {
      throw new AppError('Not found', 404);
    }

    const abs = absStoragePath(doc);
    try {
      await fs.unlink(abs);
    } catch (err) {
      if (!err || err.code !== 'ENOENT') {
        throw err;
      }
    }

    await prisma.document.delete({ where: { id } });
    await audit.log('document.delete', { userId: user.id, documentId: doc.id, ip });
    return doc;
  }

  return {
    processUpload,
    listDocuments,
    getDocumentById,
    verifyDocument,
    downloadDocument,
    deleteDocument,
    toPublicDocument,
  };
}

module.exports = { createDocumentService };
