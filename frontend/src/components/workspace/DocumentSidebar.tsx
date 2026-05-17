import { useCallback, useRef, useState } from 'react';
import { CloudUpload, FolderOpen, RefreshCw } from 'lucide-react';
import type { DocumentRow } from '../../services/documentService';
import { FileCard } from './FileCard';
import { Spinner } from '../ui/Spinner';

type Props = {
  documents: DocumentRow[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (doc: DocumentRow) => void;
  onUpload: (file: File) => Promise<void>;
  onRefresh: () => void;
  onDelete?: (doc: DocumentRow) => void;
};

export function DocumentSidebar({
  documents,
  loading,
  selectedId,
  onSelect,
  onUpload,
  onRefresh,
  onDelete,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return;
      setUploading(true);
      try {
        await onUpload(file);
      } finally {
        setUploading(false);
      }
    },
    [onUpload],
  );

  return (
    <aside className="flex h-full min-h-0 flex-col border-r border-theme-line bg-theme-deep/90">
      <div className="border-b border-theme-line px-4 py-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-purple-light">Vault</p>
        <h2 className="mt-1 font-display text-lg font-bold text-theme-primary">Your files</h2>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            className="rounded-lg border border-theme-line p-2 text-theme-muted transition hover:border-accent-purple/40 hover:text-accent-purple-light"
            onClick={onRefresh}
            aria-label="Refresh files"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-purple to-accent-orange px-3 py-2 text-xs font-semibold text-white shadow-glow-cyan transition hover:opacity-95"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Spinner size="sm" /> : <CloudUpload className="h-4 w-4" />}
            Upload
          </button>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".pdf,.txt,.doc,.docx,.pptx"
            onChange={(e) => void handleFiles(e.target.files)}
          />
        </div>
      </div>

      <div
        className={`mx-3 mb-3 rounded-2xl border-2 border-dashed p-4 text-center transition ${
          dragOver
            ? 'border-accent-orange bg-accent-orange/10'
            : 'border-theme-line bg-theme-panel/50 hover:border-accent-purple/30'
        }`}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void handleFiles(e.dataTransfer.files);
        }}
      >
        <FolderOpen className="mx-auto h-6 w-6 text-accent-purple-light/70" aria-hidden />
        <p className="mt-2 text-xs text-theme-muted">Drop PDF, DOCX, TXT, or PPTX</p>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-4">
        {loading && !documents.length ? (
          <p className="py-8 text-center text-xs text-theme-muted">Loading documents…</p>
        ) : documents.length === 0 ? (
          <p className="py-8 text-center text-xs leading-relaxed text-theme-muted">
            No files yet. Upload to index chunks and enable semantic search.
          </p>
        ) : (
          documents.map((doc) => (
            <FileCard
              key={doc.id}
              doc={doc}
              selected={selectedId === doc.id}
              onSelect={() => onSelect(doc)}
              onDelete={onDelete ? () => onDelete(doc) : undefined}
            />
          ))
        )}
      </div>
    </aside>
  );
}
