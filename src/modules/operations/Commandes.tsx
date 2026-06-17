import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../state/AppContext';
import { formatDate, formatTND } from '../../lib/format';
import { COMMANDE_STATUTS, STATUT_LABELS, type CommandeStatut } from '../../data/types';
import { IconPlus } from '../../components/Icons';

type Filter = 'toutes' | CommandeStatut;

export function Commandes() {
  const { data } = useApp();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('toutes');
  const [search, setSearch] = useState('');

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...data.commandes]
      .filter((c) => (filter === 'toutes' ? true : c.statut === filter))
      .filter(
        (c) =>
          !q ||
          c.clientNom.toLowerCase().includes(q) ||
          c.numero.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [data.commandes, filter, search]);

  return (
    <div className="m-body">
      <input
        className="search"
        style={{ maxWidth: '100%', width: '100%', marginBottom: 12 }}
        placeholder="Rechercher une commande…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="m-filters">
        <button
          className={`chip ${filter === 'toutes' ? 'active' : ''}`}
          onClick={() => setFilter('toutes')}
        >
          Toutes ({data.commandes.length})
        </button>
        {COMMANDE_STATUTS.map((st) => {
          const n = data.commandes.filter((c) => c.statut === st).length;
          return (
            <button
              key={st}
              className={`chip ${filter === st ? 'active' : ''}`}
              onClick={() => setFilter(st)}
            >
              {STATUT_LABELS[st]} ({n})
            </button>
          );
        })}
      </div>

      {list.length === 0 ? (
        <div className="empty">
          <h3>Aucune commande</h3>
          <div>Créez une commande depuis un document, ou via le bouton ci-dessous.</div>
        </div>
      ) : (
        list.map((c) => (
          <div key={c.id} className="order-card" onClick={() => navigate(`/atelier/${c.id}`)}>
            <div className="oc-top">
              <div>
                <div className="oc-client">{c.clientNom}</div>
                <div className="oc-meta">
                  {c.numero} · {formatDate(c.date)}
                </div>
              </div>
              <span className="status-pill" style={{ background: `var(--st-${c.statut})` }}>
                {STATUT_LABELS[c.statut]}
              </span>
            </div>
            <div className="oc-desc">{c.description}</div>
            <div className="row spread" style={{ marginTop: 10 }}>
              <span className="faint" style={{ fontSize: 13 }}>
                {c.articles.length} article(s)
              </span>
              <span className="strong">{formatTND(c.montantTotal)}</span>
            </div>
          </div>
        ))
      )}

      <div className="fab">
        <button className="btn btn-primary" onClick={() => navigate('/atelier/nouvelle')}>
          <IconPlus /> Nouvelle commande
        </button>
      </div>
    </div>
  );
}
