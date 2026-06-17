import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../state/AppContext';
import { computeDocumentTotals } from '../../lib/fiscal';
import { formatDate, formatTND } from '../../lib/format';
import { COMMANDE_STATUTS, STATUT_LABELS } from '../../data/types';
import { IconArrowRight, IconDoc, IconOrders, IconPlus } from '../../components/Icons';

export function Dashboard() {
  const { data, settings } = useApp();
  const navigate = useNavigate();

  const stats = useMemo(() => {
    const livrees = data.commandes.filter((c) => c.statut === 'livre');
    return {
      enProduction: data.commandes.filter((c) => c.statut === 'en_production').length,
      total: data.commandes.length,
      livrees: livrees.length,
      chiffreAffaires: livrees.reduce((s, c) => s + (c.montantTotal || 0), 0),
    };
  }, [data]);

  const recent = useMemo(
    () => [...data.documents].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6),
    [data.documents],
  );

  const totalFor = (docId: string) => {
    const d = data.documents.find((x) => x.id === docId)!;
    return computeDocumentTotals(
      d.lines.map((l) => ({ prixUnitaireTTC: l.prixUnitaireTTC, quantite: l.quantite })),
      d.livraisonTTC,
      settings.fiscal,
    ).netAPayer;
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Tableau de bord</h1>
          <div className="subtitle">Vue d'ensemble de l'activité CONCEPT LOFT</div>
        </div>
        <div className="toolbar">
          <button
            className="btn btn-primary"
            onClick={() => navigate('/documents/nouveau/facture')}
          >
            <IconPlus /> Nouvelle facture
          </button>
          <button className="btn" onClick={() => navigate('/documents/nouveau/devis')}>
            <IconPlus /> Nouveau devis
          </button>
        </div>
      </div>

      <div className="grid grid-4">
        <div className="card stat">
          <div className="k">En production</div>
          <div className="v">{stats.enProduction}</div>
          <div className="sub">commande(s) en cours</div>
        </div>
        <div className="card stat">
          <div className="k">Commandes totales</div>
          <div className="v">{stats.total}</div>
          <div className="sub">toutes commandes</div>
        </div>
        <div className="card stat">
          <div className="k">Commandes livrées</div>
          <div className="v">{stats.livrees}</div>
          <div className="sub">commande(s) livrée(s)</div>
        </div>
        <div className="card stat stat-accent">
          <div className="k">Chiffre d'affaires</div>
          <div className="v">{formatTND(stats.chiffreAffaires)}</div>
          <div className="sub">total des commandes livrées</div>
        </div>
      </div>

      <div className="grid grid-2 mt">
        <div className="card card-pad">
          <div className="row spread" style={{ marginBottom: 14 }}>
            <h2 style={{ fontSize: 17 }}>Documents récents</h2>
            <Link className="btn btn-sm btn-ghost" to="/documents">
              Tout voir <IconArrowRight width={15} height={15} />
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="empty">
              <IconDoc width={30} height={30} />
              <h3>Aucun document</h3>
              <div>Créez votre premier devis ou facture.</div>
            </div>
          ) : (
            <div className="stack gap-sm">
              {recent.map((d) => (
                <Link
                  key={d.id}
                  to={`/documents/${d.id}`}
                  className="row spread"
                  style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}
                >
                  <div>
                    <div className="strong">{d.numero || '(brouillon)'}</div>
                    <div className="faint" style={{ fontSize: 13 }}>
                      {d.client.nom || 'Sans client'} · {formatDate(d.date)}
                    </div>
                  </div>
                  <div className="right">
                    <span className={`badge badge-type`}>{d.type}</span>
                    <div className="strong num" style={{ marginTop: 4 }}>
                      {formatTND(totalFor(d.id))}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="card card-pad">
          <div className="row spread" style={{ marginBottom: 14 }}>
            <h2 style={{ fontSize: 17 }}>Suivi atelier</h2>
            <Link className="btn btn-sm btn-ghost" to="/atelier">
              Ouvrir <IconArrowRight width={15} height={15} />
            </Link>
          </div>
          {data.commandes.length === 0 ? (
            <div className="empty">
              <IconOrders width={30} height={30} />
              <h3>Aucune commande</h3>
              <div>Créez une commande depuis un document, ou manuellement.</div>
            </div>
          ) : (
            <div className="stack gap-sm">
              {COMMANDE_STATUTS.map((st) => {
                const n = data.commandes.filter((c) => c.statut === st).length;
                return (
                  <div
                    key={st}
                    className="row spread"
                    style={{ padding: '7px 0', borderBottom: '1px solid var(--border)' }}
                  >
                    <span className="row gap-sm">
                      <span className="dot" style={{ background: `var(--st-${st})` }} />
                      {STATUT_LABELS[st]}
                    </span>
                    <span className="strong">{n}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
