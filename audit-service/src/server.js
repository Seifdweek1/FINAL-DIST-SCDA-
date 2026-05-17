require('dotenv').config();

const { createApp } = require('./app');
const { loadEnv } = require('./config/env');
const prisma = require('./prisma/client');

let config;
try {
  config = loadEnv();
} catch (err) {
  console.error(err.message || err);
  process.exit(1);
}

const app = createApp(config);
const { port, host } = config;

const server = app.listen(port, host, () => {
  console.log(`audit-service listening on http://${host}:${port}`);
});

async function shutdown() {
  await new Promise((resolve) => {
    server.close(resolve);
  });
  await prisma.$disconnect();
  process.exit(0);
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
