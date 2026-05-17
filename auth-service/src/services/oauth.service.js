const prisma = require('../prisma/client');
const { AppError } = require('../errors/AppError');
const { toPublicUser } = require('../utils/userPublic.util');
const { safeAudit } = require('./audit.client');
const { buildLoginResult } = require('./loginResult.util');
const { createOAuthState, verifyOAuthState } = require('../oauth/state.util');
const { getProviderConfig, listEnabledProviders, isOAuthProvider } = require('../oauth/providers');

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const msg = data.error_description || data.error || data.message || res.statusText;
    throw new AppError(`OAuth provider error: ${msg}`, 502);
  }
  return data;
}

function buildAuthorizeUrl(provider, state) {
  const params = new URLSearchParams({
    client_id: provider.clientId,
    redirect_uri: provider.callbackUrl,
    response_type: 'code',
    scope: provider.scope,
    state,
  });
  if (provider.id === 'google') {
    params.set('access_type', 'online');
    params.set('prompt', 'select_account');
  }
  return `${provider.authorizeUrl}?${params.toString()}`;
}

async function exchangeCode(provider, code) {
  const body = new URLSearchParams({
    client_id: provider.clientId,
    client_secret: provider.clientSecret,
    code,
    redirect_uri: provider.callbackUrl,
    grant_type: 'authorization_code',
  });

  const headers = { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' };
  const tokenData = await fetchJson(provider.tokenUrl, { method: 'POST', headers, body });
  return tokenData.access_token;
}

async function fetchProviderProfile(provider, accessToken) {
  if (provider.id === 'google') {
    const profile = await fetchJson(provider.userInfoUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return {
      providerAccountId: String(profile.sub),
      email: profile.email,
      emailVerified: profile.email_verified !== false,
    };
  }

  if (provider.id === 'github') {
    const profile = await fetchJson(provider.userInfoUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'SCDA-Auth',
      },
    });
    let email = profile.email;
    if (!email && provider.emailsUrl) {
      const emails = await fetchJson(provider.emailsUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'SCDA-Auth',
        },
      });
      const primary = Array.isArray(emails)
        ? emails.find((e) => e.primary && e.verified) || emails.find((e) => e.verified)
        : null;
      email = primary?.email || null;
    }
    return {
      providerAccountId: String(profile.id),
      email,
      emailVerified: Boolean(email),
    };
  }

  if (provider.id === 'microsoft') {
    const profile = await fetchJson(provider.userInfoUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const email = profile.mail || profile.userPrincipalName || null;
    return {
      providerAccountId: String(profile.id),
      email,
      emailVerified: Boolean(email),
    };
  }

  throw new AppError('Unsupported OAuth provider', 400);
}

async function findOrCreateUserFromOAuth({ providerId, providerAccountId, email }) {
  const normalizedEmail = String(email || '')
    .trim()
    .toLowerCase();

  const existingOAuth = await prisma.oAuthAccount.findUnique({
    where: {
      provider_provider_account_id: {
        provider: providerId,
        provider_account_id: providerAccountId,
      },
    },
    include: { user: true },
  });
  if (existingOAuth) {
    return existingOAuth.user;
  }

  if (normalizedEmail) {
    const byEmail = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (byEmail) {
      await prisma.oAuthAccount.create({
        data: {
          provider: providerId,
          provider_account_id: providerAccountId,
          user_id: byEmail.id,
        },
      });
      return byEmail;
    }
  }

  if (!normalizedEmail) {
    throw new AppError(
      'Could not obtain an email from the provider. Use a public email on your account or register with email/password.',
      400,
    );
  }

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      password_hash: null,
      oauth_accounts: {
        create: {
          provider: providerId,
          provider_account_id: providerAccountId,
        },
      },
    },
  });
  return user;
}

function createOAuthService(config, auditClient) {
  function getEnabledProviders() {
    return listEnabledProviders(config).map((p) => ({ id: p.id, name: p.name }));
  }

  function startRedirect(providerId) {
    if (!isOAuthProvider(providerId)) {
      throw new AppError('Unknown OAuth provider', 404);
    }
    const provider = getProviderConfig(providerId, config);
    if (!provider) {
      throw new AppError(`${providerId} OAuth is not configured on this server`, 503);
    }
    const state = createOAuthState(provider.id, config.jwtSecret);
    return { url: buildAuthorizeUrl(provider, state), state };
  }

  async function handleCallback({ providerId, code, state, ip }) {
    if (!code) {
      throw new AppError('Missing authorization code', 400);
    }
    if (!isOAuthProvider(providerId)) {
      throw new AppError('Unknown OAuth provider', 404);
    }

    try {
      verifyOAuthState(state, providerId, config.jwtSecret);
    } catch {
      throw new AppError('Invalid or expired OAuth state', 400);
    }

    const provider = getProviderConfig(providerId, config);
    if (!provider) {
      throw new AppError(`${providerId} OAuth is not configured`, 503);
    }

    const accessToken = await exchangeCode(provider, code);
    const profile = await fetchProviderProfile(provider, accessToken);

    if (!profile.emailVerified && provider.id !== 'github') {
      throw new AppError('Email address is not verified with the provider', 400);
    }

    const user = await findOrCreateUserFromOAuth({
      providerId: provider.id,
      providerAccountId: profile.providerAccountId,
      email: profile.email,
    });

    const login = buildLoginResult(user, config);

    await safeAudit(auditClient, {
      service: 'auth-service',
      action: 'auth.oauth.login.success',
      status: 'success',
      user_id: user.id,
      ip_address: ip || null,
      details: { provider: provider.id },
    });

    return login;
  }

  function buildFrontendRedirect(loginResult, errorMessage) {
    const base = config.oauthFrontendRedirectUrl.replace(/\/+$/, '');
    if (errorMessage) {
      const params = new URLSearchParams({ error: errorMessage });
      return `${base}?${params.toString()}`;
    }
    const hash = new URLSearchParams({
      access_token: loginResult.access_token,
      token_type: loginResult.token_type,
      expires_in: String(loginResult.expires_in ?? ''),
    });
    return `${base}#${hash.toString()}`;
  }

  return {
    getEnabledProviders,
    startRedirect,
    handleCallback,
    buildFrontendRedirect,
  };
}

module.exports = { createOAuthService };
