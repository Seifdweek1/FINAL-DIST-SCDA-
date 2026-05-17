const prisma = require('../prisma/client');
const { hashPassword, verifyPassword } = require('../utils/password.util');
const { toPublicUser } = require('../utils/userPublic.util');
const { AppError } = require('../errors/AppError');
const { findByEmail } = require('./user.service');
const { safeAudit } = require('./audit.client');
const { buildLoginResult } = require('./loginResult.util');

function createAuthService(config, auditClient) {
  async function register({ email, password, ip }) {
    const existing = await findByEmail(email);
    if (existing) {
      throw new AppError('Email already registered', 409);
    }

    const password_hash = await hashPassword(password, config.bcryptRounds);

    try {
      const user = await prisma.user.create({
        data: {
          email,
          password_hash,
        },
        select: {
          id: true,
          email: true,
          role: true,
          created_at: true,
        },
      });
      const publicUser = toPublicUser(user);
      await safeAudit(auditClient, {
        service: 'auth-service',
        action: 'auth.register.success',
        status: 'success',
        user_id: user.id,
        ip_address: ip || null,
        details: {},
      });
      return publicUser;
    } catch (err) {
      if (err && err.code === 'P2002') {
        throw new AppError('Email already registered', 409);
      }
      throw err;
    }
  }

  async function login({ email, password, ip }) {
    const user = await findByEmail(email);
    if (!user) {
      await safeAudit(auditClient, {
        service: 'auth-service',
        action: 'auth.login.failed',
        status: 'failure',
        ip_address: ip || null,
        details: { reason: 'unknown_user' },
      });
      throw new AppError('Invalid credentials', 401);
    }

    if (!user.password_hash) {
      await safeAudit(auditClient, {
        service: 'auth-service',
        action: 'auth.login.failed',
        status: 'failure',
        user_id: user.id,
        ip_address: ip || null,
        details: { reason: 'oauth_only_account' },
      });
      throw new AppError(
        'This account uses external sign-in. Continue with Google, GitHub, or Microsoft.',
        401,
      );
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      await safeAudit(auditClient, {
        service: 'auth-service',
        action: 'auth.login.failed',
        status: 'failure',
        user_id: user.id,
        ip_address: ip || null,
        details: { reason: 'invalid_password' },
      });
      throw new AppError('Invalid credentials', 401);
    }

    await safeAudit(auditClient, {
      service: 'auth-service',
      action: 'auth.login.success',
      status: 'success',
      user_id: user.id,
      ip_address: ip || null,
      details: {},
    });

    return buildLoginResult(user, config);
  }

  return { register, login };
}

module.exports = { createAuthService };
