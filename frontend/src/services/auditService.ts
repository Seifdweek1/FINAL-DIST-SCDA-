import { apiJson } from './api';

export type AuditLogRow = {
  id: string;
  user_id: string | null;
  service: string;
  action: string;
  status: string;
  ip_address: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

export type AuditListResponse = {
  logs: AuditLogRow[];
  total: number;
  limit: number;
  offset: number;
};

export type AuditStatsResponse = {
  stats: {
    total_logs: number;
    total_requests: number;
    total_users: number;
    failed_logins: number;
    uploaded_files: number;
    uploads: number;
    downloads: number;
    processed_jobs: number;
    unauthorized_attempts: number;
    ai_queries: number;
  };
};

export async function listAuditLogs(params: {
  service?: string;
  action?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<AuditListResponse> {
  const qs = new URLSearchParams();
  if (params.service) qs.set('service', params.service);
  if (params.action) qs.set('action', params.action);
  if (params.status) qs.set('status', params.status);
  if (params.limit != null) qs.set('limit', String(params.limit));
  if (params.offset != null) qs.set('offset', String(params.offset));
  const q = qs.toString();
  return apiJson<AuditListResponse>(`/api/audit/logs${q ? `?${q}` : ''}`);
}

export async function auditStats(params: {
  service?: string;
  action?: string;
  status?: string;
}): Promise<AuditStatsResponse> {
  const qs = new URLSearchParams();
  if (params.service) qs.set('service', params.service);
  if (params.action) qs.set('action', params.action);
  if (params.status) qs.set('status', params.status);
  const q = qs.toString();
  return apiJson<AuditStatsResponse>(`/api/audit/logs/stats${q ? `?${q}` : ''}`);
}
