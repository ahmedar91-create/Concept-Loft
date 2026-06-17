import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../../state/AppContext';
import { useUI } from '../../components/ui';
import { parseNumber } from '../../lib/format';
import {
  COMMANDE_STATUTS,
  STATUT_LABELS,
  type CommandeArticle,
  type CommandeStatut,
} from '../../data/types';
import { IconBack, IconClose, IconPlus } from '../../components/Icons';

interface EditArticle extends Omit<CommandeArticle, 'quantite'> {
  quantite: string;
}

export function CommandeForm() {
  const app = useApp();
  const navigate = useNavigate();
  const { toast } = useUI();
  const [params] = useSearchParams();
  const editId = params.get('edit');
  const existing = useMemo(() => (editId ? app.getCommande(editId) : undefined), [editId, app]);

  const [clientNom, setClientNom] = useState(existing?.clientNom ?? '');
  const [adresse, setAdresse] = useState(existing?.adresse ?? '');
  const [telephone, setTelephone] = useState(existing?.telephone ?? '');
  const [date, setDate] = useState(existing?.date ?? new Date().toISOString().slice(0, 10));
  const [montant, setMontant] = useState(existing ? String(existing.montantTotal) : '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [statut, setStatut] = useState<CommandeStatut>(existing?.statut ?? 'en_production');
  const [articles, setArticles] = useState<EditArticle[]>(
    existing?.articles.map((a) => ({ ...a, quantite: String(a.quantite) })) ?? [],
  );

  const addArticle = () =>
    setArticles([...articles, { nom: '', description: '', dimensions: '', quantite: '1' }]);
  const updateArticle = (i: number, p: Partial<EditArticle>) =>
    setArticles(articles.map((a, idx) => (idx === i ? { ...a, ...p } : a)));
  const removeArticle = (i: number) => setArticles(articles.filter((_, idx) => idx !== i));

  const save = () => {
    if (!clientNom.trim()) return toast('Le nom du client est requis.', 'error');
    if (!description.trim()) return toast('La description est obligatoire.', 'error');

    const payload = {
      id: existing?.id ?? app.createDraftCommande().id,
      numero: existing?.numero ?? '',
      clientNom: clientNom.trim(),
      adresse: adresse.trim(),
      telephone: telephone.trim(),
      date,
      montantTotal: parseNumber(montant),
      description: description.trim(),
      articles: articles
        .filter((a) => a.nom.trim())
        .map((a) => ({
          nom: a.nom.trim(),
          description: a.description.trim(),
          dimensions: a.dimensions.trim(),
          quantite: parseNumber(a.quantite),
        })),
      statut,
      sourceType: existing?.sourceType ?? ('manuelle' as const),
      sourceDocumentId: existing?.sourceDocumentId ?? null,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = app.saveCommande(payload);
    toast(existing ? 'Commande mise à jour.' : `Commande ${saved.numero} créée.`, 'success');
    navigate(`/atelier/${saved.id}`, { replace: true });
  };

  return (
    <div className="m-body">
      <button
        className="btn btn-sm btn-ghost"
        onClick={() => navigate(-1)}
        style={{ marginBottom: 12 }}
      >
        <IconBack width={15} height={15} /> Retour
      </button>
      <h1 style={{ fontSize: 22, marginBottom: 16 }}>
        {existing ? 'Modifier la commande' : 'Nouvelle commande'}
      </h1>

      <div className="stack">
        <div className="field">
          <label>Client</label>
          <input
            value={clientNom}
            onChange={(e) => setClientNom(e.target.value)}
            placeholder="Nom du client"
          />
        </div>

        <div className="field">
          <label>Téléphone</label>
          <input
            type="tel"
            inputMode="tel"
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            placeholder="Numéro du client"
          />
        </div>

        <div className="field">
          <label>Adresse de livraison</label>
          <textarea
            value={adresse}
            onChange={(e) => setAdresse(e.target.value)}
            placeholder="Adresse du client / lieu de livraison"
            style={{ minHeight: 60 }}
          />
        </div>

        <div className="grid grid-2">
          <div className="field">
            <label>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label>Montant total (TND, informatif)</label>
            <input
              inputMode="decimal"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              placeholder="0.000"
            />
          </div>
        </div>

        <div className="field">
          <label>Description du travail (obligatoire)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Détails de la réalisation, finitions, délais…"
            style={{ minHeight: 90 }}
          />
        </div>

        <div className="field">
          <label>Statut</label>
          <select value={statut} onChange={(e) => setStatut(e.target.value as CommandeStatut)}>
            {COMMANDE_STATUTS.map((st) => (
              <option key={st} value={st}>
                {STATUT_LABELS[st]}
              </option>
            ))}
          </select>
        </div>

        <div className="card card-pad">
          <div className="row spread" style={{ marginBottom: 12 }}>
            <span className="label">Articles</span>
            <button className="btn btn-sm" onClick={addArticle}>
              <IconPlus width={15} height={15} /> Ajouter
            </button>
          </div>
          {articles.length === 0 ? (
            <div className="faint">Aucun article (optionnel).</div>
          ) : (
            articles.map((a, i) => (
              <div
                key={i}
                style={{
                  borderTop: i > 0 ? '1px solid var(--border)' : 'none',
                  paddingTop: i > 0 ? 12 : 0,
                  marginBottom: 12,
                }}
              >
                <div className="row spread" style={{ marginBottom: 8 }}>
                  <input
                    value={a.nom}
                    onChange={(e) => updateArticle(i, { nom: e.target.value })}
                    placeholder="Désignation"
                    style={{ fontWeight: 700 }}
                  />
                  <button
                    className="btn btn-icon btn-ghost"
                    onClick={() => removeArticle(i)}
                    aria-label="Retirer"
                  >
                    <IconClose width={16} height={16} />
                  </button>
                </div>
                <div className="grid grid-2">
                  <input
                    value={a.description}
                    onChange={(e) => updateArticle(i, { description: e.target.value })}
                    placeholder="Description"
                  />
                  <input
                    value={a.dimensions}
                    onChange={(e) => updateArticle(i, { dimensions: e.target.value })}
                    placeholder="Dimensions"
                  />
                </div>
                <div style={{ marginTop: 8, maxWidth: 120 }}>
                  <input
                    inputMode="decimal"
                    value={a.quantite}
                    onChange={(e) => updateArticle(i, { quantite: e.target.value })}
                    placeholder="Qté"
                  />
                </div>
              </div>
            ))
          )}
        </div>

        <button className="btn btn-primary btn-block" onClick={save}>
          {existing ? 'Enregistrer les modifications' : 'Créer la commande'}
        </button>
      </div>
    </div>
  );
}
