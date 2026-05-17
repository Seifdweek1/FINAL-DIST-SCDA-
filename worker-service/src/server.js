require('dotenv').config();

const prisma = require('./prisma/client');
const { loadEnv } = require('./config/env');
const { createAuditClient } = require('./services/audit.client');
const { createQdrantClient } = require('./services/qdrant.client');
const { createConsumer } = require('./services/rabbit.consumer');

let config;
try {
  config = loadEnv();
} catch (err) {
  console.error(err.message || err);
  process.exit(1);
}

const auditClient = createAuditClient(config);
const qdrant = createQdrantClient(config);
const consumer = createConsumer(config, auditClient, qdrant);

async function main() {
  await qdrant.ensureCollection();
  console.log(`worker-service Qdrant collection=${qdrant.collectionName} dim=${config.embeddingDim}`);
  await consumer.start();
}

main().catch((err) => {
  console.error('worker-service failed to start', err);
  process.exit(1);
});

async function shutdown() {
  try {
    await consumer.close();
  } catch {
    /* ignore */
  }
  await prisma.$disconnect();
  process.exit(0);
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
