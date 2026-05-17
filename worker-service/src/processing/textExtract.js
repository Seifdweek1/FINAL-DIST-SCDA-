const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { sanitizeForPostgresText } = require('../utils/textSanitize');
const { isReadablePassage } = require('../utils/textQuality');

async function extractDocxText(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return sanitizeForPostgresText(String(result.value || '').trim());
}

async function extractOfficeText(buffer) {
  try {
    const officeParser = require('officeparser');
    const parseFn =
      typeof officeParser.parseOfficeAsync === 'function'
        ? officeParser.parseOfficeAsync
        : officeParser.default?.parseOfficeAsync;
    if (!parseFn) return '';
    const text = await parseFn(buffer);
    return sanitizeForPostgresText(String(text || '').trim());
  } catch {
    return '';
  }
}

/**
 * Extract searchable plain text from decrypted file bytes.
 */
async function extractTextFromBuffer(buffer, mimeType, filename) {
  const mime = String(mimeType || '').toLowerCase();
  const name = String(filename || '').toLowerCase();

  if (mime.startsWith('text/') || name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.csv')) {
    return { text: sanitizeForPostgresText(buffer.toString('utf8')), method: 'utf8' };
  }

  if (mime === 'application/pdf' || name.endsWith('.pdf')) {
    try {
      const parsed = await pdfParse(buffer);
      const text = sanitizeForPostgresText(String(parsed.text || '').trim());
      if (text.length > 0 && isReadablePassage(text, { minLen: 40 })) {
        return { text, method: 'pdf-parse', pages: parsed.numpages || null };
      }
      if (text.length > 0) {
        return { text: '', method: 'pdf-parse-garbage', warning: 'PDF text failed readability checks (scanned or encoded PDF)' };
      }
      return { text: '', method: 'pdf-parse-empty', warning: 'PDF contained no extractable text' };
    } catch (err) {
      return { text: '', method: 'pdf-parse-failed', error: err.message };
    }
  }

  if (name.endsWith('.docx') || mime.includes('wordprocessingml')) {
    try {
      const text = await extractDocxText(buffer);
      if (text.length > 0 && isReadablePassage(text, { minLen: 40 })) {
        return { text, method: 'mammoth-docx' };
      }
      if (text.length > 0) {
        return { text: '', method: 'docx-garbage', warning: 'DOCX text failed readability checks' };
      }
      return { text: '', method: 'docx-empty', warning: 'DOCX contained no extractable text' };
    } catch (err) {
      return { text: '', method: 'docx-failed', error: err.message };
    }
  }

  if (name.endsWith('.pptx') || mime.includes('presentationml')) {
    try {
      const text = await extractOfficeText(buffer);
      if (text.length > 0 && isReadablePassage(text, { minLen: 40 })) {
        return { text, method: 'officeparser-pptx' };
      }
      if (text.length > 0) {
        return { text: '', method: 'pptx-garbage', warning: 'PPTX text failed readability checks' };
      }
      return { text: '', method: 'pptx-empty', warning: 'PPTX contained no extractable text' };
    } catch (err) {
      return { text: '', method: 'pptx-failed', error: err.message };
    }
  }

  if (mime.includes('word') || name.endsWith('.doc') || mime === 'application/msword') {
    try {
      const text = await extractOfficeText(buffer);
      if (text.length > 0 && isReadablePassage(text, { minLen: 40 })) {
        return { text, method: 'officeparser-doc' };
      }
    } catch {
      /* fall through */
    }
    return {
      text: '',
      method: 'doc-legacy',
      warning: 'Legacy .doc files may have limited extraction. Prefer DOCX or PDF when possible.',
    };
  }

  const utf8 = buffer.toString('utf8');
  const printable =
    utf8.length > 0 ? (utf8.match(/[\x20-\x7e\n\r\t]/g) || []).length / utf8.length : 0;
  if (printable > 0.85 && isReadablePassage(utf8, { minLen: 40 })) {
    return { text: sanitizeForPostgresText(utf8), method: 'utf8-heuristic' };
  }

  return { text: '', method: 'unsupported', warning: `Unsupported type for text extraction: ${mime || name}` };
}

module.exports = { extractTextFromBuffer };
