const crypto = require('crypto');
const { validationResult, body, query } = require('express-validator');
const { embedText, buildEmbeddingInput } = require('../services/embedding.service');
const { safeAudit } = require('../services/audit.client');
const { runSemanticSearch } = require('../services/semanticSearch.service');
const { buildSearchSuggestions } = require('../services/queryExpansion.service');

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

const analyzeValidators = [
  body('text').optional().isString().isLength({ max: 200_000 }),
  body('metadata').optional().isObject(),
  body().custom((_, { req }) => {
    const text = req.body?.text;
    const meta = req.body?.metadata;
    const hasText = typeof text === 'string' && text.trim().length > 0;
    const hasMeta =
      meta &&
      typeof meta === 'object' &&
      !Array.isArray(meta) &&
      Object.keys(meta).length > 0;
    if (!hasText && !hasMeta) {
      throw new Error('Provide non-empty text and/or a non-empty metadata object');
    }
    return true;
  }),
];

const searchValidators = [
  query('q').trim().isLength({ min: 1, max: 2000 }),
  query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
];

const suggestValidators = [
  query('q').optional().trim().isLength({ max: 500 }),
  query('limit').optional().isInt({ min: 1, max: 20 }).toInt(),
];

function createAiController(config, deps) {
  const { qdrant, audit } = deps;

  async function health(req, res, next) {
    try {
      const q = await qdrant.health();
      res.json({
        status: q.ok ? 'ok' : 'degraded',
        service: 'ai-service',
        qdrant: q,
        collection: qdrant.collectionName,
      });
    } catch (err) {
      next(err);
    }
  }

  async function analyze(req, res, next) {
    const ip = clientIp(req);
    const userId = req.user.id;
    const { text, metadata } = req.body;
    const input = buildEmbeddingInput({ text, metadata });
    const vector = embedText(input, config.embeddingDim);
    const pointId = crypto.randomUUID();
    const textPreview =
      typeof text === 'string' && text.trim()
        ? text.trim().slice(0, 500)
        : undefined;

    try {
      await qdrant.upsertPoint({
        id: pointId,
        vector,
        payload: {
          user_id: userId,
          text_preview: textPreview || null,
          metadata: metadata && typeof metadata === 'object' ? metadata : null,
          embedding_model: 'hash-simulated',
          dimensions: config.embeddingDim,
          created_at: new Date().toISOString(),
        },
      });

      await safeAudit(audit, {
        service: 'ai-service',
        action: 'ai.analyze.completed',
        status: 'success',
        user_id: userId,
        ip_address: ip,
        details: {
          point_id: pointId,
          collection: qdrant.collectionName,
          has_text: Boolean(textPreview),
          metadata_keys:
            metadata && typeof metadata === 'object' ? Object.keys(metadata) : [],
        },
      });

      return res.status(201).json({
        point_id: pointId,
        collection: qdrant.collectionName,
        embedding_model: 'hash-simulated',
        dimensions: config.embeddingDim,
        stored: true,
      });
    } catch (err) {
      await safeAudit(audit, {
        service: 'ai-service',
        action: 'ai.analyze.failed',
        status: 'error',
        user_id: userId,
        ip_address: ip,
        details: {
          message: err.message,
          name: err.name,
        },
      });
      return next(err);
    }
  }

  async function searchSuggest(req, res, next) {
    try {
      const qStr = String(req.query.q || '');
      const limit = Number(req.query.limit) || 8;
      const suggestions = buildSearchSuggestions(qStr, limit);
      return res.json({ query: qStr, suggestions });
    } catch (err) {
      return next(err);
    }
  }

  async function search(req, res, next) {
    const ip = clientIp(req);
    const userId = req.user.id;
    const qStr = String(req.query.q);
    const limit = Number(req.query.limit) || 10;

    try {
      const payload = await runSemanticSearch({
        qdrant,
        userId,
        query: qStr,
        limit,
        embeddingDim: config.embeddingDim,
      });

      await safeAudit(audit, {
        service: 'ai-service',
        action: 'ai.search.completed',
        status: 'success',
        user_id: userId,
        ip_address: ip,
        details: {
          query_length: qStr.length,
          result_count: payload.results.length,
          limit,
          variant_count: payload.expanded_queries?.length || 1,
          related_document_count: payload.related_documents?.length || 0,
        },
      });

      return res.json(payload);
    } catch (err) {
      await safeAudit(audit, {
        service: 'ai-service',
        action: 'ai.search.failed',
        status: 'error',
        user_id: userId,
        ip_address: ip,
        details: {
          message: err.message,
          name: err.name,
        },
      });
      return next(err);
    }
  }

  return {
    health,
    analyze,
    search,
    searchSuggest,
    analyzeValidators,
    searchValidators,
    suggestValidators,
    handleValidationErrors,
  };
}

module.exports = { createAiController };
