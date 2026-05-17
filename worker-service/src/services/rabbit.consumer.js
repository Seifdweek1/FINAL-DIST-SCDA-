const amqp = require('amqplib');
const { parseDocumentJob } = require('../messages/parseJob');
const documentRepo = require('./document.repository');
const { createAuditClient } = require('./audit.client');
const { indexDocumentForRag } = require('./ragIndexer');

function createDlqPayload(originalContent, reason, extra) {
  return Buffer.from(
    JSON.stringify({
      reason,
      captured_at: new Date().toISOString(),
      extra: extra || null,
      original: originalContent.toString('utf8').slice(0, 32_000),
    }),
    'utf8',
  );
}

function createConsumer(config, auditClient, qdrant) {
  let connection;
  let channel;

  async function publishDlq(rawContent, reason, extra) {
    if (!channel) return;
    const body = createDlqPayload(rawContent, reason, extra);
    channel.sendToQueue(config.documentJobsDlq, body, { persistent: true });
  }

  async function processMessage(msg) {
    const raw = msg.content;
    const parsed = parseDocumentJob(raw);
    if (!parsed.ok) {
      console.warn('worker: malformed message', parsed.reason);
      await publishDlq(raw, `malformed:${parsed.reason}`, { reason: parsed.reason });
      return;
    }

    const { documentId, userId, mimeType, size, sha256 } = parsed.job;

    const existing = await documentRepo.findDocument(documentId);
    if (!existing) {
      console.warn('worker: document not found', documentId);
      await publishDlq(raw, 'document_not_found', { documentId });
      return;
    }

    if (existing.status === 'ready') {
      console.info('worker: duplicate job for already-indexed document', documentId);
      await auditClient.logEntry({
        service: 'worker-service',
        action: 'worker.document.duplicate',
        status: 'skipped',
        user_id: userId || null,
        ip_address: null,
        details: { documentId },
      });
      return;
    }

    if (existing.status === 'failed') {
      console.warn('worker: document in failed state, sending to DLQ', documentId);
      await publishDlq(raw, 'document_failed_state', { documentId, status: existing.status });
      return;
    }

    await documentRepo.setStatus(documentId, 'processing');

    await auditClient.logEntry({
      service: 'worker-service',
      action: 'worker.document.processing.started',
      status: 'success',
      user_id: userId || existing.user_id,
      ip_address: null,
      details: { documentId, mimeType, size, sha256 },
    });

    const result = await indexDocumentForRag({
      config,
      qdrant,
      auditClient,
      documentId,
      userId: userId || existing.user_id,
    });

    if (!result.ok) {
      throw new Error(result.reason || 'indexing_failed');
    }

    await auditClient.logEntry({
      service: 'worker-service',
      action: 'worker.document.processing.completed',
      status: 'success',
      user_id: userId || existing.user_id,
      ip_address: null,
      details: {
        documentId,
        chunk_count: result.chunk_count,
      },
    });
  }

  async function handleDelivery(msg) {
    if (!msg) return;
    try {
      await processMessage(msg);
      channel.ack(msg);
    } catch (err) {
      console.error('worker: processing error', { name: err.name, message: err.message });

      const redelivered = Boolean(msg.fields.redelivered);
      if (!redelivered) {
        channel.nack(msg, false, true);
        return;
      }

      try {
        await publishDlq(msg.content, 'processing_failed', {
          message: err.message,
          name: err.name,
        });
      } catch (dlqErr) {
        console.error('worker: DLQ publish failed', dlqErr.message);
      }

      try {
        const parsed = parseDocumentJob(msg.content);
        if (parsed.ok) {
          await documentRepo.setStatus(parsed.job.documentId, 'failed');
          await auditClient.logEntry({
            service: 'worker-service',
            action: 'document.indexing.failed',
            status: 'error',
            user_id: parsed.job.userId || null,
            ip_address: null,
            details: { documentId: parsed.job.documentId, message: err.message },
          });
        }
      } catch {
        /* ignore */
      }

      channel.ack(msg);
    }
  }

  async function start() {
    connection = await amqp.connect(config.rabbitmqUrl);
    connection.on('error', (err) => {
      console.error('worker: rabbit connection error', err.message);
    });
    connection.on('close', () => {
      console.warn('worker: rabbit connection closed');
    });

    channel = await connection.createChannel();
    await channel.assertQueue(config.documentJobsQueue, { durable: true });
    await channel.assertQueue(config.documentJobsDlq, { durable: true });
    await channel.prefetch(config.prefetch);

    await channel.consume(config.documentJobsQueue, handleDelivery, { noAck: false });

    console.log(
      `worker-service consuming queue=${config.documentJobsQueue} dlq=${config.documentJobsDlq} (RAG indexing enabled)`,
    );
  }

  async function close() {
    try {
      if (channel) await channel.close();
    } catch {
      /* ignore */
    }
    try {
      if (connection) await connection.close();
    } catch {
      /* ignore */
    }
  }

  return { start, close };
}

module.exports = { createConsumer };
