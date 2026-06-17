import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../state/AppContext';
import { useUI } from '../../components/ui';
import { computeDocumentTotals } from '../../lib/fiscal';
import { formatDate, formatTND } from '../../lib/format';
import type { DocumentType, SalesDocument } from '../../data/types';
import {
  IconCopy,
  IconDownload,
  IconEdit,
  IconOrders,
  IconPlus,
  IconTrash,
} from '../../components/Icons';

type Filter = 'tous' | DocumentType;

export function Documents() {
  const { data, settings, deleteDocument, duplicateDocument, createCommandeFromDocument } = useApp();
  const { toast, confirm } = useUI();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('tous');
  const [search, setSearch] = useState('');

  const total = (doc: SalesDocument) =>
    computeDocumentTotals(
      doc.lines.map((l) => ({ prixUnitaireTTC: l.prixUnitaireTTC, quantite: l.quantite })),
      doc.livraisonTTC,
      settings.fiscal,
    ).netAPayer;

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...data.documents]
      .filter((d) => (filter === 'tous' ? true : d.type === filter))
      .filter(
        (d) =>
          !q ||
          d.numero.toLowerCase().includes(q) ||
          d.client.nom.toLowerCase().includes(q),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [data.documents, filter, search]);

  const remove = async (doc: SalesDocument) => {
    const ok = await confirm({
      title: 'Supprimer le document ?',
      message: `${doc.type === 'devis' ? 'Le devis' : 'La facture'} ${doc.numero} sera définitivement supprimé(e).`,
      danger: true,
      confirmLabel: 'Supprimer',
    });
    if (ok) {
      deleteDocument(doc.id);
      toast('Document supprimé.');
    }
  };

  const duplicate = (doc: SalesDocument) => {
    const copy = duplicateDocument(doc.id);
    if (copy) {
      toast(`Dupliqué en ${copy.numero}.`, 'success');
      navigate(`/documents/${copy.id}`);
    }
  };

  const makeCommande = async (doc: SalesDocument) => {
    const ok = await confirm({
      title: 'Créer une commande ?',
      message: `Une commande atelier sera générée depuis ${doc.numero} (client, articles, montant copiés). Le document n'est pas modifié.`,
      confirmLabel: 'Créer la commande',
    });
    if (!ok) return;
    const cmd = createCommandeFromDocument(doc.id);
    if (cmd) {
      toast(`Commande ${cmd.numero} créée.`, 'success');
      navigate(`/atelier/${cmd.id}`);
    }
  };

  const pdf = async (doc: SalesDocument) => {
    try {
      const { downloadDocumentPDF } = await import('../../components/pdf/DocumentPDF');
      await downloadDocumentPDF(doc, settings);
    } catch (e) {
      console.error(e);
      toast('Échec de la génération du PDF.', 'error');
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Devis & Factures</h1>
          <div className="subtitle">Gestion complète des documents commerciaux.</div>
        </div>
        <div className="toolbar">
          <button className="btn btn-primary" onClick={() => navigate('/documents/nouveau/devis')}>
            <IconPlus /> Devis
          </button>
          <button className="btn" onClick={() => navigate('/documents/nouveau/facture')}>
            <IconPlus /> Facture
          </button>
        </div>
      </div>

      <div className="toolbar" style={{ marginBottom: 16 }}>
        <div className="m-filters" style={{ marginBottom: 0 }}>
          {(['tous', 'devis', 'facture'] as Filter[]).map((f) => (
            <button
              key={f}
              className={`chip ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'tous' ? 'Tous' : f === 'devis' ? 'Devis' : 'Factures'}
            </button>
          ))}
        </div>
        <input
          className="search"
          placeholder="Rechercher (numéro, client)…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {list.length === 0 ? (
        <div className="card empty">
          <h3>Aucun document</h3>
          <div>Créez un devis ou une facture pour commencer.</div>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Numéro</th>
                <th>Date</th>
                <th>Type</th>
                <th>Client</th>
                <th className="num">Montant total</th>
                <th style={{ width: 200 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((doc) => (
                <tr key={doc.id}>
                  <td className="strong">{doc.numero}</td>
                  <td className="muted">{formatDate(doc.date)}</td>
                  <td>
                    <span className="badge badge-type">{doc.type}</span>
                  </td>
                  <td>{doc.client.nom || '—'}</td>
                  <td className="num strong">{formatTND(total(doc))}</td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="btn btn-icon btn-ghost"
                        title="Voir / Modifier"
                        onClick={() => navigate(`/documents/${doc.id}`)}
                      >
                        <IconEdit />
                      </button>
                      <button
                        className="btn btn-icon btn-ghost"
                        title="Dupliquer"
                        onClick={() => duplicate(doc)}
                      >
                        <IconCopy />
                      </button>
                      <button
                        className="btn btn-icon btn-ghost"
                        title="Télécharger PDF"
                        onClick={() => pdf(doc)}
                      >
                        <IconDownload />
                      </button>
                      <button
                        className="btn btn-icon btn-ghost"
                        title="Créer une commande"
                        onClick={() => makeCommande(doc)}
                      >
                        <IconOrders />
                      </button>
                      <button
                        className="btn btn-icon btn-ghost"
                        title="Supprimer"
                        onClick={() => remove(doc)}
                      >
                        <IconTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
