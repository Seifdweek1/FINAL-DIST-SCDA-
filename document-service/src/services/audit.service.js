const fs = require('fs/promises');
const path = require('path');

async function appendAuditLine(auditLogFile, record) {
  try {
    await fs.mkdir(path.dirname(auditLogFile), { recursive: true });
    const line = `${JSON.stringify(record)}\n`;
    await fs.appendFile(auditLogFile, line, { encoding: 'utf8' });
  } catch (err) {
    console.error('audit log write failed', { code: err.code });
  }
}

function centralStatusForAction(action) {
  const a = String(action || '').toLowerCase();
  if (a.includes('failed') || a.includes('queue_failed')) {
    return 'failure';
  }
  return 'success';
}

function createAuditService(config, centralAudit) {
  const file = config.auditLogFile;

  function log(action, { userId, documentId, ip, metadata } = {}) {
    const record = {
      ts: new Date().toISOString(),
      service: 'document-service',
      action,
      userId: userId || null,
      documentId: documentId || null,
      ip: ip || null,
      metadata: metadata || null,
    };
    const p = appendAuditLine(file, record);

    if (centralAudit) {
      const details = {
        document_id: documentId || null,
        ...(metadata && typeof metadata === 'object' ? metadata : {}),
      };
      void p
        .then(() =>
          centralAudit.logEntry({
            service: 'document-service',
            action,
            status: centralStatusForAction(action),
            user_id: userId || null,
            ip_address: ip || null,
            details,
          }),
        )
        .catch((e) => console.error('document-service: central audit failed', e.message));
    }

    return p;
  }

  return { log };
}

module.exports = { createAuditService };