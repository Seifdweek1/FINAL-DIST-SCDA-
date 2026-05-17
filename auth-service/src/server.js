require('dotenv').config();

const { createApp } = require('./app');
const { loadEnv } = require('./config/env');

const config = loadEnv();
const app = createApp(config);

const { port, host } = config;

app.listen(port, host, () => {
  console.log(`auth-service listening on http://${host}:${port}`);
});
