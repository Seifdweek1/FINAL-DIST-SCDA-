const pdfParse = require('pdf-parse');
const { sanitizeForPostgresText } = require('../utils/textSanitize');
const { isReadablePassage, cleanPassage } = require('../utils/textQuality');

/**
 * Fetch decrypted document bytes from document-service using the end-user JWT.
 */
async function downloadDocumentBuffer(config, bearerToken, documentId) {
  const base = config.documentServiceUrl;
  if (!base || !bearerToken) {
    return { error: 'document_service_unconfigured' };
  }

  const url = `${base.replace(/\/+$/, '')}/api/documents/${encodeURIComponent(documentId)}/download`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${bearerToken}` },
  });

  if (res.status === 404) {
    return { error: 'not_found' };
  }
  if (res.status === 401 || res.status === 403) {
    return { error: 'forbidden' };
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return { error: 'fetch_failed', detail: text.slice(0, 200) };
  }

  const arrayBuf = await res.arrayBuffer();
  return { buffer: Buffer.from(arrayBuf) };
}

/**
 * Extract searchable plain text from decrypted file bytes (same approach as worker).
 */
async function bufferToSearchableText(buffer, mimeType, filename) {
  const mime = String(mimeType || '').toLowerCase();
  const name = String(filename || '').toLowerCase();

  if (mime.startsWith('text/') || name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.csv')) {
    const text = sanitizeForPostgresText(buffer.toString('utf8'));
    return isReadablePassage(text, { minLen: 20 }) ? text : '';
  }

  if (mime === 'application/pdf' || name.endsWith('.pdf')) {
    try {
      const parsed = await pdfParse(buffer);
      const text = sanitizeForPostgresText(String(parsed.text || '').trim());
      if (isReadablePassage(text, { minLen: 40 })) {
        return text;
      }
    } catch {
      /* fall through */
    }
    return '';
  }

  const utf8 = buffer.toString('utf8');
  const text = sanitizeForPostgresText(utf8);
  if (isReadablePassage(text, { minLen: 40 })) {
    return text;
  }
  return '';
}

module.exports = { downloadDocumentBuffer, bufferToSearchableText, cleanPassage };
