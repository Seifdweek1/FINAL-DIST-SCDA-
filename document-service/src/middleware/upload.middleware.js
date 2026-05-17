const multer = require('multer');
const { AppError } = require('../errors/AppError');

function createUploadMiddleware(config) {
  const storage = multer.memoryStorage();

  return multer({
    storage,
    limits: { fileSize: config.maxFileBytes, files: 1 },
    fileFilter: (req, file, cb) => {
      const mime = String(file.mimetype || '').toLowerCase();
      if (!config.allowedMimeTypes.includes(mime)) {
        cb(new AppError('File type not allowed', 415));
        return;
      }
      cb(null, true);
    },
  });
}

function handleUploadErrors(err, req, res, next) {
  if (err instanceof AppError) {
    next(err);
    return;
  }
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      next(new AppError('File too large', 413));
      return;
    }
    next(new AppError('Upload failed', 400));
    return;
  }
  next(err);
}

module.exports = { createUploadMiddleware, handleUploadErrors };
