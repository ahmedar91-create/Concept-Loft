import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../../state/AppContext';
import { useUI } from '../../components/ui';
import { computeDocumentTotals, computeLine } from '../../lib/fiscal';
import { formatTND, parseNumber } from '../../lib/format';
import { newId } from '../../lib/id';
import { structuredCloneSafe } from '../../data/defaults';
import type { DocumentType, SalesDocument } from '../../data/types';
import {
  IconBack,
  IconClose,
  IconDownload,
  IconOrders,
  IconPlus,
} from '../../components/Icons';

/** Forme d'édition : les champs numériques sont des chaînes pour une saisie fluide. */
interface EditLine {
  id: string;
  catalogueItemId: string | null;
  nom: string;
  description: string;
  dimensions: string;
  quantite: string;
  prixUnitaireTTC: string;
}
interface EditDoc {
  id: string;
  type: DocumentType;
  numero: string;
  date: string;
  clientId: string | null;
  clientNom: string;
  clientAdresse: string;
  clientTel: string;
  clientMF: string;
  lines: EditLine[];
  livraisonTTC: string;
  notes: string;
}

function toEdit(doc: SalesDocument): EditDoc {
  return {
    id: doc.id,
    type: doc.type,
    numero: doc.numero,
    date: doc.date,
    clientId: doc.clientId,
    clientNom: doc.client.nom,
    clientAdresse: doc.client.adresse,
    clientTel: doc.client.telephone,
    clientMF: doc.client.matriculeFiscal,
    lines: doc.lines.map((l) => ({
      id: l.id,
      catalogueItemId: l.catalogueItemId,
      nom: l.nom,
      description: l.description,
      dimensions: l.dimensions,
      quantite: String(l.quantite),
      prixUnitaireTTC: String(l.prixUnitaireTTC),
    })),
    livraisonTTC: doc.livraisonTTC ? String(doc.livraisonTTC) : '',
    notes: doc.notes,
  };
}

function toDocument(e: EditDoc): SalesDocument {
  const now = new Date().toISOString();
  return {
    id: e.id,
    type: e.type,
    numero: e.numero,
    date: e.date,
    clientId: e.clientId,
    client: {
      nom: e.clientNom.trim(),
      adresse: e.clientAdresse.trim(),
      telephone: e.clientTel.trim(),
      matriculeFiscal: e.clientMF.trim(),
    },
    lines: e.lines.map((l) => ({
      id: l.id,
      catalogueItemId: l.catalogueItemId,
      nom: l.nom.trim(),
      description: l.description.trim(),
      dimensions: l.dimensions.trim(),
      quantite: parseNumber(l.quantite),
      prixUnitaireTTC: parseNumber(l.prixUnitaireTTC),
    })),
    livraisonTTC: parseNumber(e.livraisonTTC),
    notes: e.notes.trim(),
    createdAt: now,
    updatedAt: now,
  };
}

