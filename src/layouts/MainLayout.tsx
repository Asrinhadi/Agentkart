import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  AlertTriangle,
  Database,
  LayoutDashboard,
  ListChecks,
  Menu,
  RefreshCw,
  Shield,
  Users,
  X,
} from 'lucide-react';
import { useAgentkart } from '../app/AgentkartContext.tsx';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
}

const NAV: NavItem[] = [
  { to: '/', label: 'Oversikt', icon: LayoutDashboard, end: true },
  { to: '/agents', label: 'Agentinventar', icon: Users },
  { to: '/findings', label: 'Avvik', icon: AlertTriangle },
  { to: '/sources', label: 'Datakilder', icon: Database },
  { to: '/rules', label: 'Kontrollregler', icon: ListChecks },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Hovedmeny" className="flex flex-col gap-1">
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            [
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-slate-800 text-white'
                : 'text-slate-200 hover:bg-slate-800/60 hover:text-white',
            ].join(' ')
          }
          aria-current={undefined}
        >
          {({ isActive }) => (
            <>
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span aria-current={isActive ? 'page' : undefined}>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

export function MainLayout() {
  const { reset } = useAgentkart();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-800 bg-slate-900 text-white print:hidden">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-md p-2 text-slate-200 hover:bg-slate-800 md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Åpne meny"
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold tracking-tight">Agentkart</span>
              <span className="rounded bg-sky-700 px-2 py-0.5 text-xs font-medium">
                Konseptdemo
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-2 text-sm text-slate-300 sm:flex">
              <Shield className="h-4 w-4" aria-hidden="true" />
              <span>Data behandles lokalt</span>
            </div>
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Tilbakestill demo
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1440px] gap-6 px-4 py-6 sm:px-6 print:max-w-none print:gap-0 print:px-0 print:py-0">
        <aside className="hidden w-56 shrink-0 md:block print:hidden">
          <div className="sticky top-6 rounded-lg bg-slate-900 p-3 text-white shadow">
            <NavLinks />
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <Outlet />
          <footer className="mt-12 flex flex-col gap-2 border-t border-slate-200 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between print:hidden">
            <p>
              Konseptdemo – funnene er basert på importerte observasjoner, ikke en aktiv
              nettverksskanning. Ingen data sendes ut av nettleseren.
            </p>
            <p>
              Utviklet av{' '}
              <span className="font-medium text-slate-700">Asrin Hadi</span> ·{' '}
              <a
                href="https://github.com/Asrinhadi/Agentkart"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-700 hover:underline"
              >
                GitHub
              </a>
            </p>
          </footer>
        </main>
      </div>

      {mobileOpen ? (
        <div
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Meny"
          className="fixed inset-0 z-50 flex md:hidden"
        >
          <button
            type="button"
            aria-label="Lukk meny"
            className="flex-1 bg-slate-900/60"
            onClick={() => setMobileOpen(false)}
          />
          <div className="flex w-64 flex-col gap-4 bg-slate-900 p-4 text-white">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold">Meny</span>
              <button
                type="button"
                aria-label="Lukk meny"
                onClick={() => setMobileOpen(false)}
                className="rounded-md p-2 hover:bg-slate-800"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setMobileOpen(false);
                }}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <NavLinks onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
