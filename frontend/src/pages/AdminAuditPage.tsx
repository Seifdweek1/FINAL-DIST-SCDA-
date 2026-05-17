import { useEffect, useState } from 'react';
import { Filter, ScrollText } from 'lucide-react';
import { auditStats, listAuditLogs } from '../services/auditService';
import { formatError } from '../utils/errors';
import { Alert } from '../components/ui/Alert';
import { Badge, type BadgeVariant } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { TableShell } from '../components/ui/DataTable';
import { Skeleton } from '../components/ui/Skeleton';

function auditStatusVariant(status: string): BadgeVariant {
  const s = status.toLowerCase();
  if (s.includes('fail') || s.includes('error') || s.includes('denied') || s.includes('unauthorized'))
    return 'error';
  if (s.includes('warn') || s.includes('pending')) return 'warning';
  if (s.includes('success') || s.includes('ok') || s.includes('pass')) return 'success';
  if (s.includes('queue') || s.includes('process')) return 'info';
  return 'neutral';
}

export function AdminAuditPage() {
  const [service, setService] = useState('');
  const [action, setAction] = useState('');
  const [status, setStatus] = useState('');
  const [logs, setLogs] = useState<Awaited<ReturnType<typeof listAuditLogs>>['logs']>([]);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof auditStats>>['stats'] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const f = { service: service || undefined, action: action || undefined, status: status || undefined };
      const [l, s] = await Promise.all([
        listAuditLogs({ ...f, limit: 50, offset: 0 }),
        auditStats(f),
      ]);
      setLogs(l.logs);
      setStats(s.stats);
    } catch (e) {
      setErr(formatError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-8 page-section">
      <div className="cyber-panel px-5 py-6 md:px-8">
        <p className="soc-label relative z-20 text-neon-cyan/70">SOC · monitoring</p>
        <h2 className="relative z-20 mt-2 font-display text-lg font-bold text-white">Monitoring dashboard</h2>
        <p className="relative z-20 mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
          Platform metrics and audit stream. Request, login, job, and AI counts respect filters; user and document totals are
          global. Apply filters after edits.
        </p>
      </div>

      {err ? (
        <Alert variant="error" title="Unable to load audit data">
          {err}
        </Alert>
      ) : null}

      <Card className="p-5 ring-1 ring-neon-cyan/10">
        <div className="flex flex-wrap items-center gap-3 border-b border-neon-cyan/10 pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan">
            <Filter className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h2 className="font-display text-sm font-semibold text-white">Filters</h2>
            <p className="text-xs text-slate-500">Refine logs before aggregations run</p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Service contains</label>
            <input
              className="input-field"
              value={service}
              onChange={(e) => setService(e.target.value)}
              placeholder="e.g. worker-service"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Action contains</label>
            <input
              className="input-field"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              placeholder="e.g. document"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Status equals</label>
            <input
              className="input-field"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              placeholder="e.g. success"
            />
          </div>
        </div>
        <Button type="button" className="mt-5 px-5" onClick={() => void load()}>
          Apply filters
        </Button>
      </Card>

      {loading && !stats ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-3 h-8 w-16" />
            </Card>
          ))}
        </div>
      ) : null}
      {stats ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {(
            [
              ['Total users', stats.total_users],
              ['Total requests', stats.total_requests],
              ['Failed logins', stats.failed_logins],
              ['Uploaded files', stats.uploaded_files],
              ['Processed jobs', stats.processed_jobs],
              ['Unauthorized', stats.unauthorized_attempts],
              ['AI queries', stats.ai_queries],
            ] as const
          ).map(([k, v]) => (
            <Card key={k} className="border-neon-cyan/10 bg-soc-panel/50 p-4 ring-1 ring-white/[0.04]">
              <div className="soc-label text-slate-500">{k}</div>
              <div className="mt-2 font-display text-2xl font-bold tabular-nums tracking-tight text-white">{v}</div>
            </Card>
          ))}
        </div>
      ) : null}

      <TableShell className="max-h-[min(70vh,560px)] overflow-auto ring-1 ring-neon-cyan/10">
        <table className="min-w-full text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-neon-cyan/15 bg-soc-panel/95 font-mono text-[11px] uppercase tracking-wider text-neon-cyan/70 backdrop-blur-md">
            <tr>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider">Time</th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider">Service</th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider">Action</th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider">User</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {loading ? (
              <>
                {[0, 1, 2, 3, 4].map((i) => (
                  <tr key={i} className="border-b border-white/[0.04]">
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-32" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-36" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-28" />
                    </td>
                  </tr>
                ))}
              </>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-4">
                  <div className="empty-state py-12">
                    <div className="empty-state-icon">
                      <ScrollText className="h-7 w-7" aria-hidden />
                    </div>
                    <p className="font-display text-sm font-semibold text-white">No rows for this filter set</p>
                    <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-500">
                      Clear filters and click Apply, or generate traffic (login, upload, AI analyze) and refresh. Logs are
                      written asynchronously — allow a second before refreshing.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              logs.map((row) => (
                <tr key={row.id} className="align-top text-slate-300 transition-colors hover:bg-white/[0.02]">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-400">{new Date(row.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3 font-medium text-slate-100">{row.service}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{row.action}</td>
                  <td className="px-4 py-3">
                    <Badge variant={auditStatusVariant(row.status)}>{row.status}</Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{row.user_id ?? '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableShell>
    </div>
  );
}
