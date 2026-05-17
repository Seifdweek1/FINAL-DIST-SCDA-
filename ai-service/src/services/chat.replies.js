/**
 * Intent-based and semantic (Qdrant) reply generation for the chatbot.
 * No external LLM — rule-based only. API remains: assistant text in `content`.
 */

const CHAT_DEBUG = () => String(process.env.CHAT_DEBUG || '').toLowerCase() === 'true';

function truncate(s, max) {
  const t = String(s || '');
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function formatBytes(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n < 0) return '?';
  if (n < 1024) return `${n} B`;
  const kb = n / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}

/** @typedef {'uploaded_documents'|'file_integrity'|'encryption'|'rabbitmq_worker'|'audit_logs'|'ai_qdrant'|'authentication'|'rbac'|'https_tls'|'compliance'|'architecture'|null} ChatIntent */

/**
 * First matching rule wins (order = specificity).
 * @param {string} raw
 * @returns {ChatIntent}
 */
function detectIntent(raw) {
  const q = String(raw || '').trim();
  if (!q) return null;
  const n = q.toLowerCase();

  const rules = [
    {
      id: /** @type {const} */ ('uploaded_documents'),
      match: () =>
        /\b(list|show|what|which|how many)\b.*\b(files?|documents?|uploads?)\b/i.test(q) ||
        /\b(my|our)\s+(files?|documents?|uploads?)\b/i.test(n) ||
        /\b(files?|documents?)\s+(i|we)\s+(have|uploaded)\b/i.test(n) ||
        /\b(uploaded|stored)\s+documents?\b/i.test(n) ||
        /\bwhat\s+documents?\b/i.test(n),
    },
    {
      id: 'file_integrity',
      match: () =>
        /\b(sha-?256|integrity|tamper|checksum|hash)\b/i.test(n) &&
        /\b(file|document|upload|verify|verification|stored)\b/i.test(n),
    },
    {
      id: 'file_integrity',
      match: () =>
        /\bhow\b.*\b(system|platform|scda)\b.*\b(verify|verif(y|ication)|integrity|hash)\b/i.test(n),
    },
    {
      id: 'encryption',
      match: () =>
        /\b(what|which)\s+encryption\b/i.test(n) ||
        /\bencryption\s+algorithm\b/i.test(n) ||
        /\bhow\s+(is|are)\s+.{0,30}\bencrypted\b/i.test(n),
    },
    {
      id: 'encryption',
      match: () =>
        /\b(aes|encrypt|encryption|ciphertext|at rest|decrypt)\b/i.test(n) &&
        /\b(file|document|upload|stored|disk)\b/i.test(n),
    },
    {
      id: 'rabbitmq_worker',
      match: () =>
        /\b(rabbitmq|message queue|amqp)\b/i.test(n) ||
        /\bworker[- ]?service\b/i.test(n) ||
        /\bhow\b.*\b(worker|queue)\b/i.test(n) ||
        /\b(asynchronous|async)\b.*\b(process|upload|document)\b/i.test(n),
    },
    {
      id: 'audit_logs',
      match: () =>
        /\bwhat\s+(is\s+)?(stored\s+)?(in\s+)?(the\s+)?audit\b/i.test(n) ||
        /\bwhat\s+events\b.*\b(logged|recorded)\b/i.test(n) ||
        /\b(audit trail|security events?)\b/i.test(n),
    },
    {
      id: 'audit_logs',
      match: () =>
        /\b(audit|audit[- ]?service)\b/i.test(n) &&
        /\b(log|logs|event|events|stored|recorded|tracking)\b/i.test(n),
    },
    {
      id: 'ai_qdrant',
      match: () =>
        /\bwhat\s+is\s+qdrant\b/i.test(n) ||
        /\bhow\b.*\b(ai assistant|semantic search|vector|embeddings?)\b/i.test(n) ||
        /\bqdrant\b.*\b(for|used|purpose)\b/i.test(n) ||
        /\bhow\b.*\b(indexed|indexing|vectors?)\b.*\bwork\b/i.test(n),
    },
    {
      id: 'authentication',
      match: () =>
        /\b(jwt|json web token|login|password|bcrypt|sign[- ]?in|auth(entication)?)\b/i.test(n) &&
        /\bhow\b|\bwork(s|ing)?\b|\bused\b|\bsecure\b/i.test(n),
    },
    {
      id: 'rbac',
      match: () =>
        /\b(admin|rbac|role|roles|permission|permissions|enforce)\b/i.test(n) &&
        /\b(access|control|restrict|only)\b/i.test(n),
    },
    {
      id: 'https_tls',
      match: () =>
        /\b(https|tls|ssl|certificate|cert)\b/i.test(n) &&
        /\b(config|configured|nginx|gateway|secure)\b/i.test(n),
    },
    {
      id: 'compliance',
      match: () =>
        /\b(compliance|soc|rubric|controls?|security controls?|nist|iso)\b/i.test(n) ||
        /\bwhich\b.*\b(controls?|safeguards?)\b/i.test(n),
    },
    {
      id: 'architecture',
      match: () =>
        /\b(system )?architecture\b/i.test(n) ||
        /\bexplain\b.*\b(the )?(whole )?system\b/i.test(n) ||
        /\b(high[- ]level )?(overview|diagram)\b/i.test(n) ||
        /\bwhat (services|components)\b/i.test(n) ||
        /\bhow\b.*\b(is everything )?wired\b/i.test(n) ||
        /\bmicroservices?\b/i.test(n),
    },
  ];

  for (const r of rules) {
    try {
      if (r.match()) return /** @type {ChatIntent} */ (r.id);
    } catch {
      /* ignore */
    }
  }
  return null;
}

