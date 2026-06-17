import { useMemo, useState } from 'react';
import { useApp } from '../../state/AppContext';
import { Modal, useUI } from '../../components/ui';
import type { Client } from '../../data/types';
import { IconEdit, IconPlus, IconTrash } from '../../components/Icons';

interface FormState {
  id?: string;
  nom: string;
  adresse: string;
  telephone: string;
  matriculeFiscal: string;
}
const EMPTY: FormState = { nom: '', adresse: '', telephone: '', matriculeFiscal: '' };

export function Clients() {
  const { data, upsertClient, deleteClient } = useApp();
  const { toast, confirm } = useUI();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);

  const docCount = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of data.documents) {
      if (d.clientId) map.set(d.clientId, (map.get(d.clientId) ?? 0) + 1);
    }
    return map;
  }, [data.documents]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = [...data.clients].sort((a, b) => a.nom.localeCompare(b.nom));
    if (!q) return list;
    return list.filter(
      (c) =>
        c.nom.toLowerCase().includes(q) ||
        c.telephone.toLowerCase().includes(q) ||
        c.matriculeFiscal.toLowerCase().includes(q),
    );
  }, [data.clients, search]);

  const openNew = () => {
    setForm(EMPTY);
    setOpen(true);
  };
  const openEdit = (c: Client) => {
    setForm({
      id: c.id,
      nom: c.nom,
      adresse: c.adresse,
      telephone: c.telephone,
      matriculeFiscal: c.matriculeFiscal,
    });
    setOpen(true);
  };

  const save = () => {
    if (!form.nom.trim()) return toast('Le nom du client est requis.', 'error');
    upsertClient({
      id: form.id,
      nom: form.nom.trim(),
      adresse: form.adresse.trim(),
      telephone: form.telephone.trim(),
      matriculeFiscal: form.matriculeFiscal.trim(),
    });
    toast(form.id ? 'Client mis à jour.' : 'Client ajouté.', 'success');
    setOpen(false);
  };

  const remove = async (c: Client) => {
    const ok = await confirm({
      title: 'Supprimer le client ?',
      message: `« ${c.nom} » sera retiré de la base clients. Les documents existants ne sont pas affectés.`,
      danger: true,
      confirmLabel: 'Supprimer',
    });
    if (ok) {
      deleteClient(c.id);
      toast('Client supprimé.');
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Clients</h1>
          <div className="subtitle">
            Base clients centralisée. Création automatique lors de l'émission d'un document.
          </div>
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          <IconPlus /> Nouveau client
        </button>
      </div>

      <div className="toolbar" style={{ marginBottom: 16 }}>
        <input
          className="search"
          placeholder="Rechercher (nom, téléphone, MF)…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="card empty">
          <h3>Aucun client</h3>
          <div>Ajoutez un client ou créez un document pour l'enregistrer automatiquement.</div>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Adresse</th>
                <th>Téléphone</th>
                <th>Matricule fiscal</th>
                <th className="num">Docs</th>
                <th style={{ width: 96 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td className="strong">{c.nom}</td>
                  <td className="muted">{c.adresse || '—'}</td>
                  <td className="muted">{c.telephone || '—'}</td>
                  <td className="muted">{c.matriculeFiscal || '—'}</td>
                  <td className="num">{docCount.get(c.id) ?? 0}</td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="btn btn-icon btn-ghost"
                        onClick={() => openEdit(c)}
                        aria-label="Modifier"
                      >
                        <IconEdit />
                      </button>
                      <button
                        className="btn btn-icon btn-ghost"
                        onClick={() => remove(c)}
                        aria-label="Supprimer"
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

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={form.id ? 'Modifier le client' : 'Nouveau client'}
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
            <label>Nom / Raison sociale</label>
            <input
              autoFocus
              value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Adresse</label>
            <textarea
              value={form.adresse}
              onChange={(e) => setForm({ ...form, adresse: e.target.value })}
            />
          </div>
          <div className="grid grid-2">
            <div className="field">
              <label>Téléphone</label>
              <input
                value={form.telephone}
                onChange={(e) => setForm({ ...form, telephone: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Matricule fiscal</label>
              <input
                value={form.matriculeFiscal}
                onChange={(e) => setForm({ ...form, matriculeFiscal: e.target.value })}
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
