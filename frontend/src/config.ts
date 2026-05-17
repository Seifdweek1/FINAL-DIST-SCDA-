/**
 * API origin. Empty string = same origin (recommended behind nginx at https://localhost).
 * Override at build time: VITE_API_BASE_URL=https://localhost
 */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');

export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${p}`;
}