const STATIC = {
  file_integrity: `The platform treats integrity as a first-class property of stored evidence.

When a file is uploaded, **document-service** computes a **SHA-256** hash of the file bytes (before or as part of the encrypted pipeline, depending on the ingest path) and persists that hash with the document row in **PostgreSQL**. The ciphertext is written to disk under a unique stored name; metadata stays in the database.

Later, during verification or worker processing, the service can **decrypt the ciphertext**, **recompute SHA-256**, and compare it to the stored digest using a **constant-time** comparison where implemented, so small timing differences cannot leak information about the expected hash. Any mismatch indicates tampering or corruption and should surface as a integrity failure rather than silently succeeding.

For day-to-day questions about a specific file’s status, use **Documents** in the UI or ask me to **list your uploaded documents**.`,

  encryption: `**document-service** stores compliance files so that **only encrypted ciphertext** is persisted on disk under controlled paths. Typical configuration uses **AES-256-GCM** (authenticated encryption): confidentiality comes from AES-256, and GCM provides an authentication tag so tampering is detected when data is decrypted.

**PostgreSQL** holds non-secret metadata such as original filename, MIME type, size, **SHA-256** hash, processing status, and pointers to the encrypted blob — not the raw file contents. Keys and operational secrets are supplied via environment variables (for example an **ENCRYPTION_KEY**) and must be managed like production secrets (rotation, access control, backups).

Together, this gives **encryption at rest** for uploads plus a clear separation between ciphertext on disk and structured metadata in the database.`,

  rabbitmq_worker: `Uploads are designed to be **durable** and **asynchronous** so the HTTP request can finish quickly while heavy work runs out of band.

**document-service** accepts the file, persists metadata, writes encrypted content, then **publishes a message to RabbitMQ** describing the work item (for example document id and processing intent). **worker-service** consumes those messages, pulls the encrypted object, runs extraction / indexing steps (depending on deployment), updates **PostgreSQL** status fields (for example moving from **queued** toward **ready** or **failed**), and may call into **AI / Qdrant** flows when embeddings are generated.

If RabbitMQ is unavailable, new jobs cannot be queued cleanly — operations should fail safe rather than silently dropping evidence. For capacity planning, treat the queue depth and consumer lag as operational metrics alongside worker CPU and storage I/O.`,

  audit_logs: `**audit-service** is the centralized security event stream for the platform. Typical events include **successful and failed logins**, **document uploads and downloads**, **AI analyze/search/chat actions**, **worker milestones**, and **administrative reads** where implemented.

Each log line is structured (service name, action, user id when known, IP or forwarded IP, HTTP status, and a JSON **details** object). That design supports **non-repudiation** investigations: you can reconstruct who did what, when, and from where, without relying on a single service’s local logs.

Retention and access to audit data should follow your organizational policy — the assistant here describes behavior at a high level; consult your deployment’s **Admin → Audit** view for live data.`,

  ai_qdrant: `The **AI service** provides **embedding-based semantic search** over text that has been explicitly indexed for your tenant. When you run **AI Assistant → Analyze**, the service builds a dense vector from the supplied text/metadata, **upserts a point into Qdrant** with a payload that includes previews and ownership fields, and ties results back to your user id for isolation.

**Qdrant** is the vector database: it stores vectors and payload, runs **cosine** (or deployment-configured) similarity search, and returns the nearest neighbors. **This chatbot** can query the same collection to assemble answers from retrieved snippets — there is **no external LLM** in the default path; responses are synthesized from retrieved context and curated “platform knowledge” intents.

If search returns nothing, upload content and analyze it first, or rephrase using vocabulary that appears in your documents.`,

  authentication: `**auth-service** owns identity: registration hashes passwords (for example with **bcrypt**), login verifies credentials against **PostgreSQL**, and issues a **JWT** signed with a shared **HS256** secret known only to trusted services.

The access token embeds **subject (user id)**, **role**, and standard time bounds (**exp**). Downstream services (**document-service**, **ai-service**, **audit-service**, etc.) validate the JWT on each request using the same secret, then enforce authorization based on **role** and resource ownership.

Clients should store tokens carefully (for this SPA, typically **memory or localStorage** per your threat model), send **Authorization: Bearer …** to APIs, and treat **401** as “re-authenticate”. HTTPS termination at **nginx** protects tokens in transit.`,

  rbac: `**Role-based access control** is enforced after authentication. A user’s **role** (for example **user** vs **admin**) is carried inside the JWT claims; services map that to allowed routes and operations.

**Admins** can see cross-user operational data where the product implements it (for example audit streams or chat session oversight modes). **Standard users** are restricted to their own documents, chat sessions, and AI points. Enforcement is **server-side** in each microservice — the UI merely reflects what APIs allow.

If you need a new role or finer-grained policy, that is a product change: new claims, migration of user rows, and explicit checks in each handler.`,

  https_tls: `Public traffic is fronted by **nginx-api-gateway** on **443** with **TLS 1.2+** and modern cipher suites. Certificates in local development are often **self-signed** (your browser will warn unless you trust them); production should use **properly anchored** certificates (Let's Encrypt, ACM, or corporate PKI).

Nginx terminates TLS, applies **rate limits** and **security headers**, and **reverse-proxies** to internal services on the Docker network (/api/auth → auth-service, /api/documents → document-service, /api/ai → ai-service, /api/audit → audit-service, / → static frontend). **HSTS** headers encourage browsers to stay on HTTPS once enabled.

Internal east-west hops are commonly plain HTTP on isolated networks; the trust boundary is TLS at the edge plus network policy.`,

  compliance: `SCDA is framed as a **secure compliance document assistant**: evidence uploads, encryption at rest, structured audit trails, asynchronous processing, and AI-assisted review over **customer-controlled** corpora.

Controls you should expect in a hardened deployment include **authenticated APIs**, **encrypted storage**, **hash-backed integrity**, **centralized audit logging**, **rate limiting at the gateway**, **least-privilege service accounts**, and **separation of duties** between upload, processing, and read paths. Exact mappings to **NIST**, **ISO 27001**, or internal rubrics depend on how you operate the stack (key management, backups, monitoring, IR playbooks).

Use **Security & demo** and **Documents** pages alongside this chat for narrative context; the chatbot summarizes architecture and policy behavior at a high level.`,

  architecture: `At a high level the system is a **React** single-page app behind **nginx-api-gateway** (TLS, routing, rate limits), talking to several **Node/Express** microservices backed by **PostgreSQL**, **RabbitMQ**, **Qdrant**, and optional object-style file storage on disk.

**Flow (simplified)**  
1. **auth-service** — users, JWT issuance.  
2. **document-service** — encrypted uploads, metadata, publishes work to **RabbitMQ**.  
3. **worker-service** — consumes queue jobs, advances document status, may trigger embedding/index steps.  
4. **ai-service** — embeddings, Qdrant upsert/search, **chat persistence** (sessions/messages) in Postgres.  
5. **audit-service** — append-only style security event API consumed by other services.  
6. **frontend** — operator UI (dashboard, documents, AI assistant, chatbot, audit for admins).

Data stays **tenant-scoped** by **user id** on documents and AI vectors; gateways never trust the browser for authorization decisions beyond presenting a valid JWT.`,
};

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} userId
 */
