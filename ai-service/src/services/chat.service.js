const crypto = require('crypto');
const { embedText } = require('./embedding.service');
const {
  CHAT_DEBUG,
  detectIntent,
  buildUploadedDocumentsReply,
  synthesizeSemanticFromHits,
  buildWhichDocumentReply,
  buildClearDocumentReply,
  buildDocumentNotReadyReply,
  buildNoDocumentSelectedReply,
  buildDebugFooter,
  STATIC,
} = require('./chat.replies');
const { assessChatDocumentRelevance } = require('./chatRelevance.service');
const { searchChunksByKeywords } = require('./documentChunks.service');
const {
  extractFilenameFromMessage,
  stripFilenameFromQuery,
  detectSpecialCommand,
  resolveDocumentByFilename,
  getDocumentByIdForUser,
  getDocumentFilename,
  extractRelevantPassages,
} = require('./chat.document');
const { downloadDocumentBuffer, bufferToSearchableText } = require('./document.client');
const { sanitizeForPostgresText } = require('../utils/textSanitize');

const DEFAULT_TITLE = 'New chat';

function truncate(s, max) {
  const t = String(s || '');
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

async function formatSessionRow(session, prisma) {
  const filename = session.selected_document_id
    ? await getDocumentFilename(prisma, session.selected_document_id)
    : null;
  return {
    id: session.id,
    user_id: session.user_id,
    title: session.title,
    selected_document_id: session.selected_document_id ?? null,
    selected_document_filename: filename,
    created_at: session.created_at,
    updated_at: session.updated_at,
  };
}

function createChatService(prisma, qdrant, config) {
  const maxLen = config.chatMaxMessageLength;

  async function findActiveSessionRecord(userId) {
    return prisma.chatSession.findFirst({
      where: { user_id: userId },
      orderBy: { updated_at: 'desc' },
    });
  }

  async function createSession(userId, title) {
    const explicit = title && String(title).trim();
    if (!explicit) {
      const active = await findActiveSessionRecord(userId);
      if (active) return active;
    }
    const t = explicit || DEFAULT_TITLE;
    return prisma.chatSession.create({
      data: {
        user_id: userId,
        title: t.slice(0, 200),
      },
    });
  }

  async function getUserChatHistory(userId) {
    const messages = await prisma.chatMessage.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'asc' },
      select: {
        id: true,
        session_id: true,
        user_id: true,
        role: true,
        content: true,
        metadata: true,
        created_at: true,
      },
    });
    const sessionRow = await findActiveSessionRecord(userId);
    const session = sessionRow ? await formatSessionRow(sessionRow, prisma) : null;
    return { session, messages };
  }

  async function clearUserChatHistory(userId) {
    await prisma.chatSession.deleteMany({ where: { user_id: userId } });
  }

  async function listSessionsForUser(userId) {
    const rows = await prisma.chatSession.findMany({
      where: { user_id: userId },
      orderBy: { updated_at: 'desc' },
      select: {
        id: true,
        user_id: true,
        title: true,
        selected_document_id: true,
        created_at: true,
        updated_at: true,
      },
    });
    return Promise.all(rows.map((s) => formatSessionRow(s, prisma)));
  }

  async function listAllSessionsAdmin() {
    const rows = await prisma.chatSession.findMany({
      orderBy: { updated_at: 'desc' },
      take: 500,
      select: {
        id: true,
        user_id: true,
        title: true,
        selected_document_id: true,
        created_at: true,
        updated_at: true,
      },
    });
    return Promise.all(rows.map((s) => formatSessionRow(s, prisma)));
  }

  async function getSessionOwned(sessionId, userId) {
    return prisma.chatSession.findFirst({
      where: { id: sessionId, user_id: userId },
    });
  }

  async function setSessionDocument(sessionId, documentId) {
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { selected_document_id: documentId },
    });
  }

  async function clearSessionDocument(sessionId) {
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { selected_document_id: null },
    });
  }

  async function listMessages(sessionId, requester) {
    const session =
      requester.role === 'admin'
        ? await prisma.chatSession.findUnique({ where: { id: sessionId } })
        : await getSessionOwned(sessionId, requester.id);
    if (!session) return null;
    const messages = await prisma.chatMessage.findMany({
      where: { session_id: sessionId },
      orderBy: { created_at: 'asc' },
      select: {
        id: true,
        session_id: true,
        user_id: true,
        role: true,
        content: true,
        metadata: true,
        created_at: true,
      },
    });
    return { session: await formatSessionRow(session, prisma), messages };
  }

  async function deleteSession(sessionId, userId) {
    const res = await prisma.chatSession.deleteMany({
      where: { id: sessionId, user_id: userId },
    });
    return res.count > 0;
  }

  async function touchSessionTitle(sessionId, nextTitle) {
    const t = String(nextTitle || '').trim().slice(0, 200);
    if (!t) return;
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { title: t },
    });
  }

  async function maybeIndexDocumentText({ userId, documentId, filename, plainText }) {
    const { isReadablePassage } = require('../utils/textQuality');
    const chunk = String(plainText || '').trim().slice(0, 12_000);
    if (chunk.length < 80 || !isReadablePassage(chunk, { minLen: 80 })) return;
    if (/\b(create\s+extension|create\s+table|pgcrypto)\b/i.test(chunk)) return;
    try {
      const vector = embedText(chunk, config.embeddingDim);
      await qdrant.upsertPoint({
        id: crypto.randomUUID(),
        vector,
        payload: {
          user_id: userId,
          document_id: documentId,
          original_filename: filename,
          text_preview: chunk.slice(0, 500),
          metadata: { document_id: documentId, source: 'chat-auto-index' },
          created_at: new Date().toISOString(),
        },
      });
    } catch {
      /* indexing is best-effort */
    }
  }

  async function answerForSelectedDocument({
    userId,
    trimmed,
    documentId,
    filename,
    documentStatus,
    bearerToken,
  }) {
    if (documentStatus && documentStatus !== 'ready') {
      return {
        text: buildDocumentNotReadyReply(filename, documentStatus),
        hits: [],
        noContext: true,
      };
    }

    const queryForSearch = stripFilenameFromQuery(trimmed, filename);
    const searchQuery = queryForSearch || trimmed;
    const vector = embedText(searchQuery, config.embeddingDim);
    const limit = Math.min(12, Number(process.env.CHAT_QDRANT_LIMIT) || 12);
    const { isReadablePassage } = require('../utils/textQuality');
    const { extractContentFromHit } = require('./chat.replies');
    const { buildChatAnswerFromContext, isChatAutoIndexHit } = require('./answerSynthesis');

    let plainPassages = await searchChunksByKeywords(prisma, {
      documentId,
      userId,
      query: searchQuery,
      limit: 16,
    });

    let raw = await qdrant.searchPoints({
      vector,
      userId,
      limit,
      documentId,
    });
    let hits = (raw.result || []).slice(0, 12).filter((h) => {
      const text = extractContentFromHit(h);
      return text.length >= 40 && isReadablePassage(text, { minLen: 40 });
    });

    if (plainPassages.length > 0) {
      hits = hits.filter((h) => !isChatAutoIndexHit(h));
    }

    if (plainPassages.length === 0 && bearerToken) {
      const dl = await downloadDocumentBuffer(config, bearerToken, documentId);
      if (dl.buffer) {
        const plain = await bufferToSearchableText(dl.buffer, null, filename);
        if (plain && plain.length > 80) {
          if (hits.length === 0) {
            await maybeIndexDocumentText({ userId, documentId, filename, plainText: plain });
            raw = await qdrant.searchPoints({
              vector,
              userId,
              limit,
              documentId,
            });
            hits = (raw.result || [])
              .slice(0, 8)
              .filter((h) => {
                const text = extractContentFromHit(h);
                return text.length >= 40 && isReadablePassage(text, { minLen: 40 });
              });
          }
          if (plainPassages.length === 0) {
            const extracted = extractRelevantPassages(plain, searchQuery);
            plainPassages = extracted.length ? extracted : [plain.slice(0, 2000)];
          }
        }
      }
    }

    const relevance = assessChatDocumentRelevance({
      query: searchQuery,
      hits,
      plainPassages,
    });

    if (!relevance.relevant) {
      return {
        text: 'I could not find enough relevant information to answer this question.',
        hits: [],
        noContext: true,
        noRelevantContext: true,
        relevance,
      };
    }

    let text = buildChatAnswerFromContext({
      filename,
      userQuery: searchQuery,
      hits,
      plainPassages,
    });

    if (!text || text.includes('could not find readable passages')) {
      text = 'I could not find enough relevant information to answer this question.';
    }

    const noContext =
      hits.length === 0 &&
      plainPassages.length === 0 &&
      (text.includes('could not find readable') || text.includes('does not contain a clear section'));

    return { text, hits, noContext, noRelevantContext: false, relevance };
  }

  /**
   * Save user message, resolve intent / document / Qdrant, save assistant reply.
   */
  async function sendUserMessageAndReply({
    sessionId,
    userId,
    content,
    metadata,
    bearerToken,
  }) {
    const session = await getSessionOwned(sessionId, userId);
    if (!session) return { error: 'not_found' };

    const trimmed = sanitizeForPostgresText(String(content).trim(), maxLen);
    if (!trimmed) return { error: 'empty' };
    if (trimmed.length > maxLen) return { error: 'too_long' };

    const userMsg = await prisma.chatMessage.create({
      data: {
        session_id: sessionId,
        user_id: userId,
        role: 'user',
        content: trimmed,
        metadata: metadata && typeof metadata === 'object' ? metadata : undefined,
      },
    });

    try {
    if (session.title === DEFAULT_TITLE && trimmed.length > 0) {
      await touchSessionTitle(sessionId, truncate(trimmed, 80));
    }

    const special = detectSpecialCommand(trimmed);
    const debug = CHAT_DEBUG();
    let assistantText = '';
    let hits = [];
    let qdrantSkipped = false;
    let intent = null;
    let auditExtras = [];
    let activeDocumentId = session.selected_document_id;
    let activeFilename = activeDocumentId
      ? await getDocumentFilename(prisma, activeDocumentId)
      : null;
    let activeDocumentStatus = null;

    if (special === 'list_documents') {
      assistantText = await buildUploadedDocumentsReply(prisma, userId);
      qdrantSkipped = true;
      intent = 'uploaded_documents';
    } else if (special === 'which_document') {
      assistantText = buildWhichDocumentReply(activeFilename);
      qdrantSkipped = true;
      intent = 'which_document';
    } else if (special === 'clear_document') {
      await clearSessionDocument(sessionId);
      activeDocumentId = null;
      activeFilename = null;
      assistantText = buildClearDocumentReply();
      qdrantSkipped = true;
      intent = 'clear_document';
    } else {
      const mentioned = extractFilenameFromMessage(trimmed);
      if (mentioned) {
        const resolved = await resolveDocumentByFilename(prisma, userId, mentioned);
        if (resolved.error === 'not_found') {
          assistantText = `I couldn't find a document named '${mentioned}' in your workspace. Check the exact name on the **Documents** page or ask "What documents do I have uploaded?"`;
          qdrantSkipped = true;
          intent = 'document_not_found';
        } else if (resolved.error === 'forbidden') {
          assistantText = 'You are not authorized to access this file.';
          qdrantSkipped = true;
          intent = 'document_forbidden';
        } else {
          activeDocumentId = resolved.document.id;
          activeFilename = resolved.document.original_filename;
          activeDocumentStatus = resolved.document.status;
          await setSessionDocument(sessionId, activeDocumentId);
          auditExtras.push({
            action: 'chat.document.selected',
            details: {
              session_id: sessionId,
              document_id: activeDocumentId,
              filename: activeFilename,
              source: 'filename_mention',
            },
          });
        }
      }

      if (!assistantText && activeDocumentId) {
        const owned = await getDocumentByIdForUser(prisma, userId, activeDocumentId);
        if (owned.error === 'not_found') {
          await clearSessionDocument(sessionId);
          activeDocumentId = null;
          activeFilename = null;
          activeDocumentStatus = null;
          assistantText =
            'The previously selected document is no longer available. Mention a file name to select another.';
          qdrantSkipped = true;
          intent = 'document_missing';
        } else if (owned.error === 'forbidden') {
          assistantText = 'You are not authorized to access this file.';
          qdrantSkipped = true;
          intent = 'document_forbidden';
        } else {
          activeFilename = owned.document.original_filename;
          activeDocumentStatus = owned.document.status;
          const scoped = await answerForSelectedDocument({
            userId,
            trimmed,
            documentId: activeDocumentId,
            filename: activeFilename,
            documentStatus: activeDocumentStatus,
            bearerToken,
          });
          assistantText = scoped.text;
          hits = scoped.hits;
          intent = 'document_scoped';
          if (scoped.noRelevantContext) {
            auditExtras.push({
              action: 'chat.no_relevant_context',
              status: 'warning',
              details: {
                session_id: sessionId,
                document_id: activeDocumentId,
                filename: activeFilename,
                reason: scoped.relevance?.reason ?? 'low_relevance',
                top_vector_score: scoped.relevance?.top_vector_score ?? null,
                term_overlap: scoped.relevance?.term_overlap ?? null,
                keyword_score: scoped.relevance?.keyword_score ?? null,
              },
            });
          } else if (scoped.noContext) {
            auditExtras.push({
              action: 'chat.no_context_found',
              status: 'warning',
              details: {
                session_id: sessionId,
                document_id: activeDocumentId,
                filename: activeFilename,
              },
            });
          }
        }
      }

      if (!assistantText && !activeDocumentId) {
        intent = detectIntent(trimmed);
        if (intent === 'uploaded_documents') {
          assistantText = await buildUploadedDocumentsReply(prisma, userId);
          qdrantSkipped = true;
        } else if (intent && STATIC[intent]) {
          assistantText = STATIC[intent];
          qdrantSkipped = true;
        } else {
          assistantText = buildNoDocumentSelectedReply();
          qdrantSkipped = true;
          intent = 'no_document_selected';
        }
      }
    }

    if (debug) {
      assistantText += buildDebugFooter({
        intent,
        hits,
        collectionName: config.qdrantCollection,
        qdrantSkipped,
      });
    }

    assistantText = sanitizeForPostgresText(assistantText, maxLen * 2);

    const assistantMsg = await prisma.chatMessage.create({
      data: {
        session_id: sessionId,
        user_id: userId,
        role: 'assistant',
        content: assistantText,
        metadata: {
          intent: intent || 'semantic_search',
          qdrant_used: !qdrantSkipped,
          qdrant_hit_count: hits.length,
          top_score: hits[0]?.score ?? null,
          selected_document_id: activeDocumentId,
          selected_document_filename: activeFilename,
          chat_debug: debug,
        },
      },
    });

    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { updated_at: new Date() },
    });

    return { user_message: userMsg, assistant_message: assistantMsg, audit_extras: auditExtras };
    } catch (err) {
      try {
        await prisma.chatMessage.delete({ where: { id: userMsg.id } });
      } catch {
        /* ignore rollback failure */
      }
      throw err;
    }
  }

  return {
    createSession,
    listSessionsForUser,
    listAllSessionsAdmin,
    getSessionOwned,
    listMessages,
    deleteSession,
    getUserChatHistory,
    clearUserChatHistory,
    sendUserMessageAndReply,
    formatSessionRow,
    DEFAULT_TITLE,
  };
}

/** @deprecated */
function buildAssistantReply(userQuery, hits) {
  const { synthesizeSemanticFromHits } = require('./chat.replies');
  return synthesizeSemanticFromHits(userQuery, hits, {
    collectionName: process.env.QDRANT_COLLECTION || 'scda_ai',
  });
}

module.exports = { createChatService, buildAssistantReply };
