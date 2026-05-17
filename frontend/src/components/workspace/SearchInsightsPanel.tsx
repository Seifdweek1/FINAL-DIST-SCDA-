import { ChevronDown, ChevronRight, FileText } from 'lucide-react';
import { useState } from 'react';
import type { SearchResponse } from '../../services/aiService';
import { CopyButton } from '../CopyButton';
import { Spinner } from '../ui/Spinner';

type Props = {
  result: SearchResponse | null;
  loading: boolean;
};

function confidenceColor(c?: string) {
  if (c === 'high') return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
  if (c === 'medium') return 'text-accent-orange border-accent-orange/30 bg-accent-orange/10';
  return 'text-theme-muted border-theme-line bg-theme-panel';
}

export function SearchInsightsPanel({ result, loading }: Props) {
  const [showTechnical, setShowTechnical] = useState(false);

  return (
    <aside className="flex h-full min-h-0 flex-col border-l border-theme-line bg-theme-deep/80">
      <div className="border-b border-theme-line px-4 py-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-orange">Insights</p>
        <h2 className="mt-1 font-display text-lg font-bold text-theme-primary">Semantic matches</h2>
        <p className="mt-1 text-xs text-theme-muted">Cosine similarity · multi-query expansion</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <Spinner />
            <p className="text-xs text-theme-muted">Embedding query & scanning vectors…</p>
          </div>
        ) : !result ? (
          <p className="py-12 text-center text-sm leading-relaxed text-theme-muted">
            Run a search to see short answers, related files, and ranked chunks with confidence scores.
          </p>
        ) : (
          <div className="space-y-4 animate-fade-in">
            <section className="rounded-2xl border border-accent-purple/30 bg-gradient-to-br from-accent-purple/10 to-transparent p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-accent-purple-light">Short answer</p>
                <CopyButton text={result.answer} label="Copy answer" />
              </div>
              <p className="mt-2 text-sm leading-relaxed text-theme-primary">{result.answer}</p>
            </section>

            {result.related_documents && result.related_documents.length > 0 ? (
              <section>
                <p className="mb-2 text-xs font-semibold text-theme-muted">Related documents</p>
                <ul className="space-y-2">
                  {result.related_documents.map((d) => (
                    <li
                      key={d.document_id}
                      className="flex items-center gap-2 rounded-xl border border-theme-line bg-theme-panel/60 px-3 py-2 text-xs"
                    >
                      <FileText className="h-4 w-4 shrink-0 text-accent-orange" aria-hidden />
                      <span className="min-w-0 flex-1 truncate font-medium text-theme-primary">
                        {d.document_name || d.document_id.slice(0, 8)}
                      </span>
                      <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] ${confidenceColor(d.confidence)}`}>
                        {Math.round(d.best_score * 100)}%
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section>
              <p className="mb-2 text-xs font-semibold text-theme-muted">
                Top chunks ({result.results.length})
              </p>
              <ul className="space-y-3">
                {result.results.map((hit) => (
                  <li
                    key={String(hit.id)}
                    className="rounded-xl border border-theme-line bg-theme-panel/70 p-3 transition hover:border-accent-purple/25"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${confidenceColor(hit.confidence)}`}>
                        {hit.confidence || '—'} · {(hit.score * 100).toFixed(0)}%
                      </span>
                      {hit.document_name ? (
                        <span className="truncate text-[11px] font-medium text-accent-orange">
                          {hit.document_name}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 line-clamp-4 text-xs leading-relaxed text-theme-muted">
                      {hit.text_preview || '—'}
                    </p>
                  </li>
                ))}
              </ul>
            </section>

            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg border border-theme-line px-3 py-2 text-xs text-theme-muted hover:bg-theme-panel"
              onClick={() => setShowTechnical((v) => !v)}
            >
              {showTechnical ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              Technical JSON
            </button>
            {showTechnical ? (
              <pre className="max-h-48 overflow-auto rounded-xl border border-theme-line bg-black/40 p-3 font-mono text-[10px] text-slate-400">
                {JSON.stringify(result, null, 2)}
              </pre>
            ) : null}
          </div>
        )}
      </div>
    </aside>
  );
}