async function buildUploadedDocumentsReply(prisma, userId) {
  try {
    const rows = await prisma.$queryRaw`
      SELECT "original_filename" AS fn, "size" AS sz, "status"::text AS st,
             "created_at" AS created_at, "updated_at" AS u
      FROM "documents"
      WHERE "user_id" = ${userId}
      ORDER BY "created_at" DESC
      LIMIT 100
    `;
    if (!Array.isArray(rows) || rows.length === 0) {
      return `You do not have any uploaded documents yet. Open **Documents**, upload a PDF or TXT file, and wait until status becomes **READY** (worker extracts text, chunks, and indexes into Qdrant). Then mention the filename in chat.`;
    }
    const lines = rows.map((r, i) => {
      const name = String(r.fn || 'unknown');
      const size = formatBytes(Number(r.sz));
      const st = String(r.st || 'unknown').toUpperCase();
      const created = r.created_at ? new Date(r.created_at).toLocaleString() : '—';
      return `${i + 1}. **${name}** — ${size}, ${st}, uploaded ${created}`;
    });
    return `You currently have **${rows.length}** uploaded document${rows.length === 1 ? '' : 's'}:\n\n${lines.join('\n')}\n\nUse **READY** files in chat by name (for example: “In report.pdf, summarize the introduction”). Open **Documents** for downloads and integrity checks.`;
  } catch (e) {
    return `I could not load your document list from the database (${e.message || 'error'}). If migrations are incomplete or the **documents** table is missing, check **document-service** and shared **PostgreSQL** connectivity.`;
  }
}

