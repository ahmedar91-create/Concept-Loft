import type { FiscalConfig } from '../lib/fiscal';

export const DATA_VERSION = 1;

export type DocumentType = 'devis' | 'facture';

/** Informations société — fixes sur tous les documents (modifiables dans Paramètres). */
export interface CompanyInfo {
  nom: string;
  adresse: string;
  telephone: string;
  matriculeFiscal: string;
}

export type ThemeMode = 'light' | 'dark';

export interface Counters {
  devis: number;
  facture: number;
  commande: number;
}

export interface AppSettings {
  company: CompanyInfo;
  fiscal: FiscalConfig;
  theme: ThemeMode;
  counters: Counters;
}

/** ─────────────────────────── MODULE FINANCIER ─────────────────────────── */

export interface Client {
  id: string;
  nom: string;
  adresse: string;
  telephone: string;
  matriculeFiscal: string;
  createdAt: string;
  updatedAt: string;
}

/** Catalogue central unique — sert UNIQUEMENT de modèle (jamais modifié à l'usage). */
export interface CatalogueItem {
  id: string;
  nom: string;
  description: string;
  /** Prix TTC de référence. */
  prixTTC: number;
  createdAt: string;
  updatedAt: string;
}

/** Ligne d'un devis/facture. Copiée du catalogue puis librement modifiable (sans impacter le catalogue). */
export interface DocumentLine {
  id: string;
  /** Origine catalogue (informative) — ne crée AUCUN lien de modification. */
  catalogueItemId: string | null;
  nom: string;
  description: string;
  dimensions: string;
  quantite: number;
  /** Prix unitaire TTC — SEULE valeur saisie par l'utilisateur. */
  prixUnitaireTTC: number;
}

/** Instantané figé du client au moment de la création du document. */
export interface ClientSnapshot {
  nom: string;
  adresse: string;
  telephone: string;
  matriculeFiscal: string;
}

export interface SalesDocument {
  id: string;
  type: DocumentType;
  numero: string;
  /** Date du document (yyyy-mm-dd). */
  date: string;
  clientId: string | null;
  client: ClientSnapshot;
  lines: DocumentLine[];
  /** Frais de livraison TTC — champ indépendant (hors catalogue), saisie manuelle. */
  livraisonTTC: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

/** ────────────────────────── MODULE OPÉRATIONNEL ────────────────────────── */

export type CommandeStatut = 'en_production' | 'livre' | 'retour';

export const COMMANDE_STATUTS: CommandeStatut[] = ['en_production', 'livre', 'retour'];

export const STATUT_LABELS: Record<CommandeStatut, string> = {
  en_production: 'En production',
  livre: 'Livré',
  retour: 'Retour',
};

export interface CommandeArticle {
  nom: string;
  description: string;
  dimensions: string;
  quantite: number;
}

/**
 * Commande opérationnelle — AUCUN lien financier.
 * Ne modifie jamais les devis, factures ou le catalogue.
 */
export interface Commande {
  id: string;
  numero: string;
  clientNom: string;
  /** Adresse de livraison / du client (suivi atelier). */
  adresse: string;
  /** Téléphone du client (pour la livraison). */
  telephone: string;
  date: string;
  /** Montant total figé (informatif uniquement). */
  montantTotal: number;
  /** Description OBLIGATOIRE du travail. */
  description: string;
  articles: CommandeArticle[];
  statut: CommandeStatut;
  /** Origine : depuis un devis/facture, ou saisie manuelle. */
  sourceType: DocumentType | 'manuelle' | null;
  sourceDocumentId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Conteneur global de toutes les données (utilisé par export/import et sauvegardes). */
export interface AppData {
  version: number;
  settings: AppSettings;
  clients: Client[];
  catalogue: CatalogueItem[];
  documents: SalesDocument[];
  commandes: Commande[];
}
