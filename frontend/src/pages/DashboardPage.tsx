import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ProgressBar from 'react-bootstrap/ProgressBar';
import {
  ArrowUpRight,
  CircleDollarSign,
  ClipboardList,
  FolderLock,
  KeyRound,
  MessagesSquare,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { aiHealth } from '../services/aiService';
import { auditStats } from '../services/auditService';
import { listDocuments } from '../services/documentService';
import { formatError } from '../utils/errors';
import { Alert } from '../components/ui/Alert';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { Spinner } from '../components/ui/Spinner';

type KpiState = {
  docCount: number | null;
  auditTotal: number | null;
  aiLine: string;
  securityLabel: string;
  securityVariant: 'success' | 'warning' | 'error';
};

export function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const [aiBanner, setAiBanner] = useState<string>('');
  const [aiErr, setAiErr] = useState<string | null>(null);
  const [kpiLoading, setKpiLoading] = useState(true);
  const [kpiErr, setKpiErr] = useState<string | null>(null);
  const [kpi, setKpi] = useState<KpiState>({
    docCount: null,
    auditTotal: null,
    aiLine: '…',
    securityLabel: '…',
    securityVariant: 'warning',
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setKpiLoading(true);
      setKpiErr(null);
      try {
        const [docRes, health] = await Promise.all([listDocuments(), aiHealth()]);
        if (cancelled) return;

        const docCount = docRes.documents.length;
        setAiBanner(`${health.status} · collection ${health.collection ?? '—'}`);
        setAiErr(null);

        let auditTotal: number | null = null;
        if (isAdmin) {
          try {
            const { stats } = await auditStats({});
            if (!cancelled) auditTotal = stats.total_logs;
          } catch {
            if (!cancelled) auditTotal = null;
          }
        }

        const aiOk =
          health.qdrant?.ok !== false &&
          !health.qdrant?.error &&
          !String(health.status || '')
            .toLowerCase()
            .includes('down');
        const aiLine = aiOk ? 'Operational' : 'Check pipeline';

        let securityLabel = 'All systems nominal';
        let securityVariant: KpiState['securityVariant'] = 'success';
        if (!aiOk) {
          securityLabel = 'AI subsystem needs attention';
          securityVariant = 'error';
        }

        setKpi({
          docCount,
          auditTotal,
          aiLine,
          securityLabel,
          securityVariant,
        });
      } catch (e) {
        if (!cancelled) {
          setKpiErr(formatError(e));
          setAiErr(formatError(e));
          setKpi((k) => ({
            ...k,
            docCount: null,
            aiLine: 'Unavailable',
            securityLabel: 'Degraded posture',
            securityVariant: 'error',
          }));
        }
      } finally {
        if (!cancelled) setKpiLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  const modules = [
    {
      to: '/documents',
      title: 'Document vault',
      desc: 'Upload, verify SHA-256, download, and manage files.',
      icon: FolderLock,
      tone: 'purple' as const,
    },
    {
      to: '/ai',
      title: 'Smart search',
      desc: 'Semantic lookup across indexed content in Qdrant.',
      icon: Sparkles,
      tone: 'orange' as const,
    },
    {
      to: '/chat',
      title: 'Document chat',
      desc: 'Ask questions against your selected indexed document.',
      icon: MessagesSquare,
      tone: 'purple' as const,
    },
    {
      to: '/security',
      title: 'Security center',
      desc: 'How this stack meets compliance-oriented controls.',
      icon: KeyRound,
      tone: 'orange' as const,
    },
    ...(isAdmin
      ? [
          {
            to: '/audit',
            title: 'Monitoring',
            desc: 'Platform metrics, failed logins, jobs, AI queries, and audit log (admin).',
            icon: ClipboardList,
            tone: 'purple' as const,
          },
        ]
      : []),
  ];

  const toneClass = (tone: 'purple' | 'orange') =>
    tone === 'purple'
      ? 'border-accent-purple/35 bg-accent-purple/10 text-accent-purple-light'
      : 'border-accent-orange/35 bg-accent-orange/10 text-accent-orange-light';

  return (
    <div className="space-y-8 page-section">
      <div className="insta-panel flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="insta-label">Your workspace</p>
          <p className="mt-2 text-sm text-slate-400">
            Signed in as <span className="font-semibold text-accent-purple-light">{user?.email}</span>
            <Badge variant="neutral" className="ml-2 align-middle">
              {user?.role}
            </Badge>
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-accent-purple/25 bg-accent-purple/10 px-4 py-2 text-sm text-accent-purple-light">
          <TrendingUp className="h-4 w-4 shrink-0" />
          Live metrics below
        </div>
      </div>

      {kpiErr ? (
        <Alert variant="warning" title="Partial dashboard data">
          {kpiErr}
        </Alert>
      ) : null}

      <div className="glass-card flex flex-col gap-4 border-accent-purple/20 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-accent-orange/30 bg-accent-orange/10 text-accent-orange">
            <CircleDollarSign className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <div className="insta-label text-slate-500">Service status</div>
            <div className="mt-1 text-sm font-medium text-slate-200">AI &amp; vector search</div>
            <div className="mt-1 text-sm text-slate-400">
              {aiErr ? <span className="text-rose-300">{aiErr}</span> : aiBanner || '…'}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {aiErr || (!kpiLoading && kpi.aiLine !== 'Operational') ? (
            <Badge variant="warning">Attention</Badge>
          ) : (
            <Badge variant="success">Healthy</Badge>
          )}
        </div>
      </div>

      {kpiLoading ? (
        <ProgressBar animated striped now={100} label="Loading…" className="mb-1" style={{ height: 6 }} />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="insta-label text-slate-500">Documents</div>
              {kpiLoading ? (
                <Skeleton className="mt-3 h-9 w-16" />
              ) : (
                <div className="mt-2 font-display text-3xl font-bold tabular-nums text-white">{kpi.docCount ?? '—'}</div>
              )}
              <p className="mt-2 text-xs text-slate-500">In your vault</p>
            </div>
            <div className={`rounded-xl border p-2.5 ${toneClass('purple')}`}>
              <FolderLock className="h-5 w-5" />
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="insta-label text-slate-500">AI layer</div>
              {kpiLoading ? (
                <Skeleton className="mt-3 h-9 w-24" />
              ) : (
                <div className="mt-2 font-display text-2xl font-bold text-white">{kpi.aiLine}</div>
              )}
              <p className="mt-2 text-xs text-slate-500">Search availability</p>
            </div>
            <div className={`rounded-xl border p-2.5 ${toneClass('orange')}`}>
              <Sparkles className="h-5 w-5" />
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="insta-label text-slate-500">Audit events</div>
              {kpiLoading ? (
                <Skeleton className="mt-3 h-9 w-14" />
              ) : (
                <div className="mt-2 font-display text-3xl font-bold tabular-nums text-white">
                  {isAdmin ? (kpi.auditTotal ?? '—') : '—'}
                </div>
              )}
              <p className="mt-2 text-xs text-slate-500">{isAdmin ? 'Admin view' : 'Admin only'}</p>
            </div>
            <div className={`rounded-xl border p-2.5 ${toneClass('purple')}`}>
              <ClipboardList className="h-5 w-5" />
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="insta-label text-slate-500">Security</div>
              {kpiLoading ? (
                <div className="mt-3 flex items-center gap-2 text-slate-500">
                  <Spinner size="sm" />
                  <span className="text-sm">Checking…</span>
                </div>
              ) : (
                <div className="mt-2 text-lg font-semibold leading-snug text-white">{kpi.securityLabel}</div>
              )}
              <p className="mt-2 text-xs text-slate-500">Gateway posture</p>
            </div>
            <div
              className={`rounded-xl border p-2.5 ${
                kpi.securityVariant === 'success'
                  ? 'border-neon-green/35 bg-neon-green/10 text-neon-green'
                  : kpi.securityVariant === 'error'
                    ? 'border-neon-magenta/35 bg-neon-magenta/10 text-neon-magenta'
                    : 'border-accent-purple/35 bg-accent-purple/10 text-accent-purple-light'
              }`}
            >
              <KeyRound className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </div>

      <div>
        <h2 className="font-display text-lg font-bold text-white">Quick access</h2>
        <p className="insta-label mt-1 text-slate-500">Pick a module</p>
        <ul className="mt-5 flex flex-col gap-3">
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <li key={m.to}>
                <Link
                  to={m.to}
                  className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-soc-panel/60 px-4 py-4 transition-all duration-200 hover:border-accent-purple/40 hover:bg-accent-purple/5 hover:shadow-glow-cyan active:scale-[0.99]"
                >
                  <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${toneClass(m.tone)}`}>
                    <Icon className="h-6 w-6" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display font-semibold text-white">{m.title}</span>
                    <span className="mt-0.5 block text-sm text-slate-400">{m.desc}</span>
                  </span>
                  <ArrowUpRight className="h-5 w-5 shrink-0 text-accent-orange opacity-60 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
