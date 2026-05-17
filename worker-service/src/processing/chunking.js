/**
 * Split long text into overlapping chunks for embedding.
 */
function chunkText(text, options = {}) {
  const chunkSize = Number(options.chunkSize) || 1000;
  const overlap = Number(options.overlap) || 150;
  const normalized = String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!normalized) return [];

  const chunks = [];
  let start = 0;
  let index = 0;

  while (start < normalized.length) {
    let end = Math.min(start + chunkSize, normalized.length);
    if (end < normalized.length) {
      const window = normalized.slice(start, end);
      const lastBreak = Math.max(
        window.lastIndexOf('\n\n'),
        window.lastIndexOf('. '),
        window.lastIndexOf('? '),
        window.lastIndexOf('! '),
      );
      if (lastBreak > chunkSize * 0.4) {
        end = start + lastBreak + 1;
      }
    }

    const content = normalized.slice(start, end).trim();
    if (content.length >= 40) {
      chunks.push({ chunk_index: index, content });
      index += 1;
    }

    if (end >= normalized.length) break;
    start = Math.max(end - overlap, start + 1);
  }

  return chunks;
}

module.exports = { chunkText };