export function DocumentEditor() {
  const params = useParams();
  const navigate = useNavigate();
  const app = useApp();
  const { settings } = app;
  const { toast } = useUI();

  const [doc, setDoc] = useState<EditDoc | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Initialisation (création ou édition).
  useEffect(() => {
    if (params.id) {
      const existing = app.getDocument(params.id);
      if (!existing) {
        setNotFound(true);
        return;
      }
      setDoc(toEdit(structuredCloneSafe(existing)));
    } else {
      const type = (params.type as DocumentType) === 'facture' ? 'facture' : 'devis';
      setDoc(toEdit(app.createDraftDocument(type)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, params.type]);

  useEffect(() => {
    if (notFound) navigate('/documents', { replace: true });
  }, [notFound, navigate]);

  const totals = useMemo(() => {
    if (!doc) return null;
    return computeDocumentTotals(
      doc.lines.map((l) => ({
        prixUnitaireTTC: parseNumber(l.prixUnitaireTTC),
        quantite: parseNumber(l.quantite),
      })),
      parseNumber(doc.livraisonTTC),
      settings.fiscal,
    );
  }, [doc, settings.fiscal]);

  if (!doc || !totals) return <div className="page">Chargement…</div>;

  const isNew = !params.id;
  const titleType = doc.type === 'devis' ? 'Devis' : 'Facture';
  const numeroDisplay = doc.numero || (isNew ? app.previewNumero(doc.type) : '');

  const patch = (p: Partial<EditDoc>) => setDoc({ ...doc, ...p });

  const applyClientByName = (nom: string) => {
    const match = app.data.clients.find(
      (c) => c.nom.trim().toLowerCase() === nom.trim().toLowerCase(),
    );
    if (match) {
      patch({
        clientNom: nom,
        clientId: match.id,
        clientAdresse: match.adresse,
        clientTel: match.telephone,
        clientMF: match.matriculeFiscal,
      });
    } else {
      patch({ clientNom: nom, clientId: null });
    }
  };

  const addBlankLine = () => {
    const line: EditLine = {
      id: newId(),
      catalogueItemId: null,
      nom: '',
      description: '',
      dimensions: '',
      quantite: '1',
      prixUnitaireTTC: '',
    };
    patch({ lines: [...doc.lines, line] });
  };

  const addFromCatalogue = (catId: string) => {
    const item = app.data.catalogue.find((c) => c.id === catId);
    if (!item) return;
    const line: EditLine = {
      id: newId(),
      catalogueItemId: item.id,
      nom: item.nom,
      description: item.description,
      dimensions: '',
      quantite: '1',
      prixUnitaireTTC: String(item.prixTTC),
    };
    patch({ lines: [...doc.lines, line] });
  };

  const updateLine = (id: string, p: Partial<EditLine>) => {
    patch({ lines: doc.lines.map((l) => (l.id === id ? { ...l, ...p } : l)) });
  };
  const removeLine = (id: string) => {
    patch({ lines: doc.lines.filter((l) => l.id !== id) });
  };

  const validate = (): string | null => {
    if (!doc.clientNom.trim()) return 'Le nom du client est requis.';
    if (doc.lines.length === 0) return 'Ajoutez au moins un article.';
    if (doc.lines.some((l) => !l.nom.trim())) return 'Chaque ligne doit avoir une désignation.';
    return null;
  };

  const persist = (): SalesDocument | null => {
    const err = validate();
    if (err) {
      toast(err, 'error');
      return null;
    }
    const saved = app.saveDocument(toDocument(doc));
    setDoc(toEdit(saved));
    return saved;
  };

  const onSave = () => {
    const saved = persist();
    if (saved) {
      toast(`${titleType} ${saved.numero} enregistré(e).`, 'success');
      if (isNew) navigate(`/documents/${saved.id}`, { replace: true });
    }
  };

  const onPDF = async () => {
    const saved = persist();
    if (!saved) return;
    try {
      const { downloadDocumentPDF } = await import('../../components/pdf/DocumentPDF');
      await downloadDocumentPDF(saved, settings);
      if (isNew) navigate(`/documents/${saved.id}`, { replace: true });
    } catch (e) {
      console.error(e);
      toast('Échec de la génération du PDF.', 'error');
    }
  };

  const onCreateCommande = () => {
    const saved = persist();
    if (!saved) return;
    const cmd = app.createCommandeFromDocument(saved.id);
    if (cmd) {
      toast(`Commande ${cmd.numero} créée.`, 'success');
      navigate(`/atelier/${cmd.id}`);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <button className="btn btn-sm btn-ghost" onClick={() => navigate('/documents')}>
            <IconBack width={15} height={15} /> Documents
          </button>
          <h1 style={{ marginTop: 8 }}>
            {titleType} <span className="faint">{numeroDisplay}</span>
          </h1>
        </div>
        <div className="toolbar">
          <button className="btn" onClick={onCreateCommande} title="Générer une commande atelier">
            <IconOrders /> Créer une commande
          </button>
          <button className="btn" onClick={onPDF}>
            <IconDownload /> PDF
          </button>
          <button className="btn btn-primary" onClick={onSave}>
            Enregistrer
          </button>
        </div>
      </div>

      <div className="editor-grid">
        <div className="stack">
          {/* Client */}
          <div className="card card-pad">
            <h2 style={{ fontSize: 16, marginBottom: 14 }}>Client</h2>
            <div className="grid grid-2">
              <div className="field">
                <label>Nom / Raison sociale</label>
                <input
                  list="clients-list"
                  value={doc.clientNom}
                  onChange={(e) => applyClientByName(e.target.value)}
                  placeholder="Nom du client"
                />
                <datalist id="clients-list">
                  {app.data.clients.map((c) => (
                    <option key={c.id} value={c.nom} />
                  ))}
                </datalist>
                {!doc.clientId && doc.clientNom.trim() && (
                  <div className="hint">Nouveau client — il sera créé automatiquement.</div>
                )}
              </div>
              <div className="field">
                <label>Téléphone</label>
                <input
                  value={doc.clientTel}
                  onChange={(e) => patch({ clientTel: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Adresse</label>
                <input
                  value={doc.clientAdresse}
                  onChange={(e) => patch({ clientAdresse: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Matricule fiscal</label>
                <input value={doc.clientMF} onChange={(e) => patch({ clientMF: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-2 mt">
              <div className="field">
                <label>Date du document</label>
                <input
                  type="date"
                  value={doc.date}
                  onChange={(e) => patch({ date: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Articles */}
          <div className="card card-pad">
            <div className="row spread" style={{ marginBottom: 14 }}>
              <h2 style={{ fontSize: 16 }}>Articles</h2>
              <div className="row gap-sm">
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) addFromCatalogue(e.target.value);
                    e.target.value = '';
                  }}
                  style={{ width: 'auto' }}
                >
                  <option value="">+ Depuis le catalogue…</option>
                  {[...app.data.catalogue]
                    .sort((a, b) => a.nom.localeCompare(b.nom))
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nom} — {formatTND(c.prixTTC)}
                      </option>
                    ))}
                </select>
                <button className="btn btn-sm" onClick={addBlankLine}>
                  <IconPlus width={15} height={15} /> Ligne
                </button>
              </div>
            </div>

            {doc.lines.length === 0 ? (
              <div className="empty" style={{ padding: 30 }}>
                <div>Aucun article. Ajoutez depuis le catalogue ou une ligne vide.</div>
              </div>
            ) : (
              doc.lines.map((l) => {
                const r = computeLine(
                  {
                    prixUnitaireTTC: parseNumber(l.prixUnitaireTTC),
                    quantite: parseNumber(l.quantite),
                  },
                  settings.fiscal,
                );
                return (
                  <div className="line-card" key={l.id}>
                    <div className="row spread" style={{ marginBottom: 10 }}>
                      <input
                        value={l.nom}
                        onChange={(e) => updateLine(l.id, { nom: e.target.value })}
                        placeholder="Désignation de l'article"
                        style={{ fontWeight: 700, maxWidth: 360 }}
                      />
                      <button
                        className="btn btn-icon btn-ghost"
                        onClick={() => removeLine(l.id)}
                        aria-label="Retirer la ligne"
                      >
                        <IconClose width={16} height={16} />
                      </button>
                    </div>
                    <div className="grid grid-2" style={{ marginBottom: 10 }}>
                      <div className="field">
                        <label>Description</label>
                        <input
                          value={l.description}
                          onChange={(e) => updateLine(l.id, { description: e.target.value })}
                        />
                      </div>
                      <div className="field">
                        <label>Dimensions</label>
                        <input
                          value={l.dimensions}
                          onChange={(e) => updateLine(l.id, { dimensions: e.target.value })}
                          placeholder="Ex. 120 × 60 × 45 cm"
                        />
                      </div>
                    </div>
                    <div className="line-grid">
                      <div className="field">
                        <label>Prix unitaire TTC (TND)</label>
                        <input
                          className="input-ttc"
                          inputMode="decimal"
                          value={l.prixUnitaireTTC}
                          onChange={(e) => updateLine(l.id, { prixUnitaireTTC: e.target.value })}
                          placeholder="0.000"
                        />
                      </div>
                      <div className="field">
                        <label>Qté</label>
                        <input
                          inputMode="decimal"
                          value={l.quantite}
                          onChange={(e) => updateLine(l.id, { quantite: e.target.value })}
                        />
                      </div>
                      <div className="field">
                        <label>Total ligne (TTC facturé)</label>
                        <input readOnly value={formatTND(r.ttc)} />
                      </div>
                    </div>
                    <div className="line-breakdown">
                      <span>
                        HT <b>{formatTND(r.ht)}</b>
                      </span>
                      <span>
                        FODEC <b>{formatTND(r.fodec)}</b>
                      </span>
                      <span>
                        TVA <b>{formatTND(r.tva)}</b>
                      </span>
                      <span>
                        P.U. HT <b>{formatTND(r.prixUnitaireHT)}</b>
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Livraison & notes */}
          <div className="card card-pad">
            <div className="grid grid-2">
              <div className="field">
                <label>Frais de livraison TTC (TND)</label>
                <input
                  className="input-ttc"
                  inputMode="decimal"
                  value={doc.livraisonTTC}
                  onChange={(e) => patch({ livraisonTTC: e.target.value })}
                  placeholder="0.000"
                />
                <div className="hint">
                  Champ indépendant (hors catalogue), saisie manuelle, intégré au total.
                </div>
              </div>
            </div>
            <div className="field mt">
              <label>Notes (optionnel)</label>
              <textarea value={doc.notes} onChange={(e) => patch({ notes: e.target.value })} />
            </div>
          </div>
        </div>

        {/* Totaux */}
        <div className="card card-pad totals-box">
          <h2 style={{ fontSize: 16, marginBottom: 12 }}>Totaux</h2>
          <div className="totals-line">
            <span>Total HT</span>
            <span className="num">{formatTND(totals.totalHT)}</span>
          </div>
          <div className="totals-line">
            <span>FODEC ({Math.round(settings.fiscal.fodecRate * 100)}%)</span>
            <span className="num">{formatTND(totals.totalFODEC)}</span>
          </div>
          <div className="totals-line">
            <span>TVA ({Math.round(settings.fiscal.tvaRate * 100)}%)</span>
            <span className="num">{formatTND(totals.totalTVA)}</span>
          </div>
          <div className="totals-line">
            <span>Total TTC</span>
            <span className="num">{formatTND(totals.totalTTC)}</span>
          </div>
          <div className="totals-line">
            <span>Timbre fiscal</span>
            <span className="num">{formatTND(totals.timbreFiscal)}</span>
          </div>
          <div className="totals-line total">
            <span>Net à payer</span>
            <span className="num">{formatTND(totals.netAPayer)}</span>
          </div>
          <div className="hint mt">
            Vous saisissez uniquement le TTC. Le HT et les taxes sont calculés automatiquement et
            n'apparaissent pas en prix unitaire TTC sur le PDF.
          </div>
        </div>
      </div>
    </div>
  );
}
