const { AppError } = require('../errors/AppError');
const { clientIp } = require('../utils/request.util');

function createDocumentController(documentService) {
  async function upload(req, res, next) {
    try {
      if (!req.file || !req.file.buffer) {
        throw new AppError('File is required', 400);
      }

      const doc = await documentService.processUpload({
        userId: req.user.id,
        buffer: req.file.buffer,
        originalFilename: req.file.originalname,
        mimeType: req.file.mimetype,
        ip: clientIp(req),
      });

      res.status(201).json({ document: documentService.toPublicDocument(doc) });
    } catch (err) {
      next(err);
    }
  }

  async function list(req, res, next) {
    try {
      const docs = await documentService.listDocuments(req.user);
      res.status(200).json({
        documents: docs.map((d) => documentService.toPublicDocument(d)),
      });
    } catch (err) {
      next(err);
    }
  }

  async function getById(req, res, next) {
    try {
      const doc = await documentService.getDocumentById(req.user, req.params.id);
      res.status(200).json({ document: documentService.toPublicDocument(doc) });
    } catch (err) {
      next(err);
    }
  }

  async function verify(req, res, next) {
    try {
      const result = await documentService.verifyDocument(
        req.user,
        req.params.id,
        clientIp(req),
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async function download(req, res, next) {
    try {
      const { doc, buffer } = await documentService.downloadDocument(
        req.user,
        req.params.id,
        clientIp(req),
      );
      const filename = encodeURIComponent(doc.original_filename || 'document');
      res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="download"; filename*=UTF-8''${filename}`,
      );
      res.setHeader('Content-Length', String(buffer.length));
      res.status(200).send(buffer);
    } catch (err) {
      next(err);
    }
  }

  async function deleteById(req, res, next) {
    try {
      const doc = await documentService.deleteDocument(req.user, req.params.id, clientIp(req));
      res.status(200).json({ deleted: true, id: doc.id });
    } catch (err) {
      next(err);
    }
  }

  return { upload, list, getById, verify, download, deleteById };
}

module.exports = { createDocumentController };
