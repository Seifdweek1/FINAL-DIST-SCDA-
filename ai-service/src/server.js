require('dotenv').config();

const path = require('path');
const { spawnSync } = require('child_process');
const { loadEnv } = require('./config/env');
const { getPrisma } = require('./prisma/client');
const { createQdrantClient } = require('./services/qdrant.client');
const { createApp } = require('./app');

function runMigrations() {
  const root = path.join(__dirname, '..');
  const prismaBin = path.join(root, 'node_modules', '.bin', 'prisma');
  const result = spawnSync(prismaBin, ['migrate', 'deploy'], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error('Prisma migrate deploy failed for ai-service');
  }
}

async function main() {
  const config = loadEnv();
  runMigrations();

  const prisma = getPrisma();
  const qdrant = createQdrantClient(config);

  await qdrant.ensureCollection();

  const app = createApp(config, { qdrant, prisma });
  const port = config.port;
  const host = config.host;

  app.listen(port, host, () => {
    console.log(
      `ai-service listening on http://${host}:${port} (collection=${qdrant.collectionName}, chat=enabled)`,
    );
  });
}

main().catch((err) => {
  console.error('ai-service failed to start', err);
  process.exit(1);
});
