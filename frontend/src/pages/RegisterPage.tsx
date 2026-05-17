import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { CheckCircle2, Eye, EyeOff, Lock, Mail, ShieldCheck, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatError } from '../utils/errors';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { OAuthButtons } from '../components/OAuthButtons';

export function RegisterPage() {
  const { user, register, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setPending(true);
    try {
      await register(email.trim(), password);
      setDone(true);
    } catch (e) {
      setErr(formatError(e));
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="auth-shell">
        <div className="flex flex-1 items-center justify-center px-6 py-16">
          <div className="panel w-full max-w-md text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-orange/20 text-accent-orange ring-1 ring-accent-orange/40">
              <CheckCircle2 className="h-7 w-7" aria-hidden />
            </div>
            <h1 className="mt-5 font-display text-xl font-semibold text-white">Account created</h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              Your role is assigned by the backend (default: <strong className="text-slate-200">user</strong>). You can
              sign in now.
            </p>
            <Link to="/login" className="btn-primary mt-8 inline-flex justify-center px-8 py-3">
              Go to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-shell">
      <aside className="auth-hero lg:min-h-screen">
        <div className="interactive-scale flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-purple to-accent-orange text-white shadow-glow-cyan">
          <UserPlus className="h-6 w-6" aria-hidden />
        </div>
        <h1 className="mt-8 font-display text-3xl font-extrabold text-white lg:text-4xl">Join SCDA Enterprise</h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-300">
          Create your account to upload documents, run smart search, and use the document chat assistant.
        </p>
        <div className="mt-10 flex items-center gap-3 rounded-xl border border-accent-purple/25 bg-accent-purple/10 px-4 py-3">
          <ShieldCheck className="h-5 w-5 shrink-0 text-accent-purple-light" />
          <p className="text-xs text-slate-300">Your data stays private — encrypted storage and full audit trail.</p>
        </div>
      </aside>

      <div className="flex flex-1 items-center justify-center px-6 py-12 lg:px-14">
        <div className="w-full max-w-[420px]">
          <div className="panel">
            <p className="soc-label">New member</p>
            <h2 className="mt-2 font-display text-2xl font-bold text-white">Register</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Password: 8–128 characters. Role is <strong className="text-slate-300">not</strong> selectable — the server
              controls it.
            </p>
            {err ? (
              <Alert variant="error" className="mt-5" title="Registration failed">
                {err}
              </Alert>
            ) : null}
            <form className="mt-6 space-y-5" onSubmit={onSubmit} noValidate>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-300" htmlFor="remail">
                  <Mail className="h-4 w-4 text-accent-purple/80" aria-hidden />
                  Email
                </label>
                <input
                  id="remail"
                  type="email"
                  autoComplete="email"
                  required
                  className="input-field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-300" htmlFor="rpassword">
                  <Lock className="h-4 w-4 text-accent-purple/80" aria-hidden />
                  Password
                </label>
                <div className="relative mt-1.5">
                  <input
                    id="rpassword"
                    type={showPw ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    className="input-field pr-12"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-ghost absolute right-1 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:text-white"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" disabled={pending} className="w-full py-3">
                {pending ? 'Creating…' : 'Create account'}
              </Button>
            </form>
            <OAuthButtons />
            <p className="mt-6 text-center text-sm text-slate-400">
              Already have an account?{' '}
              <Link
                className="font-semibold text-accent-purple-light underline-offset-4 transition-colors hover:text-accent-orange hover:underline"
                to="/login"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
