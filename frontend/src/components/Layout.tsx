import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { USER_ROLE_LABEL } from '../lib/format';

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Operação',
    items: [
      { to: '/', label: 'Visão geral', icon: '◎' },
      { to: '/transporte', label: 'Transporte público', icon: '⬤' },
      { to: '/trafego', label: 'Tráfego', icon: '⇄' },
      { to: '/incidentes', label: 'Incidentes', icon: '⚠' },
    ],
  },
  {
    title: 'Cadastros',
    items: [
      { to: '/cadastros/linhas', label: 'Linhas', icon: '▤' },
      { to: '/cadastros/veiculos', label: 'Veículos', icon: '▦' },
      { to: '/cadastros/usuarios', label: 'Usuários', icon: '▣' },
    ],
  },
  {
    title: 'Análise',
    items: [
      { to: '/relatorios', label: 'Relatórios urbanos', icon: '▲' },
      // Nao usar um caminho iniciado por /api: colide com o prefixo do proxy da API.
      { to: '/documentacao', label: 'Documentação da API', icon: '{ }' },
    ],
  },
];

function navClass({ isActive }: { isActive: boolean }) {
  return [
    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
    isActive
      ? 'bg-white/15 font-medium text-white'
      : 'text-indigo-100/80 hover:bg-white/10 hover:text-white',
  ].join(' ');
}

export function Layout() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebar = (
    <div className="flex h-full flex-col bg-brand-ink">
      <div className="flex items-center gap-3 px-5 py-5">
        <img src="/moblytix-mark.svg" alt="" className="h-9 w-9 rounded-lg" />
        <span className="font-display text-lg font-bold text-white">
          Mob<span className="text-brand-cyanLight">lytix</span>
        </span>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-6">
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-indigo-200/50">
              {group.title}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={navClass}
                  onClick={() => setMobileOpen(false)}
                >
                  <span aria-hidden className="w-4 text-center text-xs opacity-70">
                    {item.icon}
                  </span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 px-5 py-4">
        <p className="truncate text-sm font-medium text-white">{user?.name}</p>
        <p className="truncate text-xs text-indigo-200/70">
          {user ? USER_ROLE_LABEL[user.role] : ''}
        </p>
        <button
          type="button"
          onClick={logout}
          className="mt-3 w-full rounded-lg border border-white/20 px-3 py-1.5 text-xs text-indigo-100 hover:bg-white/10"
        >
          Sair
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-full">
      <aside className="hidden w-64 shrink-0 lg:block">{sidebar}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-[900] lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64">{sidebar}</aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            aria-label="Abrir menu"
          >
            ☰
          </button>
          <img src="/moblytix-logo.svg" alt="Moblytix" className="h-7" />
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
