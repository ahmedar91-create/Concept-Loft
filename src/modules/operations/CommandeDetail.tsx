import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../../state/AppContext';
import { useUI } from '../../components/ui';
import { formatDate, formatTND } from '../../lib/format';
import { COMMANDE_STATUTS, STATUT_LABELS, type CommandeStatut } from '../../data/types';
import { IconEdit, IconPhone, IconTrash } from '../../components/Icons';

export function CommandeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const app = useApp();
  const { toast, confirm } = useUI();
  const commande = id ? app.getCommande(id) : undefined;

  const [missing, setMissing] = useState(false);
  useEffect(() => {
    if (!commande) setMissing(true);
  }, [commande]);
  useEffect(() => {
    if (missing) navigate('/atelier', { replace: true });
  }, [missing, navigate]);

  if (!commande) return <div className="m-body">Chargement…</div>;

  const changeStatut = (statut: CommandeStatut) => {
    if (statut === commande.statut) return;
    app.saveCommande({ ...commande, statut });
    toast(`Statut : ${STATUT_LABELS[statut]}`, 'success');
  };

  const remove = async () => {
    const ok = await confirm({
      title: 'Supprimer la commande ?',
      message: `${commande.numero} sera supprimée. Les documents financiers ne sont pas affectés.`,
      danger: true,
      confirmLabel: 'Supprimer',
    });
    if (ok) {
      app.deleteCommande(commande.id);
      toast('Commande supprimée.');
      navigate('/atelier', { replace: true });
    }
  };

  return (
    <div className="m-body">
      <div className="row spread" style={{ marginBottom: 4 }}>
        <span className="status-pill" style={{ background: `var(--st-${commande.statut})` }}>
          {STATUT_LABELS[commande.statut]}
        </span>
        <div className="row gap-sm">
          <button
            className="btn btn-icon btn-ghost"
            onClick={() => navigate(`/atelier/nouvelle?edit=${commande.id}`)}
            aria-label="Modifier"
          >
            <IconEdit />
          </button>
          <button className="btn btn-icon btn-ghost" onClick={remove} aria-label="Supprimer">
            <IconTrash />
          </button>
        </div>
      </div>

      <h1 style={{ fontSize: 22, marginTop: 10 }}>{commande.clientNom}</h1>
      <div className="faint" style={{ marginBottom: 16 }}>
        {commande.numero} · {formatDate(commande.date)}
        {commande.sourceType && commande.sourceType !== 'manuelle' && (
          <> · issue d’un {commande.sourceType}</>
        )}
      </div>

      {commande.telephone && (
        <a
          href={`tel:${commande.telephone.replace(/\s/g, '')}`}
          className="btn btn-sm"
          style={{ marginBottom: 16 }}
        >
          <IconPhone /> {commande.telephone}
        </a>
      )}

      {/* Changement de statut */}
      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div className="label" style={{ marginBottom: 10 }}>
          Statut de production
        </div>
        <div className="status-grid">
          {COMMANDE_STATUTS.map((st) => (
            <button
              key={st}
              className={`status-choice ${st === commande.statut ? 'selected' : ''}`}
              style={{ color: `var(--st-${st})` }}
              onClick={() => changeStatut(st)}
            >
              <span className="dot" style={{ background: `var(--st-${st})` }} />
              <span style={{ color: 'var(--text)' }}>{STATUT_LABELS[st]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Adresse de livraison */}
      {commande.adresse && (
        <div className="card card-pad" style={{ marginBottom: 16 }}>
          <div className="label" style={{ marginBottom: 6 }}>
            Adresse de livraison
          </div>
          <div style={{ whiteSpace: 'pre-wrap' }}>{commande.adresse}</div>
        </div>
      )}

      {/* Description */}
      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div className="label" style={{ marginBottom: 6 }}>
          Description du travail
        </div>
        <div style={{ whiteSpace: 'pre-wrap' }}>{commande.description || '—'}</div>
      </div>

      {/* Articles */}
      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div className="label" style={{ marginBottom: 10 }}>
          Articles ({commande.articles.length})
        </div>
        {commande.articles.length === 0 ? (
          <div className="faint">Aucun article listé.</div>
        ) : (
          commande.articles.map((a, i) => (
            <div
              key={i}
              style={{
                padding: '10px 0',
                borderBottom: i < commande.articles.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              <div className="row spread">
                <span className="strong">{a.nom}</span>
                <span className="faint">× {a.quantite}</span>
              </div>
              {(a.description || a.dimensions) && (
                <div className="faint" style={{ fontSize: 13, marginTop: 2 }}>
                  {a.description}
                  {a.description && a.dimensions ? ' · ' : ''}
                  {a.dimensions && `Dim. : ${a.dimensions}`}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Montant (informatif) */}
      <div className="card card-pad row spread">
        <span className="muted">Montant total (informatif)</span>
        <span className="strong" style={{ fontSize: 18 }}>
          {formatTND(commande.montantTotal)}
        </span>
      </div>
    </div>
  );
}
