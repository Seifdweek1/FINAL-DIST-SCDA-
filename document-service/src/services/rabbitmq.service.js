const amqp = require('amqplib');

function createRabbitPublisher(config) {
  let connection;
  let channelPromise;

  async function getChannel() {
    if (!channelPromise) {
      channelPromise = (async () => {
        connection = await amqp.connect(config.rabbitmqUrl);
        connection.on('error', () => {
          channelPromise = undefined;
        });
        connection.on('close', () => {
          channelPromise = undefined;
        });
        const ch = await connection.createChannel();
        await ch.assertQueue(config.documentJobsQueue, { durable: true });
        return ch;
      })();
    }
    return channelPromise;
  }

  async function publishDocumentUploaded(payload) {
    const ch = await getChannel();
    const body = Buffer.from(JSON.stringify(payload));
    ch.sendToQueue(config.documentJobsQueue, body, {
      persistent: true,
      contentType: 'application/json',
      headers: { 'x-event': 'document.uploaded' },
    });
  }

  async function close() {
    try {
      if (connection) {
        await connection.close();
      }
    } catch {
      /* ignore */
    } finally {
      connection = undefined;
      channelPromise = undefined;
    }
  }

  return { publishDocumentUploaded, close };
}

module.exports = { createRabbitPublisher };
