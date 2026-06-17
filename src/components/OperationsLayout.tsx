import { Outlet, useNavigate } from 'react-router-dom';
import { useApp } from '../state/AppContext';
import { IconBack, IconMoon, IconSun } from './Icons';

/**
 * Module OPÉRATIONNEL (mobile web) — interface séparée du module financier.
 * Aucun lien financier : suivi de production & livraison uniquement.
 */
export function OperationsLayout() {
  const { theme, toggleTheme } = useApp();
  const navigate = useNavigate();

  return (
    <div className="m-shell">
      <div className="m-top">
        <button
          className="btn btn-icon btn-ghost"
          onClick={() => navigate('/')}
          aria-label="Retour au module financier"
          title="Module financier"
        >
          <IconBack />
        </button>
        <div className="m-title">Atelier · Commandes</div>
        <button className="btn btn-icon btn-ghost" onClick={toggleTheme} aria-label="Thème">
          {theme === 'dark' ? <IconSun /> : <IconMoon />}
        </button>
      </div>
      <Outlet />
    </div>
  );
}
