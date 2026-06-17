import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useApp } from '../state/AppContext';
import { useAuth } from '../auth/AuthProvider';
import { Logo } from './Logo';
import {
  IconCatalogue,
  IconClients,
  IconDashboard,
  IconDoc,
  IconLogout,
  IconMenu,
  IconMoon,
  IconOrders,
  IconSettings,
  IconSun,
} from './Icons';

const links = [
  { to: '/', label: 'Tableau de bord', icon: IconDashboard, end: true },
  { to: '/catalogue', label: 'Catalogue', icon: IconCatalogue },
  { to: '/clients', label: 'Clients', icon: IconClients },
  { to: '/documents', label: 'Devis & Factures', icon: IconDoc },
];


export function FinanceLayout() {
  const { theme, toggleTheme, mode } = useApp();
  const { configured, user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="shell">
      <div className={`scrim ${open ? 'show' : ''}`} onClick={() => setOpen(false)} />
      <aside className={`sidebar ${open ? 'open' : ''}`} onClick={() => setOpen(false)}>
        <div className="brand">
          <Logo size={30} />
        </div>

        {links.map((l) => {
          const Icon = l.icon;
          return (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon />
              {l.label}
            </NavLink>
          );
        })}

        <div className="nav-section">Module opérationnel</div>
        <NavLink to="/atelier" className="nav-link">
          <IconOrders />
          Atelier · Commandes
        </NavLink>

        <div className="nav-section">Système</div>
        <NavLink
          to="/parametres"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <IconSettings />
          Paramètres & Sauvegarde
        </NavLink>

        <div className="sidebar-foot">
          <span className={`mode-chip ${mode === 'supabase' ? 'mode-supabase' : 'mode-local'}`}>
            <span className="dot" />
            {mode === 'supabase' ? 'Multi-appareils (Supabase)' : 'Local (cet appareil)'}
          </span>
          {configured && user && (
            <button
              className="btn btn-block"
              onClick={signOut}
              title={user.email ?? undefined}
            >
              <IconLogout />
              Se déconnecter
            </button>
          )}
        </div>
      </aside>

      <div className="content">
        {/* Desktop : bascule de thème discrète en haut à droite */}
        <div className="content-bar">
          <button
            className="btn btn-icon"
            onClick={toggleTheme}
            aria-label="Basculer le thème"
            title="Mode clair / sombre"
          >
            {theme === 'dark' ? <IconSun /> : <IconMoon />}
          </button>
        </div>
        <div className="mobile-topbar">
          <button
            className="btn btn-icon btn-ghost"
            onClick={() => setOpen((o) => !o)}
            aria-label="Menu"
          >
            <IconMenu />
          </button>
          <Logo size={17} variant="horizontal" />
          <button className="btn btn-icon btn-ghost" onClick={toggleTheme} aria-label="Thème">
            {theme === 'dark' ? <IconSun /> : <IconMoon />}
          </button>
        </div>
        {/* key force le scroll-reset au changement de page */}
        <div key={location.pathname}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
