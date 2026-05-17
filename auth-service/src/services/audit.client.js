function createAuditClient(config) {
  const base = String(config.auditServiceUrl || '').replace(/\/+$/, '');
  const url = `${base}/api/audit/log`;

  async function logEntry(payload) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Api-Key': config.internalApiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const err = new Error(`Audit service error: ${res.status}`);
      err.status = res.status;
      err.body = text;
      throw err;
    }

    return res.json().catch(() => ({}));
  }

  return { logEntry };
}

/** Never throws — audit failures must not mask API responses. */
async function safeAudit(client, payload) {
  if (!client) return;
  try {
    await client.logEntry(payload);
  } catch (e) {
    console.error('auth-service: audit log failed', e.message);
  }
}

module.exports = { createAuditClient, safeAudit };
