import { apiJson } from './api';

export type AiHealth = {
  status: string;
  service?: string;
  qdrant?: { ok: boolean; status?: number; error?: string };
  collection?: string;
};

export type AnalyzeResponse = {
  point_id: string;
  collection: string;
  embedding_model: string;
  dimensions: number;
  stored: boolean;
};

export type SearchHit = {
  id: string | number;
  score: number;
  confidence?: 'high' | 'medium' | 'low' | 'weak';
  document_id?: string | null;
  document_name?: string | null;
  chunk_index?: number | string | null;
  text_preview?: string | null;
  payload: Record<string, unknown> | null;
};

export type RelatedDocument = {
  document_id: string;
  document_name: string | null;
  best_score: number;
  hit_count: number;
  confidence: string;
};

export type SearchResponse = {
  query: string;
  answer: string;
  limit: number;
  results: SearchHit[];
  related_documents?: RelatedDocument[];
  expanded_queries?: string[];
  retrieval?: {
    strategy: string;
    embedding_model: string;
    distance: string;
    variant_count: number;
    candidate_count: number;
  };
};

export type SearchSuggestion = {
  text: string;
  kind: 'seed' | 'history' | 'expansion' | 'completion';
};

export async function aiHealth(): Promise<AiHealth> {
  return apiJson<AiHealth>('/api/ai/health', { auth: false });
}

export async function analyze(payload: {
  text?: string;
  metadata?: Record<string, unknown>;
}): Promise<AnalyzeResponse> {
  return apiJson<AnalyzeResponse>('/api/ai/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function search(q: string, limit = 10): Promise<SearchResponse> {
  const qs = new URLSearchParams({ q, limit: String(limit) });
  return apiJson<SearchResponse>(`/api/ai/search?${qs.toString()}`);
}

export async function searchSuggest(q = '', limit = 8): Promise<{ query: string; suggestions: SearchSuggestion[] }> {
  const qs = new URLSearchParams({ limit: String(limit) });
  if (q.trim()) qs.set('q', q.trim());
  return apiJson<{ query: string; suggestions: SearchSuggestion[] }>(
    `/api/ai/search/suggest?${qs.toString()}`,
  );
}
