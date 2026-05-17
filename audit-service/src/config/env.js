function requireEnv(name) {
  const value = process.env[name];
  if (value === undefined || value === null || String(value).trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return String(value).trim();
}

function loadEnv() {
  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: Number(process.env.PORT || 3004),
    host: process.env.HOST || '0.0.0.0',
    databaseUrl: requireEnv('DATABASE_URL'),
    jwtSecret: requireEnv('JWT_SECRET'),
    internalApiKey: requireEnv('INTERNAL_API_KEY'),
    defaultPageSize: Number(process.env.AUDIT_PAGE_SIZE || 50),
    maxPageSize: Number(process.env.AUDIT_MAX_PAGE_SIZE || 200),
  };
}

module.exports = { loadEnv, requireEnv };
