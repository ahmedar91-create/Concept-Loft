import { DEFAULT_FISCAL_CONFIG } from '../lib/fiscal';
import { DEFAULT_SETTINGS } from './defaults';
import { DATA_VERSION, type AppData, type Commande, type CommandeStatut } from './types';

/** Convertit les anciens statuts (5 valeurs) vers les 3 statuts actuels. */
function normalizeStatut(s: unknown): CommandeStatut {
  if (s === 'livre' || s === 'livree') return 'livre';
  if (s === 'retour') return 'retour';
  return 'en_production'; // nouvelle, en_cours, en_production, prete -> en production
}

function normalizeCommandes(list: unknown): Commande[] {
  if (!Array.isArray(list)) return [];
  return list.map((c) => {
    const cmd = c as Commande;
    return {
      ...cmd,
      adresse: cmd?.adresse ?? '',
      telephone: cmd?.telephone ?? '',
      statut: normalizeStatut(cmd?.statut),
    };
  });
}

/**
 * Normalise des données potentiellement partielles ou anciennes vers la forme
 * AppData courante. Utilisé au chargement et à l'import pour garantir la robustesse.
 */
export function migrate(raw: unknown): AppData {
  const data = (raw && typeof raw === 'object' ? raw : {}) as Partial<AppData>;
  const settingsIn = (data.settings ?? {}) as Partial<AppData['settings']>;

  return {
    version: DATA_VERSION,
    settings: {
      company: { ...DEFAULT_SETTINGS.company, ...(settingsIn.company ?? {}) },
      fiscal: { ...DEFAULT_FISCAL_CONFIG, ...(settingsIn.fiscal ?? {}) },
      theme: settingsIn.theme === 'dark' ? 'dark' : 'light',
      counters: {
        devis: settingsIn.counters?.devis ?? 0,
        facture: settingsIn.counters?.facture ?? 0,
        commande: settingsIn.counters?.commande ?? 0,
      },
    },
    clients: Array.isArray(data.clients) ? data.clients : [],
    catalogue: Array.isArray(data.catalogue) ? data.catalogue : [],
    documents: Array.isArray(data.documents) ? data.documents : [],
    commandes: normalizeCommandes(data.commandes),
  };
}
