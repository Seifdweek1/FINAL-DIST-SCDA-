const PROVIDER_IDS = ['google', 'github', 'microsoft'];

function isOAuthProvider(id) {
  return PROVIDER_IDS.includes(String(id || '').toLowerCase());
}

function getProviderConfig(providerId, config) {
  const id = String(providerId || '').toLowerCase();
  const callbackBase = config.oauthCallbackBaseUrl.replace(/\/+$/, '');

  const base = {
    id,
    callbackUrl: `${callbackBase}/api/auth/oauth/${id}/callback`,
  };

  if (id === 'google') {
    if (!config.googleClientId || !config.googleClientSecret) return null;
    return {
      ...base,
      name: 'Google',
      clientId: config.googleClientId,
      clientSecret: config.googleClientSecret,
      authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
      scope: 'openid email profile',
    };
  }

  if (id === 'github') {
    if (!config.githubClientId || !config.githubClientSecret) return null;
    return {
      ...base,
      name: 'GitHub',
      clientId: config.githubClientId,
      clientSecret: config.githubClientSecret,
      authorizeUrl: 'https://github.com/login/oauth/authorize',
      tokenUrl: 'https://github.com/login/oauth/access_token',
      userInfoUrl: 'https://api.github.com/user',
      emailsUrl: 'https://api.github.com/user/emails',
      scope: 'read:user user:email',
    };
  }

  if (id === 'microsoft') {
    if (!config.microsoftClientId || !config.microsoftClientSecret) return null;
    const tenant = config.microsoftTenant || 'common';
    return {
      ...base,
      name: 'Microsoft',
      clientId: config.microsoftClientId,
      clientSecret: config.microsoftClientSecret,
      authorizeUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`,
      tokenUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
      userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
      scope: 'openid profile email User.Read',
    };
  }

  return null;
}

function listEnabledProviders(config) {
  return PROVIDER_IDS.map((id) => getProviderConfig(id, config)).filter(Boolean);
}

module.exports = {
  PROVIDER_IDS,
  isOAuthProvider,
  getProviderConfig,
  listEnabledProviders,
};
