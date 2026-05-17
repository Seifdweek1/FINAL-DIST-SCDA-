import {
  Activity,
  Binary,
  Boxes,
  CloudCog,
  FileLock2,
  Gauge,
  KeyRound,
  ListChecks,
  Network,
  Radar,
  ScrollText,
  Server,
  ShieldCheck,
  ShieldQuestion,
} from 'lucide-react';
import { ComplianceRubricSection } from '../components/ComplianceRubricSection';
import { Alert } from '../components/ui/Alert';
import { Card } from '../components/ui/Card';

const iconFor = (title: string) => {
  const t = title.toLowerCase();
  if (t.includes('jwt')) return KeyRound;
  if (t.includes('rbac')) return ShieldQuestion;
  if (t.includes('https') || t.includes('hsts')) return Network;
  if (t.includes('rate')) return Gauge;
  if (t.includes('upload') || t.includes('encryption')) return FileLock2;
  if (t.includes('sha')) return Binary;
  if (t.includes('rabbitmq') || t.includes('worker')) return Activity;
  if (t.includes('audit')) return ScrollText;
  if (t.includes('qdrant')) return Radar;
  return ShieldCheck;
};

export function SecurityDemoPage() {
  const items = [
    {
      title: 'JWT authentication',
      body: 'Users receive HS256 access tokens from auth-service. Protected APIs validate Bearer tokens with the shared JWT_SECRET.',
    },
    {
      title: 'RBAC',
      body: 'Admin vs user roles enforced server-side (e.g. audit list/stats, document cross-user access). The UI hides admin audit for non-admins.',
    },
    {
      title: 'HTTPS & HSTS',
      body: 'nginx terminates TLS on port 443; HTTP redirects to HTTPS (except /nginx-health for probes). HSTS and CSP are set at the gateway.',
    },
    {
      title: 'Rate limiting',
      body: 'nginx applies a general API rate limit and a stricter bucket for POST /api/auth/login to slow brute-force attempts.',
    },
    {
      title: 'Secure upload & encryption',
      body: 'document-service validates type/size, encrypts with AES-256-GCM, stores ciphertext only, and records metadata in PostgreSQL.',
    },
    {
      title: 'SHA-256 integrity',
      body: 'Clients can call verify to re-hash decrypted plaintext and compare to the stored hash using a constant-time check on the server.',
    },
    {
      title: 'RabbitMQ worker',
      body: 'Successful queue publish sets status queued; worker-service consumes document.jobs, simulates processing, and sets ready or failed with DLQ handling.',
    },
    {
      title: 'Central audit logging',
      body: 'audit-service stores structured rows in PostgreSQL. Worker and AI services append via internal API key.',
    },
    {
      title: 'Qdrant semantic search',
      body: 'ai-service embeds content (deterministic demo vectors), upserts to Qdrant, and searches with per-user payload filters.',
    },
  ];

  const architecture = [
    { label: 'Edge', detail: 'nginx API gateway — TLS, CSP, HSTS, rate limits, reverse proxy to internal services.' },
    { label: 'Identity', detail: 'auth-service — issuance and validation of JWTs; user store in PostgreSQL.' },
    { label: 'Documents', detail: 'document-service — encrypted blobs, metadata, integrity hashes, upload pipeline to worker.' },
    { label: 'Async', detail: 'RabbitMQ + worker-service — durable jobs, DLQ, status transitions (queued → ready/failed).' },
    { label: 'Intelligence', detail: 'ai-service + Qdrant — embeddings, vector upsert, filtered semantic retrieval per user.' },
    { label: 'Observability', detail: 'audit-service — normalized security and operational events across services.' },
  ];

  const demoAnchors = [
    'HTTPS entry: https://localhost — trust the dev certificate once for a clean address bar.',
    'Pipeline proof: Documents — upload, watch queued → ready, Verify SHA-256, Download.',
    'Intelligence: AI assistant — Analyze then Search; payloads scoped by user_id in Qdrant.',
    'Telemetry: Audit logs (admin) — filter by service/action after scripted or UI actions.',
    'Broker & vector proof: RabbitMQ management UI (loopback) and Qdrant dashboard — see RUNBOOK.md for URLs.',
    'Edge proof: response headers + HTTP→HTTPS redirect + login rate-limit burst → 429 (FINAL_TEST_COMMANDS.md).',
  ];

  return (
    <div className="space-y-12 page-section">
      <div className="cyber-panel px-6 py-8 md:px-10 md:py-10">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-neon-cyan/10 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-neon-purple/15 blur-3xl" aria-hidden />
        <p className="soc-label relative z-20 text-neon-magenta/80">Incident response · control plane</p>
        <h2 className="relative z-20 mt-3 font-display text-xl font-bold tracking-tight text-white md:text-2xl">
          Security &amp; architecture command
        </h2>
        <p className="relative z-20 mt-4 max-w-3xl text-sm leading-relaxed text-slate-400">
          Live posture view for the secure document assistant stack. Enforcement is server-side and at the gateway — the
          browser never receives private keys, encryption keys, or internal API secrets.
        </p>
        <Alert variant="info" title="Briefing mode" className="relative z-20 mt-6 border-neon-cyan/30 bg-neon-cyan/5">
          Use the checklist below as your slide outline. For authoritative evidence paths, keep{' '}
          <span className="font-mono text-neon-cyan/90">COMPLIANCE_CHECKLIST.md</span> open alongside.
        </Alert>
      </div>

      <section>
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan shadow-glow-cyan">
            <ShieldCheck className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-white md:text-lg">Defense surface</h3>
            <p className="soc-label mt-1 text-slate-500">Capabilities matrix</p>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {items.map((it) => {
            const Icon = iconFor(it.title);
            return (
              <Card key={it.title} interactive className="relative overflow-hidden p-5">
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-80" aria-hidden />
                <div className="relative flex gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-neon-cyan/25 bg-neon-cyan/10 text-neon-cyan shadow-[0_0_20px_-6px_rgba(0,213,255,0.2)]">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-display text-sm font-semibold text-white">{it.title}</h4>
                    <p className="mt-2 text-sm leading-relaxed text-slate-400">{it.body}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        <Card className="p-6 lg:p-8">
          <div className="flex items-center gap-3 border-b border-neon-cyan/10 pb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-neon-blue/30 bg-neon-blue/15 text-blue-200 shadow-[0_0_18px_-4px_rgba(37,99,235,0.35)]">
              <Boxes className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h3 className="font-display text-base font-semibold text-white">Architecture summary</h3>
              <p className="text-xs text-slate-500">How traffic flows through the stack</p>
            </div>
          </div>
          <ul className="mt-6 space-y-5">
            {architecture.map((a) => (
              <li key={a.label} className="flex gap-4">
                <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-neon-cyan shadow-[0_0_12px_rgba(0,213,255,0.65)]" />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold uppercase tracking-wide text-neon-cyan">{a.label}</span>
                    <Server className="h-3.5 w-3.5 text-slate-600" aria-hidden />
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{a.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-6 lg:p-8">
          <div className="flex items-center gap-3 border-b border-neon-green/15 pb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-neon-green/35 bg-neon-green/10 text-neon-green shadow-glow-green">
              <ListChecks className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h3 className="font-display text-base font-semibold text-white">Live demo anchors</h3>
              <p className="text-xs text-slate-500">Where to point the cursor during the presentation</p>
            </div>
          </div>
          <ul className="mt-6 space-y-4">
            {demoAnchors.map((line) => (
              <li
                key={line}
                className="flex gap-3 rounded-xl border border-neon-cyan/10 bg-soc-panel/40 px-4 py-3 font-mono text-xs leading-relaxed text-slate-300 sm:text-sm"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-neon-green shadow-[0_0_8px_rgba(34,197,94,0.6)]" aria-hidden />
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-neon-purple/25 bg-neon-purple/5 px-4 py-3 text-xs leading-relaxed text-violet-100/90">
            <CloudCog className="mt-0.5 h-4 w-4 shrink-0 text-neon-purple" aria-hidden />
            <span>
              Controls are enforced server-side; this UI reflects visibility rules only. Never paste real credentials into
              slides — use placeholders and local `.env` only.
            </span>
          </div>
        </Card>
      </section>

      <ComplianceRubricSection />
    </div>
  );
}
