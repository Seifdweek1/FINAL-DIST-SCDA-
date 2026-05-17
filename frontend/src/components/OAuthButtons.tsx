import { useEffect, useState } from 'react';
import { apiUrl } from '../config';
import { fetchOAuthProviders, type OAuthProviderInfo } from '../services/authService';

function providerLabel(id: string, name: string) {
  if (name) return name;
  if (id === 'google') return 'Google';
  if (id === 'github') return 'GitHub';
  if (id === 'microsoft') return 'Microsoft';
  return id;
}

function providerIcon(id: string) {
  if (id === 'google') {
    return (
      <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
        <path
          fill="#EA4335"
          d="M12 10.2v3.6h5.1c-.2 1.2-1.5 3.6-5.1 3.6-3.1 0-5.6-2.5-5.6-5.6S8.9 6.2 12 6.2c1.8 0 3 .8 3.7 1.5l2.5-2.4C16.9 3.8 14.6 3 12 3 7 3 3 7 3 12s4 9 9 9c5.2 0 8.6-3.7 8.6-8.9 0-.6-.1-1-.2-1.3H12z"
        />
      </svg>
    );
  }
  if (id === 'github') {
    return (
      <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24" aria-hidden>
        <path d="M12 2C6.48 2 2 6.58 2 12.26c0 4.52 2.87 8.35 6.84 9.7.5.1.68-.22.68-.48 0-.24-.01-.87-.01-1.7-2.78.62-3.37-1.36-3.37-1.36-.45-1.18-1.12-1.5-1.12-1.5-.92-.64.07-.63.07-.63 1.02.07 1.55 1.07 1.55 1.07.9 1.57 2.36 1.12 2.94.86.09-.67.35-1.12.64-1.38-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.32.1-2.74 0 0 .84-.27 2.75 1.02A9.3 9.3 0 0 1 12 6.84c.85 0 1.71.12 2.51.34 1.9-1.29 2.74-1.02 2.74-1.02.55 1.42.2 2.48.1 2.74.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.81-4.57 5.07.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.8 0 .27.18.58.69.48A10.03 10.03 0 0 0 22 12.26C22 6.58 17.52 2 12 2z" />
      </svg>
    );
  }
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
      <path fill="#F25022" d="M1 1h10v10H1z" />
      <path fill="#7FBA00" d="M13 1h10v10H13z" />
      <path fill="#00A4EF" d="M1 13h10v10H1z" />
      <path fill="#FFB900" d="M13 13h10v10H13z" />
    </svg>
  );
}

export function OAuthButtons() {
  const [providers, setProviders] = useState<OAuthProviderInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchOAuthProviders()
      .then((res) => setProviders(res.providers))
      .catch(() => setProviders([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading || providers.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">
      <div className="relative flex items-center gap-3 py-2">
        <span className="h-px flex-1 bg-white/10" />
        <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Or continue with</span>
        <span className="h-px flex-1 bg-white/10" />
      </div>
      <ul className="mt-4 space-y-2.5">
        {providers.map((p) => (
          <li key={p.id}>
            <a
              href={apiUrl(`/api/auth/oauth/${p.id}`)}
              className="oauth-btn flex w-full items-center justify-center gap-3 rounded-xl border border-white/15 bg-black/40 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-accent-purple/40 hover:bg-accent-purple/10"
            >
              {providerIcon(p.id)}
              <span>{providerLabel(p.id, p.name)}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
