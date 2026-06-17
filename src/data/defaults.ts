import { DEFAULT_FISCAL_CONFIG } from '../lib/fiscal';
import { newId, nowISO } from '../lib/id';
import { DATA_VERSION, type AppData, type AppSettings } from './types';

/** Informations société CONCEPT LOFT — fixes (modifiables dans Paramètres). */
export const DEFAULT_SETTINGS: AppSettings = {
  company: {
    nom: 'CONCEPT LOFT',
    adresse: "Jardin d'el Menzah 2",
    telephone: '+216 54 456 099',
    matriculeFiscal: '1703110/X',
  },
  fiscal: { ...DEFAULT_FISCAL_CONFIG },
  theme: 'light',
  counters: { devis: 0, facture: 0, commande: 0 },
};

/** Quelques articles d'exemple pour démarrer (supprimables). */
function seedCatalogue() {
  const ts = nowISO();
  return [
    {
      id: newId(),
      nom: 'Table basse industrielle',
      description: 'Plateau bois massif, piètement métal noir',
      prixTTC: 540,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: newId(),
      nom: 'Étagère murale acier',
      description: 'Structure acier thermolaqué, 3 niveaux',
      prixTTC: 320,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: newId(),
      nom: 'Verrière atelier',
      description: 'Profilés acier noir mat, vitrage clair',
      prixTTC: 1250,
      createdAt: ts,
      updatedAt: ts,
    },
  ];
}

/** État initial complet de l'application (premier lancement). */
export function createInitialData(): AppData {
  return {
    version: DATA_VERSION,
    settings: structuredCloneSafe(DEFAULT_SETTINGS),
    clients: [],
    catalogue: seedCatalogue(),
    documents: [],
    commandes: [],
  };
}

/** Clone profond sûr (repli si structuredClone indisponible). */
export function structuredCloneSafe<T>(value: T): T {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}
