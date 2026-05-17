import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  FolderLock,
  Gauge,
  KeyRound,
  LogOut,
  Menu,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/Button';

function pageTitle(pathname: string): string {
  const p = pathname.replace(/\/$/, '') || '/';
  if (p === '/' || p === '') return 'Overview';
  if (p === '/documents') return 'Documents';
  if (p === '/ai' || p === '/chat') return 'Knowledge workspace';
  if (p === '/security') return 'Security center';
  if (p === '/audit') return 'Audit trail';
  return 'SCDA';
}

const NAV = [
  { to: '/', end: true, label: 'Overview', icon: Gauge },
  { to: '/documents', label: 'Files', icon: FolderLock },
  { to: '/ai', label: 'Workspace', icon: Sparkles },
  { to: '/security', label: 'Security', icon: KeyRound },
] as const;

export function AppLayout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const title = useMemo(() => pageTitle(location.pathname), [location.pathname]);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const initials =
    user?.email
      .split(/[@._-]/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join('') || 'U';

  const navItems = isAdmin
    ? [...NAV, { to: '/audit', label: 'Audit', icon: ClipboardList, end: false as const }]
    : [...NAV];

  return (
    <div className="flex min-h-screen flex-col bg-soc-void pb-[4.5rem] md:pb-0">
      <div className="accent-bar" aria-hidden />

      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 md:px-6">
          <NavLink to="/" className="group flex shrink-0 items-center gap-2.5">
            <span className="interactive-scale flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent-purple to-accent-purple-dark text-white shadow-glow-cyan">
              <ShieldCheck className="h-5 w-5" aria-hidden />
            </span>
            <span className="hidden font-display text-lg font-extrabold tracking-tight text-white sm:block">
              SCDA <span className="bg-gradient-to-r from-accent-purple-light to-accent-orange bg-clip-text text-transparent">Enterprise</span>
            </span>
          </NavLink>

          <nav className="mx-auto hidden flex-1 items-center justify-center gap-1 lg:flex" aria-label="Main">
            {navItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => (isActive ? 'topnav-link-active' : 'topnav-link')}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-soc-panel/90 py-1 pl-1 pr-3 sm:flex">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-accent-purple to-accent-orange text-xs font-bold text-white">
                {initials}
              </span>
              <div className="hidden max-w-[140px] truncate text-xs text-slate-300 lg:block">{user?.email}</div>
            </div>
            <Button
              variant="ghost"
              className="hidden sm:inline-flex"
              onClick={() => {
                logout();
                navigate('/login', { replace: true });
              }}
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Exit
            </Button>
            <button
              type="button"
              className="btn-ghost rounded-lg p-2 lg:hidden"
              aria-label="Open menu"
              onClick={() => setMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>

        {menuOpen ? (
          <div className="animate-fade-in border-t border-white/10 bg-soc-panel/98 px-4 py-3 lg:hidden">
            <div className="mb-2 flex items-center justify-between">
              <span className="soc-label">Menu</span>
              <button type="button" className="btn-ghost p-1" onClick={() => setMenuOpen(false)} aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid gap-1">
              {navItems.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    isActive
                      ? 'flex items-center gap-3 rounded-xl bg-accent-purple/15 px-3 py-2.5 font-semibold text-accent-purple-light'
                      : 'flex items-center gap-3 rounded-xl px-3 py-2.5 text-slate-300 transition hover:bg-white/5'
                  }
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </NavLink>
              ))}
              <button
                type="button"
                className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-slate-400 transition hover:bg-white/5"
                onClick={() => {
                  logout();
                  navigate('/login', { replace: true });
                }}
              >
                <LogOut className="h-5 w-5" />
                Log out
              </button>
            </div>
          </div>
        ) : null}
      </header>

      <div className="border-b border-white/5 bg-gradient-to-r from-soc-panel/60 via-black/40 to-soc-panel/60">
        <div className="mx-auto max-w-7xl px-4 py-4 md:px-6 md:py-5">
          <p className="soc-label flex items-center gap-2">
            <span className="soc-live-dot" />
            Secure workspace
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold text-white md:text-3xl">{title}</h1>
          <p className="mt-1 text-sm text-slate-400">Compliance documents · encrypted storage · AI assistance</p>
        </div>
      </div>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-6 md:py-8">
        <div className="page-section">
          <Outlet />
        </div>
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-white/10 bg-black/95 px-1 py-1.5 backdrop-blur-xl safe-area-pb md:hidden"
        aria-label="Mobile navigation"
      >
        {navItems.slice(0, 5).map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `${isActive ? 'bottomnav-link-active' : 'bottomnav-link'} group`
            }
          >
            <Icon className="h-5 w-5 transition-transform group-[.bottomnav-link-active]:scale-110" aria-hidden />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
