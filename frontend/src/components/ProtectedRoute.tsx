import type { ReactElement } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from './ui/Spinner';

function FullBleedLoading({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#020817] px-4">
      <div className="glass-card flex flex-col items-center gap-5 px-10 py-12 text-center shadow-glow">
        <Spinner size="lg" label={label} />
        <p className="text-sm font-medium text-slate-400">{label}</p>
      </div>
    </div>
  );
}

export function ProtectedRoute({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth();
  const loc = useLocation();

  if (loading) {
    return <FullBleedLoading label="Loading session…" />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  }

  return children;
}

export function AdminRoute({ children }: { children: ReactElement }) {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return <FullBleedLoading label="Verifying admin access…" />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}
