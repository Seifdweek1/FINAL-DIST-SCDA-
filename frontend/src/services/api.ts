import { apiUrl } from '../config';

const TOKEN_KEY = 'scda_access_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export type ApiErrorBody = {
  error?: { message?: string; details?: unknown };
};

export class ApiError extends Error {
  status: number;

  body: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

function safeMessage(raw: unknown, fallback: string): string {
  if (raw && typeof raw === 'object') {
    const m = (raw as ApiErrorBody).error?.message;
    if (typeof m === 'string' && m.trim()) return m.trim();
  }
  return fallback;
}

export async function apiFetch(
  path: string,
  init: RequestInit & { auth?: boolean } = {},
): Promise<Response> {
  const { auth = true, headers: hdrs, ...rest } = init;
  const headers = new Headers(hdrs);

  if (auth) {
    const t = getStoredToken();
    if (t) headers.set('Authorization', `Bearer ${t}`);
  }

  const res = await fetch(apiUrl(path), {
    ...rest,
    headers,
  });

  if (res.status === 401 && auth) {
    setStoredToken(null);
  }

  return res;
}

function looksLikeHtml(body: string): boolean {
  const s = body.trimStart().slice(0, 64).toLowerCase();
  return s.startsWith('<!doctype') || s.startsWith('<html') || s.startsWith('<head') || s.startsWith('<body');
}

export async function parseJson<T>(res: Response): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    const trimmed = text.trim();
    if (contentType.includes('text/html') || looksLikeHtml(trimmed)) {
      throw new ApiError(
        res.ok
          ? 'API returned HTML instead of JSON (check gateway routing or VITE_API_BASE_URL).'
          : `Request failed (${res.status}) with an HTML error page instead of JSON — often a gateway/upstream issue.`,
        res.status,
        trimmed.slice(0, 800),
      );
    }
    try {
      data = JSON.parse(trimmed);
    } catch {
      throw new ApiError(
        `Invalid JSON from server (${res.status}). ${contentType ? `Content-Type: ${contentType}` : ''}`.trim(),
        res.status,
        trimmed.slice(0, 800),
      );
    }
  }
  if (!res.ok) {
    throw new ApiError(safeMessage(data, res.statusText || 'Request failed'), res.status, data);
  }
  return data as T;
}

export async function apiJson<T>(path: string, init?: RequestInit & { auth?: boolean }): Promise<T> {
  const res = await apiFetch(path, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.headers as Record<string, string>),
    },
  });
  return parseJson<T>(res);
}
