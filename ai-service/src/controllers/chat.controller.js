const { validationResult } = require('express-validator');
const { AppError } = require('../errors/AppError');
const { safeAudit } = require('../services/audit.client');

function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      error: {
        message: 'Validation failed',
        details: errors.array({ onlyFirstError: true }).map((e) => ({
          field: e.path,
          message: e.msg,
        })),
      },
    });
  }
  return next();
}

function clientIp(req) {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.length) {
    return xf.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || null;
}

function requireAdmin() {
  return (req, res, next) => {
    if (req.user?.role !== 'admin') {
      next(new AppError('Forbidden', 403));
      return;
    }
    next();
  };
}

function createChatController(config, deps) {
  const { chatService, audit } = deps;

  async function createSession(req, res, next) {
    const ip = clientIp(req);
    const userId = req.user.id;
    try {
      const title = req.body?.title;
      const session = await chatService.createSession(userId, title);
      await safeAudit(audit, {
        service: 'ai-service',
        action: 'chat.session.created',
        status: 'success',
        user_id: userId,
        ip_address: ip,
        details: { session_id: session.id, title: session.title },
      });
      return res.status(201).json({ session });
    } catch (err) {
      await safeAudit(audit, {
        service: 'ai-service',
        action: 'chat.session.created',
        status: 'error',
        user_id: userId,
        ip_address: ip,
        details: { message: err.message },
      });
      return next(err);
    }
  }

  async function listSessions(req, res, next) {
    try {
      const sessions = await chatService.listSessionsForUser(req.user.id);
      return res.json({ sessions });
    } catch (err) {
      return next(err);
    }
  }

  async function getHistory(req, res, next) {
    try {
      const row = await chatService.getUserChatHistory(req.user.id);
      return res.json(row);
    } catch (err) {
      return next(err);
    }
  }

  async function clearHistory(req, res, next) {
    const ip = clientIp(req);
    const userId = req.user.id;
    try {
      await chatService.clearUserChatHistory(userId);
      await safeAudit(audit, {
        service: 'ai-service',
        action: 'chat.history.cleared',
        status: 'success',
        user_id: userId,
        ip_address: ip,
        details: {},
      });
      return res.json({ cleared: true });
    } catch (err) {
      await safeAudit(audit, {
        service: 'ai-service',
        action: 'chat.history.cleared',
        status: 'error',
        user_id: userId,
        ip_address: ip,
        details: { message: err.message },
      });
      return next(err);
    }
  }

  async function listSessionsAdmin(req, res, next) {
    try {
      const sessions = await chatService.listAllSessionsAdmin();
      return res.json({ sessions });
    } catch (err) {
      return next(err);
    }
  }

  async function getMessages(req, res, next) {
    try {
      const sessionId = req.params.id;
      const row = await chatService.listMessages(sessionId, { id: req.user.id, role: req.user.role });
      if (!row) {
        return next(new AppError('Session not found', 404));
      }
      return res.json({
        session: row.session,
        messages: row.messages,
      });
    } catch (err) {
      return next(err);
    }
  }

  async function postMessage(req, res, next) {
    const ip = clientIp(req);
    const userId = req.user.id;
    const sessionId = req.params.id;
    const content = req.body.content;
    const metadata = req.body.metadata;

    try {
      const authHeader = req.headers.authorization;
      const bearerToken =
        typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
          ? authHeader.slice('Bearer '.length).trim()
          : null;

      const result = await chatService.sendUserMessageAndReply({
        sessionId,
        userId,
        content,
        metadata,
        bearerToken,
      });

      if (result.error === 'not_found') {
        return next(new AppError('Session not found', 404));
      }
      if (result.error === 'empty') {
        return next(new AppError('Message cannot be empty', 400));
      }
      if (result.error === 'too_long') {
        return next(new AppError(`Message exceeds maximum length (${config.chatMaxMessageLength})`, 400));
      }

      await safeAudit(audit, {
        service: 'ai-service',
        action: 'chat.message.sent',
        status: 'success',
        user_id: userId,
        ip_address: ip,
        details: {
          session_id: sessionId,
          user_message_id: result.user_message.id,
        },
      });

      await safeAudit(audit, {
        service: 'ai-service',
        action: 'chat.message.answered',
        status: 'success',
        user_id: userId,
        ip_address: ip,
        details: {
          session_id: sessionId,
          assistant_message_id: result.assistant_message.id,
          intent: result.assistant_message.metadata?.intent ?? null,
        },
      });

      for (const extra of result.audit_extras || []) {
        await safeAudit(audit, {
          service: 'ai-service',
          action: extra.action,
          status: extra.status || 'success',
          user_id: userId,
          ip_address: ip,
          details: extra.details,
        });
      }

      return res.status(201).json({
        user_message: result.user_message,
        assistant_message: result.assistant_message,
      });
    } catch (err) {
      await safeAudit(audit, {
        service: 'ai-service',
        action: 'chat.message.answered',
        status: 'error',
        user_id: userId,
        ip_address: ip,
        details: { session_id: sessionId, message: err.message },
      });
      return next(err);
    }
  }

  async function deleteSession(req, res, next) {
    const ip = clientIp(req);
    const userId = req.user.id;
    const sessionId = req.params.id;
    try {
      const ok = await chatService.deleteSession(sessionId, userId);
      if (!ok) {
        return next(new AppError('Session not found', 404));
      }
      await safeAudit(audit, {
        service: 'ai-service',
        action: 'chat.session.deleted',
        status: 'success',
        user_id: userId,
        ip_address: ip,
        details: { session_id: sessionId },
      });
      return res.json({ deleted: true, id: sessionId });
    } catch (err) {
      await safeAudit(audit, {
        service: 'ai-service',
        action: 'chat.session.deleted',
        status: 'error',
        user_id: userId,
        ip_address: ip,
        details: { session_id: sessionId, message: err.message },
      });
      return next(err);
    }
  }

  return {
    createSession,
    listSessions,
    listSessionsAdmin,
    getHistory,
    clearHistory,
    getMessages,
    postMessage,
    deleteSession,
    handleValidationErrors,
    requireAdmin,
  };
}

module.exports = { createChatController };
