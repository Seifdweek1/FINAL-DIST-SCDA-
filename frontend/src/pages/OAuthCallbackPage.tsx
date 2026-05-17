import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import Spinner from 'react-bootstrap/Spinner';
import { useAuth } from '../context/AuthContext';
import { parseOAuthCallbackHash, parseOAuthCallbackQuery } from '../services/authService';

export function OAuthCallbackPage() {
  const { loginWithToken, user, loading } = useAuth();
  const navigate = useNavigate();
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const queryErr = parseOAuthCallbackQuery();
    if (queryErr.error) {
      setErr(queryErr.error);
      setDone(true);
      return;
    }

    const parsed = parseOAuthCallbackHash();
    if (parsed.error) {
      setErr(parsed.error);
      setDone(true);
      return;
    }
    if (!parsed.access_token) {
      setErr('No access token received from sign-in provider.');
      setDone(true);
      return;
    }

    void loginWithToken(parsed.access_token)
      .then(() => {
        setDone(true);
        navigate('/', { replace: true });
      })
      .catch((e) => {
        setErr(e instanceof Error ? e.message : 'Failed to complete sign-in.');
        setDone(true);
      });
  }, [loginWithToken, navigate]);

  if (!loading && user && done && !err) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="auth-shell flex min-h-screen items-center justify-center px-6">
      <div className="panel w-full max-w-md text-center">
        {!done || (!err && !user) ? (
          <>
            <Spinner animation="border" className="mb-4 text-accent-purple" />
            <h1 className="font-display text-xl font-bold text-white">Completing sign-in…</h1>
            <p className="mt-2 text-sm text-slate-400">Verifying your external account.</p>
          </>
        ) : err ? (
          <>
            <h1 className="font-display text-xl font-bold text-white">Sign-in failed</h1>
            <p className="mt-3 text-sm text-red-300">{err}</p>
            <Link
              to="/login"
              className="mt-6 inline-block text-sm font-semibold text-accent-purple-light hover:text-accent-orange"
            >
              Back to sign in
            </Link>
          </>
        ) : null}
      </div>
    </div>
  );
}
