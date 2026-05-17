const prisma = require('../prisma/client');
const { AppError } = require('../errors/AppError');

function buildListWhere(query) {
  const where = {};
  if (query.user_id) {
    where.user_id = query.user_id;
  }
  if (query.service) {
    where.service = { equals: query.service, mode: 'insensitive' };
  }
  if (query.action) {
    where.action = { contains: query.action, mode: 'insensitive' };
  }
  if (query.status) {
    where.status = { equals: query.status, mode: 'insensitive' };
  }
  if (query.from || query.to) {
    where.created_at = {};
    if (query.from) {
      where.created_at.gte = new Date(query.from);
    }
    if (query.to) {
      where.created_at.lte = new Date(query.to);
    }
  }
  return where;
}

function mergeAnd(baseWhere, extra) {
  const baseKeys = Object.keys(baseWhere);
  if (baseKeys.length === 0) {
    return extra;
  }
  return { AND: [baseWhere, extra] };
}

function createAuditService(config) {
  function toPublicLog(row) {
    return {
      id: row.id,
      user_id: row.user_id,
      service: row.service,
      action: row.action,
      status: row.status,
      ip_address: row.ip_address,
      details: row.details ?? null,
      created_at: row.created_at,
    };
  }

  async function createLog(payload) {
    return prisma.auditLog.create({
      data: {
        user_id: payload.user_id || null,
        service: payload.service,
        action: payload.action,
        status: payload.status,
        ip_address: payload.ip_address || null,
        details: payload.details === undefined ? undefined : payload.details,
      },
    });
  }

  async function listLogs(query) {
    const where = buildListWhere(query);
    const limitRaw = query.limit ?? config.defaultPageSize;
    const limit = Math.min(Math.max(Number(limitRaw) || config.defaultPageSize, 1), config.maxPageSize);
    const offset = Math.max(Number(query.offset) || 0, 0);

    const [rows, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      logs: rows.map(toPublicLog),
      total,
      limit,
      offset,
    };
  }

  async function getLogById(id) {
    const row = await prisma.auditLog.findUnique({ where: { id } });
    if (!row) {
      throw new AppError('Not found', 404);
    }
    return toPublicLog(row);
  }

  const PROCESSED_JOB_ACTIONS = [
    'document.indexing.completed',
    'worker.document.processing.completed',
  ];

  const AI_QUERY_ACTIONS = [
    'ai.search.completed',
    'ai.analyze.completed',
    'chat.message.sent',
  ];

  function actionEqualsAny(actions) {
    return {
      OR: actions.map((a) => ({ action: { equals: a, mode: 'insensitive' } })),
    };
  }

  async function countSharedTable(tableName) {
    try {
      const rows = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*)::int AS count FROM ${tableName}`,
      );
      return Number(rows[0]?.count ?? 0);
    } catch {
      return 0;
    }
  }

  async function getStats(query) {
    const baseWhere = buildListWhere(query);

    const total = await prisma.auditLog.count({ where: baseWhere });

    const [totalUsers, uploadedFiles] = await Promise.all([
      countSharedTable('users'),
      countSharedTable('documents'),
    ]);

    const failedLogins = await prisma.auditLog.count({
      where: mergeAnd(baseWhere, {
        OR: [
          {
            AND: [
              { action: { contains: 'login', mode: 'insensitive' } },
              {
                status: {
                  in: ['failure', 'failed', 'error', 'Failure', 'Failed', 'Error'],
                },
              },
            ],
          },
          { action: { contains: 'login.failed', mode: 'insensitive' } },
        ],
      }),
    });

    const uploads = await prisma.auditLog.count({
      where: mergeAnd(baseWhere, {
        action: { contains: 'upload', mode: 'insensitive' },
      }),
    });

    const downloads = await prisma.auditLog.count({
      where: mergeAnd(baseWhere, {
        action: { contains: 'download', mode: 'insensitive' },
      }),
    });

    const unauthorizedAttempts = await prisma.auditLog.count({
      where: mergeAnd(baseWhere, {
        OR: [
          { status: { equals: 'unauthorized', mode: 'insensitive' } },
          { action: { contains: 'unauthorized', mode: 'insensitive' } },
        ],
      }),
    });

    const processedJobs = await prisma.auditLog.count({
      where: mergeAnd(baseWhere, actionEqualsAny(PROCESSED_JOB_ACTIONS)),
    });

    const aiQueries = await prisma.auditLog.count({
      where: mergeAnd(baseWhere, actionEqualsAny(AI_QUERY_ACTIONS)),
    });

    return {
      total_logs: total,
      total_requests: total,
      total_users: totalUsers,
      failed_logins: failedLogins,
      uploaded_files: uploadedFiles,
      uploads,
      downloads,
      processed_jobs: processedJobs,
      unauthorized_attempts: unauthorizedAttempts,
      ai_queries: aiQueries,
    };
  }

  return {
    createLog,
    listLogs,
    getLogById,
    getStats,
    toPublicLog,
  };
}

module.exports = { createAuditService };
