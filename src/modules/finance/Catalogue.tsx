import { useMemo, useState } from 'react';
import { useApp } from '../../state/AppContext';
import { useUI } from '../../components/ui';
import { Modal } from '../../components/ui';
import { decomposeTTC } from '../../lib/fiscal';
import { formatTND, parseNumber } from '../../lib/format';
import type { CatalogueItem } from '../../data/types';
import { IconEdit, IconPlus, IconTrash } from '../../components/Icons';

interface FormState {
  id?: string;
  nom: string;
  description: string;
  prixTTC: string;
}

const EMPTY: FormState = { nom: '', description: '', prixTTC: '' };

export function Catalogue() {
  const { data, settings, addCatalogueItem, updateCatalogueItem, deleteCatalogueItem } = useApp();
  const { toast, confirm } = useUI();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = [...data.catalogue].sort((a, b) => a.nom.localeCompare(b.nom));
    if (!q) return list;
    return list.filter(
      (c) => c.nom.toLowerCase().includes(q) || c.description.toLowerCase().includes(q),
    );
  }, [data.catalogue, search]);

  const ttc = parseNumber(form.prixTTC);
  const bd = decomposeTTC(ttc, settings.fiscal);

  const openNew = () => {
    setForm(EMPTY);
    setOpen(true);
  };
  const openEdit = (item: CatalogueItem) => {
    setForm({
      id: item.id,
      nom: item.nom,
      description: item.description,
      prixTTC: String(item.prixTTC),
    });
    setOpen(true);
  };

  const save = () => {
    if (!form.nom.trim()) return toast('Le nom de l’article est requis.', 'error');
    const payload = {
      nom: form.nom.trim(),
      description: form.description.trim(),
      prixTTC: parseNumber(form.prixTTC),
    };
    if (form.id) {
      updateCatalogueItem(form.id, payload);
      toast('Article mis à jour.', 'success');
    } else {
      addCatalogueItem(payload);
      toast('Article ajouté au catalogue.', 'success');
    }
    setOpen(false);
  };

  const remove = async (item: CatalogueItem) => {
    const ok = await confirm({
      title: 'Supprimer l’article ?',
      message: `« ${item.nom} » sera retiré du catalogue. Les documents existants ne sont pas affectés.`,
      danger: true,
      confirmLabel: 'Supprimer',
    });
    if (ok) {
      deleteCatalogueItem(item.id);
      toast('Article supprimé.');
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Catalogue</h1>
          <div className="subtitle">
            Modèles d'articles (prix TTC de référence). Modifiables à l'usage sans impacter le
            catalogue.
          </div>
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          <IconPlus /> Nouvel article
        </button>
      </div>

      <div className="toolbar" style={{ marginBottom: 16 }}>
        <input
          className="search"
          placeholder="Rechercher un article…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="card empty">
          <h3>Aucun article</h3>
          <div>Ajoutez votre premier article au catalogue.</div>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Article</th>
                <th>Description</th>
                <th className="num">HT</th>
                <th className="num">TVA + FODEC</th>
                <th className="num">Prix TTC réf.</th>
                <th style={{ width: 96 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const b = decomposeTTC(item.prixTTC, settings.fiscal);
                return (
                  <tr key={item.id}>
                    <td className="strong">{item.nom}</td>
                    <td className="muted">{item.description || '—'}</td>
                    <td className="num muted">{formatTND(b.ht)}</td>
                    <td className="num muted">{formatTND(b.tva + b.fodec)}</td>
                    <td className="num strong">{formatTND(item.prixTTC)}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="btn btn-icon btn-ghost"
                          onClick={() => openEdit(item)}
                          aria-label="Modifier"
                        >
                          <IconEdit />
                        </button>
                        <button
                          className="btn btn-icon btn-ghost"
                          onClick={() => remove(item)}
                          aria-label="Supprimer"
                        >
                          <IconTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={form.id ? 'Modifier l’article' : 'Nouvel article'}
        footer={
          <>
            <button className="btn" onClick={() => setOpen(false)}>
              Annuler
            </button>
            <button className="btn btn-primary" onClick={save}>
              Enregistrer
            </button>
          </>
        }
      >
        <div className="stack">
          <div className="field">
            <label>Nom de l'article</label>
            <input
              autoFocus
              value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })}
              placeholder="Ex. Table basse industrielle"
            />
          </div>
          <div className="field">
            <label>Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Matériaux, finition…"
            />
          </div>
          <div className="field">
            <label>Prix TTC de référence (TND)</label>
            <input
              className="input-ttc"
              inputMode="decimal"
              value={form.prixTTC}
              onChange={(e) => setForm({ ...form, prixTTC: e.target.value })}
              placeholder="0.000"
            />
            <div className="line-breakdown">
              <span>
                HT <b>{formatTND(bd.ht)}</b>
              </span>
              <span>
                FODEC <b>{formatTND(bd.fodec)}</b>
              </span>
              <span>
                TVA <b>{formatTND(bd.tva)}</b>
              </span>
            </div>
            <div className="hint">
              Vous saisissez le TTC. Le HT, la TVA et le FODEC sont calculés automatiquement.
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
