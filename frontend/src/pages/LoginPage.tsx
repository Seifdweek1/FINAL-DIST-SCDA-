import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import Form from 'react-bootstrap/Form';
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import InputGroup from 'react-bootstrap/InputGroup';
import Button from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner';
import { Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatError } from '../utils/errors';
import { Alert } from '../components/ui/Alert';
import { OAuthButtons } from '../components/OAuthButtons';

export function LoginPage() {
  const { user, login, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setPending(true);
    try {
      await login(email.trim(), password);
      navigate('/', { replace: true });
    } catch (e) {
      setErr(formatError(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="auth-shell">
      <aside className="auth-hero lg:min-h-screen">
        <div className="interactive-scale flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-purple to-accent-orange text-white shadow-glow-cyan">
          <ShieldCheck className="h-7 w-7" aria-hidden />
        </div>
        <h1 className="mt-8 font-display text-3xl font-extrabold leading-tight text-white lg:text-4xl">
          SCDA Enterprise
          <span className="mt-2 block bg-gradient-to-r from-accent-purple-light to-accent-orange bg-clip-text text-transparent">
            Secure document workspace
          </span>
        </h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-300">
          Upload compliance files, verify integrity, and chat with your indexed content — all in one protected
          workspace.
        </p>
        <ul className="mt-8 space-y-3 text-sm text-slate-400">
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-purple" />
            Encrypted storage &amp; audit trail
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-orange" />
            AI search over your documents
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-purple-light" />
            Role-based access control
          </li>
        </ul>
      </aside>

      <div className="flex flex-1 items-center justify-center px-6 py-12 lg:px-14">
        <div className="w-full max-w-[420px]">
          <div className="panel">
            <p className="soc-label">Welcome back</p>
            <h2 className="mt-2 font-display text-2xl font-bold text-white">Sign in</h2>
            <p className="mt-2 text-sm text-slate-400">Use your SCDA account credentials.</p>
            {err ? (
              <Alert variant="error" className="mt-5" title="Unable to sign in">
                {err}
              </Alert>
            ) : null}
            <Form className="mt-6" onSubmit={onSubmit} noValidate>
              <FloatingLabel controlId="email" label="Email address" className="mb-3 text-slate-400">
                <Form.Control
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </FloatingLabel>
              <div className="mb-4">
                <label className="form-label flex items-center gap-2 text-sm text-slate-400" htmlFor="password">
                  <Lock className="h-3.5 w-3.5 text-accent-purple/80" aria-hidden />
                  Password
                </label>
                <InputGroup>
                  <Form.Control
                    id="password"
                    type={showPw ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <Button
                    variant="outline-cyan"
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </InputGroup>
              </div>
              <Button type="submit" variant="primary" disabled={pending} className="w-100 py-2.5 fw-bold">
                {pending ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Signing in…
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
            </Form>
            <OAuthButtons />
            <p className="mt-6 text-center text-sm text-slate-400">
              No account?{' '}
              <Link
                className="fw-semibold text-accent-purple-light text-decoration-none hover:text-accent-orange"
                to="/register"
              >
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
