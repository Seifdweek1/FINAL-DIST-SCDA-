function isUuid(value) {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

/**
 * @returns {{ ok: true, job: object } | { ok: false, reason: string }}
 */
function parseDocumentJob(content) {
  let parsed;
  try {
    const text = content.toString('utf8');
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'invalid_json' };
  }

  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, reason: 'not_object' };
  }

  if (parsed.event !== 'document.uploaded') {
    return { ok: false, reason: 'unknown_event' };
  }

  if (!isUuid(parsed.documentId)) {
    return { ok: false, reason: 'invalid_document_id' };
  }

  return { ok: true, job: parsed };
}

module.exports = { parseDocumentJob };
