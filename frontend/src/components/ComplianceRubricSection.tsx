import { ClipboardList } from 'lucide-react';
import { RUBRIC_TASKS, type RubricTaskStatus } from '../data/rubricCompliance';
import { Badge, type BadgeVariant } from './ui/Badge';
import { Card } from './ui/Card';
import { TableShell } from './ui/DataTable';

function statusBadgeVariant(s: RubricTaskStatus): BadgeVariant {
  if (s === 'Met') return 'success';
  if (s === 'Partial') return 'warning';
  return 'neutral';
}

export function ComplianceRubricSection() {
  return (
    <section className="space-y-6" aria-labelledby="rubric-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300 ring-1 ring-violet-400/25">
            <ClipboardList className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Course rubric</p>
            <h3 id="rubric-heading" className="mt-1 font-display text-base font-semibold text-white md:text-lg">
              Compliance checklist — Tasks 1–20
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
              Mapped to this codebase for demos and reports. Status reflects implementation depth — not a formal certification.
              Evidence points to architecture and commands; this UI never loads environment secrets.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="success" className="normal-case">
            Met
          </Badge>
          <Badge variant="warning" className="normal-case">
            Partial
          </Badge>
          <Badge variant="neutral" className="normal-case">
            N/A
          </Badge>
        </div>
      </div>

      <TableShell className="hidden md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-neon-cyan/15 bg-soc-panel/95 font-mono text-[11px] uppercase tracking-wider text-neon-cyan/70 backdrop-blur-md">
            <tr>
              <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider">Task</th>
              <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider">Topic</th>
              <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider">Status</th>
              <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider">Evidence</th>
              <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider">Where to demo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {RUBRIC_TASKS.map((row) => (
              <tr key={row.task} className="align-top transition-colors hover:bg-white/[0.02]">
                <td className="whitespace-nowrap px-4 py-4 font-mono text-xs font-semibold text-cyan-300/90">
                  {row.task}
                </td>
                <td className="px-4 py-4 font-medium text-slate-100">{row.title}</td>
                <td className="px-4 py-4">
                  <Badge variant={statusBadgeVariant(row.status)} className="normal-case">
                    {row.status}
                  </Badge>
                </td>
                <td className="max-w-md px-4 py-4 text-slate-400 leading-relaxed">{row.evidence}</td>
                <td className="max-w-sm px-4 py-4 text-slate-400 leading-relaxed">{row.demo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>

      <div className="grid gap-3 md:hidden">
        {RUBRIC_TASKS.map((row) => (
          <Card key={row.task} className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold text-cyan-300">Task {row.task}</span>
              <Badge variant={statusBadgeVariant(row.status)} className="normal-case">
                {row.status}
              </Badge>
            </div>
            <h4 className="mt-2 font-display text-sm font-semibold text-white">{row.title}</h4>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Evidence</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-400">{row.evidence}</p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Where to demo</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-400">{row.demo}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}
