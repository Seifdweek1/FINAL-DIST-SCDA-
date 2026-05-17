const { clientIp } = require('../utils/request.util');
function logAdminAction(auditService, req, action, details) {
  const payload = {
    user_id: req.user.id,
    service: 'audit-service',
    action,
    status: 'success',
    ip_address: clientIp(req),
    details: details || {},
  };
  auditService.createLog(payload).catch(() => {});
}

function createAuditController(auditService) {
  async function createLog(req, res, next) {
    try {
      const row = await auditService.createLog({
        user_id: req.body.user_id,
        service: req.body.service,
        action: req.body.action,
        status: req.body.status,
        ip_address: req.body.ip_address,
        details: req.body.details,
      });
      res.status(201).json({ log: auditService.toPublicLog(row) });
    } catch (err) {
      next(err);
    }
  }

  async function list(req, res, next) {
    try {
      const result = await auditService.listLogs(req.query);
      res.status(200).json(result);
      logAdminAction(auditService, req, 'audit.admin.logs.list', {
        limit: req.query.limit,
        offset: req.query.offset,
        filters: {
          service: req.query.service,
          action: req.query.action,
          status: req.query.status,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async function getById(req, res, next) {
    try {
      const log = await auditService.getLogById(req.params.id);
      res.status(200).json({ log });
      logAdminAction(auditService, req, 'audit.admin.logs.get_by_id', { log_id: req.params.id });
    } catch (err) {
      next(err);
    }
  }

  async function stats(req, res, next) {
    try {
      const summary = await auditService.getStats(req.query);
      res.status(200).json({ stats: summary });
      logAdminAction(auditService, req, 'audit.admin.logs.stats', {
        filters: {
          service: req.query.service,
          action: req.query.action,
          status: req.query.status,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  return { createLog, list, getById, stats };
}

module.exports = { createAuditController };
