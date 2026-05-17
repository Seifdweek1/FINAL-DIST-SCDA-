import { apiFetch, apiJson, parseJson } from './api';

export type DocumentStatus =
  | 'uploaded'
  | 'queued'
  | 'processing'
  | 'indexed'
  | 'ready'
  | 'failed';

export type DocumentRow = {
  id: string;
  user_id: string;
  original_filename: string;
  mime_type: string;
  size: number;
  sha256_hash: string | null;
  status: DocumentStatus;
  created_at: string;
  updated_at: string;
};

export async function listDocuments(): Promise<{ documents: DocumentRow[] }> {
  return apiJson<{ documents: DocumentRow[] }>('/api/documents');
}

export async function uploadDocument(file: File): Promise<{ document: DocumentRow }> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await apiFetch('/api/documents/upload', {
    method: 'POST',
    body: fd,
  });
  return parseJson<{ document: DocumentRow }>(res);
}

export type VerifyResult = {
  legacy?: boolean;
  integrity_valid: boolean;
  sha256_hash?: string;
  algorithm?: string;
};

export async function verifyDocument(id: string): Promise<VerifyResult> {
  return apiJson<VerifyResult>(`/api/documents/${encodeURIComponent(id)}/verify`);
}

export async function deleteDocument(id: string): Promise<{ deleted: boolean; id: string }> {
  return apiJson<{ deleted: boolean; id: string }>(`/api/documents/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function downloadDocument(id: string, filename: string): Promise<void> {
  const res = await apiFetch(`/api/documents/${encodeURIComponent(id)}/download`);
  if (!res.ok) {
    await parseJson(res);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'download';
  a.click();
  URL.revokeObjectURL(url);
}
