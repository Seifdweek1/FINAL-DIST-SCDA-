import { FileText, ShieldCheck, Trash2 } from 'lucide-react';
import type { DocumentRow } from '../../services/documentService';
import { Badge } from '../ui/Badge';

function statusTone(status: DocumentRow['status']): 'success' | 'warning' | 'neutral' | 'error' {
  if (status === 'ready' || status === 'indexed') return 'success';
  if (status === 'failed') return 'error';
  if (status === 'processing' || status === 'queued') return 'warning';
  return 'neutral';
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type Props = {
  doc: DocumentRow;
  selected?: boolean;
  onSelect?: () => void;
  onDelete?: () => void;
};

export function FileCard({ doc, selected, onSelect, onDelete }: Props) {
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.();
        }
      }}
      className={`group relative cursor-pointer overflow-hidden rounded-2xl border p-3 transition-all duration-200 animate-fade-in ${
        selected
          ? 'border-accent-orange/60 bg-gradient-to-br from-accent-purple/15 to-accent-orange/10 shadow-glow-purple'
          : 'border-theme-line bg-theme-panel/80 hover:border-accent-purple/40 hover:shadow-card-hover'
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
            selected
              ? 'bg-accent-orange/20 text-accent-orange'
              : 'bg-accent-purple/15 text-accent-purple-light'
          }`}
        >
          <FileText className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-theme-primary" title={doc.original_filename}>
            {doc.original_filename}
          </p>
          <p className="mt-0.5 text-[11px] text-theme-muted">
            {formatSize(doc.size)} · {new Date(doc.created_at).toLocaleDateString()}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge variant={statusTone(doc.status)}>{doc.status}</Badge>
            {doc.sha256_hash ? (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-theme-muted">
                <ShieldCheck className="h-3 w-3 text-emerald-400" aria-hidden />
                SHA-256
              </span>
            ) : null}
          </div>
        </div>
        {onDelete ? (
          <button
            type="button"
            className="rounded-lg p-1.5 text-theme-muted opacity-0 transition hover:bg-red-500/15 hover:text-red-400 group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            aria-label={`Delete ${doc.original_filename}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </article>
  );
}
