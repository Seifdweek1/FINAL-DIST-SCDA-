import type { DocumentRow, DocumentStatus, VerifyResult } from '../services/documentService';
import {
  deleteDocument,
  downloadDocument,
  listDocuments,
  uploadDocument,
  verifyDocument,
} from '../services/documentService';
import { formatError } from '../utils/errors';
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Download, FileText, Loader2, ShieldCheck, Trash2, UploadCloud } from 'lucide-react';
import { Alert } from '../components/ui/Alert';
import { Badge, type BadgeVariant } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { Spinner } from '../components/ui/Spinner';
import { TableShell } from '../components/ui/DataTable';

function statusVariant(status: DocumentStatus): BadgeVariant {
  switch (status) {
    case 'ready':
      return 'success';
    case 'indexed':
      return 'success';
    case 'failed':
      return 'error';
    case 'queued':
    case 'processing':
      return 'info';
    case 'uploaded':
    default:
      return 'warning';
  }
}

function DocStatusBadge({ status }: { status: DocumentStatus }) {
  return <Badge variant={statusVariant(status)}>{status}</Badge>;
}

export function DocumentsPage() {
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [verifyMap, setVerifyMap] = useState<Record<string, VerifyResult | null>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const { documents } = await listDocuments();
      setDocs(documents);
      setErr(null);
    } catch (e) {
      setErr(formatError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void load();
    }, 5000);
    return () => window.clearInterval(id);
  }, [load]);

  const performUpload = useCallback(
    async (file: File) => {
      setUploadMsg(null);
      setUploading(true);
      try {
        const { document } = await uploadDocument(file);
        setUploadMsg(`Uploaded “${document.original_filename}” — status: ${document.status}`);
        await load();
      } catch (e) {
        setUploadMsg(formatError(e));
      } finally {
        setUploading(false);
      }
    },
    [load],
  );

  async function onUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await performUpload(file);
  }

  async function onVerify(id: string) {
    setBusyId(id);
    try {
      const r = await verifyDocument(id);
      setVerifyMap((m) => ({ ...m, [id]: r }));
    } catch (e) {
      setVerifyMap((m) => ({ ...m, [id]: null }));
      alert(formatError(e));
    } finally {
      setBusyId(null);
    }
  }

  async function onDownload(doc: DocumentRow) {
    setBusyId(doc.id);
    try {
      await downloadDocument(doc.id, doc.original_filename);
    } catch (e) {
      alert(formatError(e));
    } finally {
      setBusyId(null);
    }
  }

  async function onDelete(id: string) {
    if (!window.confirm('Delete this document permanently?')) return;
    setBusyId(id);
    try {
      await deleteDocument(id);
      setVerifyMap((m) => {
        const n = { ...m };
        delete n[id];
        return n;
      });
      await load();
    } catch (e) {
      alert(formatError(e));
    } finally {
      setBusyId(null);
    }
  }

  const inputAccept =
    '.pdf,.txt,.doc,.docx,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  return (
    <div className="space-y-8 page-section">
      <div className="cyber-panel px-5 py-5 md:px-8">
        <p className="soc-label relative z-20 text-neon-cyan/65">Evidence pipeline</p>
        <h2 className="relative z-20 mt-2 font-display text-lg font-bold text-white">File ingest &amp; integrity</h2>
        <p className="relative z-20 mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
          Allowed types follow the document-service policy (PDF, TXT, DOC, DOCX). Files are encrypted at rest; the worker
          moves status from <strong className="text-neon-cyan/90">queued</strong> toward{' '}
          <strong className="text-neon-green/90">ready</strong>.
        </p>
      </div>

      <Card className="p-0 ring-1 ring-neon-cyan/12">
        <label
          htmlFor="doc-upload"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          className="block cursor-pointer p-6 outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan/50 focus-visible:ring-offset-2 focus-visible:ring-offset-soc-void"
        >
          <input
            ref={inputRef}
            id="doc-upload"
            type="file"
            accept={inputAccept}
            disabled={uploading}
            className="sr-only"
            onChange={onUpload}
          />
          <div
            onDragEnter={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragActive(false);
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              const file = e.dataTransfer.files?.[0];
              if (file && !uploading) void performUpload(file);
            }}
            className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-14 text-center transition-all duration-300 ${
              dragActive
                ? 'border-neon-cyan/70 bg-neon-cyan/10 shadow-glow-cyan'
                : 'border-neon-cyan/20 bg-gradient-to-b from-soc-panel/50 to-black/20 hover:border-neon-cyan/45 hover:shadow-[0_0_32px_-8px_rgba(0,213,255,0.15)]'
            } ${uploading ? 'pointer-events-none opacity-70' : ''}`}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan shadow-glow-cyan">
              {uploading ? <Loader2 className="h-7 w-7 animate-spin" aria-hidden /> : <UploadCloud className="h-7 w-7" aria-hidden />}
            </div>
            <p className="mt-4 font-display text-base font-semibold text-white">Drop files to upload</p>
            <p className="mt-1 text-sm text-slate-500">or click to browse — PDF, TXT, DOC, DOCX only</p>
            {uploading ? (
              <p className="mt-4 flex items-center justify-center gap-2 text-sm text-cyan-200/90">
                <Spinner size="sm" />
                Uploading…
              </p>
            ) : null}
          </div>
        </label>
        {uploadMsg ? (
          uploadMsg.startsWith('Uploaded') ? (
            <Alert variant="success" className="mx-6 mb-6 mt-0" title="Upload complete" role="status">
              {uploadMsg}
            </Alert>
          ) : (
            <Alert variant="error" className="mx-6 mb-6 mt-0" title="Upload failed" role="status">
              {uploadMsg}
            </Alert>
          )
        ) : null}
      </Card>

      {err ? (
        <Alert variant="error" title="Could not load documents">
          {err}
        </Alert>
      ) : null}

      <TableShell>
        <table className="min-w-full text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-neon-cyan/15 bg-soc-panel/95 font-mono text-[11px] uppercase tracking-wider text-neon-cyan/70 backdrop-blur-md">
            <tr>
              <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider">File</th>
              <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider">Status</th>
              <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider">Size</th>
              <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider">SHA-256 (stored)</th>
              <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {loading ? (
              <>
                {[0, 1, 2].map((i) => (
                  <tr key={i}>
                    <td className="px-4 py-4" colSpan={5}>
                      <div className="flex items-center gap-4">
                        <Skeleton className="h-4 flex-1 max-w-xs" />
                        <Skeleton className="h-6 w-20 rounded-full" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                    </td>
                  </tr>
                ))}
              </>
            ) : docs.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-4">
                  <div className="empty-state">
                    <div className="empty-state-icon">
                      <FileText className="h-7 w-7" aria-hidden />
                    </div>
                    <p className="font-display text-sm font-semibold text-white">No documents in your workspace</p>
                    <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">
                      Upload a file above to enqueue processing. Status moves from <span className="text-slate-400">queued</span>{' '}
                      toward <span className="text-slate-400">ready</span> as the worker acknowledges the job.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              docs.map((d) => {
                const vr = verifyMap[d.id];
                return (
                  <tr key={d.id} className="bg-transparent transition-colors hover:bg-white/[0.02]">
                    <td className="px-4 py-3.5 font-medium text-slate-100">{d.original_filename}</td>
                    <td className="px-4 py-3.5">
                      <DocStatusBadge status={d.status} />
                    </td>
                    <td className="px-4 py-3.5 tabular-nums text-slate-400">{d.size.toLocaleString()} B</td>
                    <td className="max-w-xs break-all px-4 py-3.5 font-mono text-xs text-slate-500">{d.sha256_hash ?? '—'}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={busyId === d.id}
                          className="gap-1.5 px-3 py-1.5 text-xs"
                          onClick={() => void onVerify(d.id)}
                        >
                          <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                          Verify
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={busyId === d.id}
                          className="gap-1.5 px-3 py-1.5 text-xs"
                          onClick={() => void onDownload(d)}
                        >
                          <Download className="h-3.5 w-3.5" aria-hidden />
                          Download
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          disabled={busyId === d.id}
                          className="gap-1.5 px-3 py-1.5 text-xs"
                          onClick={() => void onDelete(d.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          Delete
                        </Button>
                      </div>
                      {vr ? (
                        <Alert
                          variant={vr.integrity_valid ? 'success' : 'error'}
                          className="mt-3"
                          title={vr.integrity_valid ? 'Integrity verified' : 'Integrity mismatch'}
                        >
                          <span className="font-mono text-xs break-all">
                            <strong>Integrity:</strong> {vr.integrity_valid ? 'VALID' : 'INVALID'} · {vr.sha256_hash}
                          </span>
                          {vr.legacy ? ' · legacy path' : ''}
                        </Alert>
                      ) : null}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </TableShell>
    </div>
  );
}
