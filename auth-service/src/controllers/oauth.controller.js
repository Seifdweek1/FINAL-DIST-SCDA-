const { createOAuthService } = require('../services/oauth.service');
const { clientIp } = require('../utils/request.util');

function createOAuthController(config, auditClient) {
  const oauthService = createOAuthService(config, auditClient);

  function listProviders(req, res) {
    return res.json({ providers: oauthService.getEnabledProviders() });
  }

  function start(req, res, next) {
    try {
      const { provider } = req.params;
      const { url } = oauthService.startRedirect(provider);
      return res.redirect(302, url);
    } catch (err) {
      return next(err);
    }
  }

  async function callback(req, res, next) {
    const { provider } = req.params;
    const ip = clientIp(req);
    const providerError = req.query.error_description || req.query.error;

    if (providerError) {
      const redirectUrl = oauthService.buildFrontendRedirect(null, String(providerError));
      return res.redirect(302, redirectUrl);
    }

    try {
      const login = await oauthService.handleCallback({
        providerId: provider,
        code: req.query.code,
        state: req.query.state,
        ip,
      });
      const redirectUrl = oauthService.buildFrontendRedirect(login);
      return res.redirect(302, redirectUrl);
    } catch (err) {
      const message = err.message || 'OAuth sign-in failed';
      const redirectUrl = oauthService.buildFrontendRedirect(null, message);
      return res.redirect(302, redirectUrl);
    }
  }

  return { listProviders, start, callback };
}

module.exports = { createOAuthController };
