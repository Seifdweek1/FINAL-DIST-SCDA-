import { apiJson, apiFetch, parseJson, setStoredToken } from './api';

export type Role = 'admin' | 'user';

export type PublicUser = {
  id: string;
  email: string;
  role: Role;
  created_at?: string;
};

export type LoginResponse = {
  access_token: string;
  token_type: string;
  expires_in?: number;
  user: PublicUser;
};

export type RegisterResponse = {
  user: PublicUser;
};

export async function register(email: string, password: string): Promise<RegisterResponse> {
  return apiJson<RegisterResponse>('/api/auth/register', {
    method: 'POST',
    auth: false,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const data = await apiJson<LoginResponse>('/api/auth/login', {
    method: 'POST',
    auth: false,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  setStoredToken(data.access_token);
  return data;
}

export async function fetchProfile(): Promise<{ user: PublicUser }> {
  return apiJson<{ user: PublicUser }>('/api/auth/profile');
}

export async function fetchAdminPing(): Promise<{ message: string }> {
  return apiJson<{ message: string }>('/api/auth/admin');
}

export type OAuthProviderInfo = { id: string; name: string };

export async function fetchOAuthProviders(): Promise<{ providers: OAuthProviderInfo[] }> {
  return apiJson<{ providers: OAuthProviderInfo[] }>('/api/auth/oauth/providers', { auth: false });
}

export function parseOAuthCallbackHash(): { access_token?: string; error?: string } {
  const hash = window.location.hash.replace(/^#/, '');
  const params = new URLSearchParams(hash);
  const error = params.get('error') || params.get('error_description') || undefined;
  const access_token = params.get('access_token') || undefined;
  return { access_token: access_token || undefined, error: error || undefined };
}

export function parseOAuthCallbackQuery(): { error?: string } {
  const params = new URLSearchParams(window.location.search);
  const error = params.get('error') || undefined;
  return { error: error || undefined };
}

export function storeTokenFromOAuth(accessToken: string): void {
  setStoredToken(accessToken);
}
