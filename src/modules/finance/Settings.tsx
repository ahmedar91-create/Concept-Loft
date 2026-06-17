import { useRef, useState } from 'react';
import { useApp } from '../../state/AppContext';
import { useAuth } from '../../auth/AuthProvider';
import { useUI } from '../../components/ui';
import { formatDate, parseNumber } from '../../lib/format';
import {
  clearBackups,
  deleteBackup,
  exportToFile,
  importFromFile,
  listBackups,
  restoreBackup,
  type BackupEntry,
} from '../../data/backup';
import { DEFAULT_FISCAL_CONFIG } from '../../lib/fiscal';
import { IconDownload, IconMoon, IconSun, IconTrash } from '../../components/Icons';

export function Settings() {
  const app = useApp();
  const { settings, data, mode, theme, toggleTheme, updateCompany, updateFiscal, replaceAllData } =
    app;
  const { user, signOut } = useAuth();
  const { toast, confirm } = useUI();
  const fileInput = useRef<HTMLInputElement>(null);
  const [backups, setBackups] = useState<BackupEntry[]>(() => listBackups());

  // Champs société (édition locale).
  const [company, setCompany] = useState(settings.company);
  const [fiscal, setFiscal] = useState({
    tva: String(Math.round(settings.fiscal.tvaRate * 100)),
    fodec: String(Math.round(settings.fiscal.fodecRate * 100)),
    timbre: String(settings.fiscal.timbreFiscal),
  });

  const refreshBackups = () => setBackups(listBackups());

  const saveCompany = () => {
    updateCompany(company);
    toast('Informations société enregistrées.', 'success');
    refreshBackups();
  };

  const saveFiscal = () => {
    updateFiscal({
      tvaRate: parseNumber(fiscal.tva) / 100,
      fodecRate: parseNumber(fiscal.fodec) / 100,
      timbreFiscal: parseNumber(fiscal.timbre),
    });
    toast('Configuration fiscale enregistrée.', 'success');
    refreshBackups();
  };

  const resetFiscal = () => {
    setFiscal({
      tva: String(Math.round(DEFAULT_FISCAL_CONFIG.tvaRate * 100)),
      fodec: String(Math.round(DEFAULT_FISCAL_CONFIG.fodecRate * 100)),
      timbre: String(DEFAULT_FISCAL_CONFIG.timbreFiscal),
    });
  };

  const doExport = () => {
    exportToFile(data);
    toast('Export généré (fichier unique).', 'success');
  };

  const onImportFile = async (file: File) => {
    const ok = await confirm({
      title: 'Importer et remplacer les données ?',
      message:
        'Toutes les données actuelles (clients, catalogue, devis, factures, commandes, paramètres) seront remplacées par le contenu du fichier. Une sauvegarde de l’état actuel est conservée dans l’historique.',
      danger: true,
      confirmLabel: 'Importer',
    });
    if (!ok) return;
    try {
      const imported = await importFromFile(file);
      replaceAllData(imported);
      refreshBackups();
      toast('Données importées avec succès.', 'success');
    } catch (e) {
      console.error(e);
      toast('Fichier invalide ou illisible.', 'error');
    }
  };

  const doRestore = async (entry: BackupEntry) => {
    const ok = await confirm({
      title: 'Restaurer cette sauvegarde ?',
      message: `L'état du ${formatDate(entry.timestamp)} (${new Date(entry.timestamp).toLocaleTimeString('fr-FR')}) remplacera les données actuelles.`,
      confirmLabel: 'Restaurer',
    });
    if (!ok) return;
    const restored = restoreBackup(entry.id);
    if (restored) {
      replaceAllData(restored);
      refreshBackups();
      toast('Sauvegarde restaurée.', 'success');
    }
  };

  const removeBackup = (entry: BackupEntry) => {
    deleteBackup(entry.id);
    refreshBackups();
  };

  const wipeBackups = async () => {
    const ok = await confirm({
      title: 'Vider l’historique des sauvegardes ?',
      message: 'Les points de restauration locaux seront supprimés. Les données actuelles restent intactes.',
      danger: true,
      confirmLabel: 'Vider',
    });
    if (ok) {
      clearBackups();
      refreshBackups();
      toast('Historique vidé.');
    }
  };

  const counts = {
    clients: data.clients.length,
    catalogue: data.catalogue.length,
    documents: data.documents.length,
    commandes: data.commandes.length,
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Paramètres & Sauvegarde</h1>
          <div className="subtitle">Société, fiscalité, apparence et sécurité des données.</div>
        </div>
      </div>

      <div className="stack">
        {/* Société */}
        <div className="card card-pad">
          <h2 style={{ fontSize: 16, marginBottom: 14 }}>Société (affichée sur tous les documents)</h2>
          <div className="grid grid-2">
            <div className="field">
              <label>Nom</label>
              <input
                value={company.nom}
                onChange={(e) => setCompany({ ...company, nom: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Téléphone</label>
              <input
                value={company.telephone}
                onChange={(e) => setCompany({ ...company, telephone: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Adresse</label>
              <input
                value={company.adresse}
                onChange={(e) => setCompany({ ...company, adresse: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Matricule fiscal</label>
              <input
                value={company.matriculeFiscal}
                onChange={(e) => setCompany({ ...company, matriculeFiscal: e.target.value })}
              />
            </div>
          </div>
          <div className="mt">
            <button className="btn btn-primary" onClick={saveCompany}>
              Enregistrer la société
            </button>
          </div>
        </div>

        {/* Fiscalité */}
        <div className="card card-pad">
          <h2 style={{ fontSize: 16, marginBottom: 6 }}>Configuration fiscale</h2>
          <div className="hint" style={{ marginBottom: 14 }}>
            Valeurs par défaut CONCEPT LOFT : TVA 19 %, FODEC 1 %, Timbre fiscal 1 TND. Le calcul
            reste toujours en TTC (HT = TTC ÷ (1 + TVA% + FODEC%)).
          </div>
          <div className="grid grid-3">
            <div className="field">
              <label>TVA (%)</label>
              <input
                inputMode="decimal"
                value={fiscal.tva}
                onChange={(e) => setFiscal({ ...fiscal, tva: e.target.value })}
              />
            </div>
            <div className="field">
              <label>FODEC (%)</label>
              <input
                inputMode="decimal"
                value={fiscal.fodec}
                onChange={(e) => setFiscal({ ...fiscal, fodec: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Timbre fiscal (TND)</label>
              <input
                inputMode="decimal"
                value={fiscal.timbre}
                onChange={(e) => setFiscal({ ...fiscal, timbre: e.target.value })}
              />
            </div>
          </div>
          <div className="row gap-sm mt">
            <button className="btn btn-primary" onClick={saveFiscal}>
              Enregistrer la fiscalité
            </button>
            <button className="btn" onClick={resetFiscal}>
              Valeurs par défaut
            </button>
          </div>
        </div>

        {/* Apparence */}
        <div className="card card-pad">
          <div className="row spread">
            <div>
              <h2 style={{ fontSize: 16 }}>Apparence</h2>
              <div className="hint">Mode clair / sombre — préférence sauvegardée automatiquement.</div>
            </div>
            <button className="btn" onClick={toggleTheme}>
              {theme === 'dark' ? <IconSun /> : <IconMoon />}
              {theme === 'dark' ? 'Passer en clair' : 'Passer en sombre'}
            </button>
          </div>
        </div>

        {/* Export / Import */}
        <div className="card card-pad">
          <h2 style={{ fontSize: 16, marginBottom: 6 }}>Export / Import global</h2>
          <div className="hint" style={{ marginBottom: 14 }}>
            Sauvegarde de TOUTES les données dans un fichier unique : clients ({counts.clients}),
            catalogue ({counts.catalogue}), documents ({counts.documents}), commandes (
            {counts.commandes}) et paramètres.
          </div>
          <div className="row gap-sm wrap">
            <button className="btn btn-primary" onClick={doExport}>
              <IconDownload /> Exporter toutes les données
            </button>
            <button className="btn" onClick={() => fileInput.current?.click()}>
              Importer un fichier…
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onImportFile(f);
                e.target.value = '';
              }}
            />
          </div>
        </div>

        {/* Historique des sauvegardes */}
        <div className="card card-pad">
          <div className="row spread" style={{ marginBottom: 12 }}>
            <div>
              <h2 style={{ fontSize: 16 }}>Historique des sauvegardes</h2>
              <div className="hint">
                Sauvegarde automatique locale après chaque modification importante (25 points
                conservés).
              </div>
            </div>
            {backups.length > 0 && (
              <button className="btn btn-sm btn-danger" onClick={wipeBackups}>
                Vider
              </button>
            )}
          </div>
          {backups.length === 0 ? (
            <div className="hint">Aucune sauvegarde pour l’instant.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date & heure</th>
                    <th>Action</th>
                    <th className="num">Contenu</th>
                    <th style={{ width: 180 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {backups.map((b) => (
                    <tr key={b.id}>
                      <td>
                        {formatDate(b.timestamp)}{' '}
                        <span className="faint">
                          {new Date(b.timestamp).toLocaleTimeString('fr-FR')}
                        </span>
                      </td>
                      <td className="muted">{b.label}</td>
                      <td className="num faint">
                        {b.data.documents.length} doc · {b.data.commandes.length} cmd
                      </td>
                      <td>
                        <div className="row-actions">
                          <button className="btn btn-sm" onClick={() => doRestore(b)}>
                            Restaurer
                          </button>
                          <button
                            className="btn btn-icon btn-ghost"
                            onClick={() => removeBackup(b)}
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
        </div>

        {/* Stockage / multi-appareils */}
        <div className="card card-pad">
          <h2 style={{ fontSize: 16, marginBottom: 6 }}>Stockage des données</h2>
          {mode === 'supabase' ? (
            <>
              <div className="hint">
                ✅ Mode multi-appareils actif (Supabase). Les données sont synchronisées en temps
                réel entre le poste bureau et l’atelier.
              </div>
              {user && (
                <div className="row spread mt" style={{ flexWrap: 'wrap', gap: 10 }}>
                  <span className="muted">
                    Connecté en tant que <strong>{user.email}</strong>
                  </span>
                  <button className="btn btn-sm" onClick={signOut}>
                    Se déconnecter
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="hint">
              Mode local (cet appareil uniquement). Pour activer le multi-appareils gratuitement,
              créez un projet Supabase et renseignez les clés dans le fichier <code>.env</code> —
              voir le <strong>README</strong>. Pensez à exporter régulièrement vos données.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
