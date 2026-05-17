const { createAuthService } = require('../services/auth.service');
const { clientIp } = require('../utils/request.util');

function createAuthController(config, auditClient) {
  const authService = createAuthService(config, auditClient);

  async function register(req, res, next) {
    try {
      const { email, password } = req.body;
      const ip = clientIp(req);
      const user = await authService.register({ email, password, ip });
      return res.status(201).json({ user });
    } catch (err) {
      return next(err);
    }
  }

  async function login(req, res, next) {
    try {
      const { email, password } = req.body;
      const ip = clientIp(req);
      const result = await authService.login({ email, password, ip });
      return res.status(200).json(result);
    } catch (err) {
      return next(err);
    }
  }

  function profile(req, res) {
    return res.status(200).json({ user: req.user });
  }

  function admin(req, res) {
    return res.status(200).json({
      message: 'Admin access granted',
      user: req.user,
    });
  }

  return { register, login, profile, admin };
}

module.exports = { createAuthController };