const { isReadablePassage, cleanPassage, scorePassageForQuery } = require('../utils/textQuality');

function stripUnsafeText(s) {
  return String(s ?? '')
    .replace(/\0/g, '')
    .replace(/[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '')
    .trim();
}

function extractContentFromHit(hit) {
  const p = hit?.payload || {};
  let raw = '';
  if (typeof p.content === 'string' && p.content.trim()) {
    raw = stripUnsafeText(p.content);
  } else if (typeof p.text_preview === 'string' && p.text_preview.trim()) {
    raw = stripUnsafeText(p.text_preview);
  }
  if (!raw || !isReadablePassage(raw, { minLen: 30 })) {
    return '';
  }
  return raw;
}

/** @deprecated alias */
function extractPreviewFromHit(hit) {
  return extractContentFromHit(hit);
}

/**
 * Grounded answer for a single selected document (Qdrant and/or plaintext excerpts).
 */
function synthesizeDocumentScopedReply({ filename, userQuery, hits, plainPassages }) {
  const { buildDocumentAnswer } = require('./answerSynthesis');
  return buildDocumentAnswer({ filename, userQuery, hits, plainPassages });
}

function buildWhichDocumentReply(filename) {
  if (!filename) {
    return 'No document is currently selected for this chat. Mention a file name in your message (for example: “In Security_Report.pdf, what is the conclusion?”) or ask “What documents do I have uploaded?”';
  }
  return `This conversation is scoped to **${filename}**. Follow-up questions will use the same file until you mention a different file name or send **Clear selected document**.`;
}

function buildClearDocumentReply() {
  return 'The selected document has been cleared. You can ask general platform questions, or mention a file name to focus on a specific upload.';
}

/**
 * Readable synthesis from Qdrant hits (no raw score lines unless debug).
 */
function synthesizeSemanticFromHits(userQuery, hits, { collectionName }) {
  const list = (hits || [])
    .map((h) => ({ preview: extractContentFromHit(h), hit: h }))
    .filter((x) => x.preview.length > 0);

  if (list.length === 0) {
    return `I did not find indexed passages that clearly match your question. Upload a document in **Documents**, then run **AI Assistant → Analyze** on the text you care about so it is embedded into **Qdrant**, and try again with concrete terms that appear in that material.\n\n**Your question:** ${truncate(userQuery, 220)}`;
  }

  const seen = new Set();
  const unique = [];
  for (const item of list) {
    const key = item.preview.slice(0, 120).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
    if (unique.length >= 5) break;
  }

  const parts = [];
  parts.push('Based on the indexed content available in your workspace:');
  unique.forEach((item, i) => {
    const snippet = truncate(item.preview, 720);
    if (i === 0) {
      parts.push(`\nThe strongest match suggests:\n${snippet}`);
    } else {
      parts.push(`\nAdditional relevant material:\n${snippet}`);
    }
  });
  parts.push(
    '\nThese excerpts are retrieved by **semantic similarity** (same Qdrant collection as **AI Assistant → Search**). Rephrase with domain keywords from your files if you need a tighter match.',
  );
  return parts.join('\n');
}

function buildDebugFooter({ intent, hits, collectionName, qdrantSkipped }) {
  let s = '\n\n--- DEBUG ---\n';
  s += `intent: ${intent || 'semantic_search'}\n`;
  s += `collection: ${collectionName}\n`;
  if (qdrantSkipped) {
    s += 'qdrant: skipped (template / SQL intent)\n';
  } else if (hits?.length) {
    s += `qdrant_hits: ${hits.length}\n`;
    hits.slice(0, 8).forEach((h, i) => {
      const sc = typeof h.score === 'number' ? h.score.toFixed(6) : String(h.score ?? '');
      s += `  [${i}] score=${sc} id=${h.id}\n`;
      const sn = extractPreviewFromHit(h).slice(0, 180);
      if (sn) s += `      snippet: ${sn}…\n`;
    });
  } else {
    s += 'qdrant: no hits\n';
  }
  return s;
}

function buildDocumentNotReadyReply(filename, status) {
  const st = String(status || 'unknown').toUpperCase();
  return `**${filename}** is still being processed (status: **${st}**). Wait until it becomes **READY**, then ask your question again. Upload PDF or TXT for automatic text extraction and RAG indexing.`;
}

function buildNoDocumentSelectedReply() {
  return 'No document is selected for this chat. Mention a file name in your message (for example: “In Security_Report.pdf, how is integrity verified?”) or ask “What documents do I have uploaded?”';
}

module.exports = {
  CHAT_DEBUG,
  detectIntent,
  buildUploadedDocumentsReply,
  synthesizeSemanticFromHits,
  synthesizeDocumentScopedReply,
  buildWhichDocumentReply,
  buildClearDocumentReply,
  buildDocumentNotReadyReply,
  buildNoDocumentSelectedReply,
  buildDebugFooter,
  extractContentFromHit,
  STATIC,
};
