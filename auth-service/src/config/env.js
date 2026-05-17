function requireEnv(name) {
  const value = process.env[name];
  if (value === undefined || value === null || String(value).trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return String(value).trim();
}

function loadEnv() {
  const auditServiceUrl = (process.env.AUDIT_SERVICE_URL || '').trim();
  const internalApiKey = (process.env.INTERNAL_API_KEY || '').trim();
  const centralAuditEnabled = Boolean(auditServiceUrl && internalApiKey);

  const oauthCallbackBaseUrl = (
    process.env.OAUTH_CALLBACK_BASE_URL || 'https://localhost'
  ).trim();
  const oauthFrontendRedirectUrl = (
    process.env.OAUTH_FRONTEND_REDIRECT_URL || 'https://localhost/oauth/callback'
  ).trim();

  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: Number(process.env.PORT || 3001),
    host: process.env.HOST || '0.0.0.0',
    databaseUrl: requireEnv('DATABASE_URL'),
    jwtSecret: requireEnv('JWT_SECRET'),
    jwtExpiresIn: requireEnv('JWT_EXPIRES_IN'),
    bcryptRounds: Number(process.env.BCRYPT_ROUNDS || 12),
    auditServiceUrl: centralAuditEnabled ? auditServiceUrl : null,
    internalApiKey: centralAuditEnabled ? internalApiKey : null,
    oauthCallbackBaseUrl,
    oauthFrontendRedirectUrl,
    googleClientId: (process.env.GOOGLE_CLIENT_ID || '').trim() || null,
    googleClientSecret: (process.env.GOOGLE_CLIENT_SECRET || '').trim() || null,
    githubClientId: (process.env.GITHUB_CLIENT_ID || '').trim() || null,
    githubClientSecret: (process.env.GITHUB_CLIENT_SECRET || '').trim() || null,
    microsoftClientId: (process.env.MICROSOFT_CLIENT_ID || '').trim() || null,
    microsoftClientSecret: (process.env.MICROSOFT_CLIENT_SECRET || '').trim() || null,
    microsoftTenant: (process.env.MICROSOFT_TENANT || 'common').trim(),
  };
}

module.exports = { loadEnv, requireEnv };
