/**
 * MOTEUR DE CALCUL FISCAL — RÈGLE CRITIQUE ABSOLUE
 * ================================================
 *
 * L'utilisateur saisit UNIQUEMENT le TTC. Ce prix saisi est considéré comme un
 * « TTC hors impact FODEC ». Tout le reste est calculé automatiquement.
 *
 * FORMULE OFFICIELLE (à respecter à la lettre) :
 *   HT    = TTC_saisi / (1 + TVA%)            // par défaut : TTC / 1,19
 *   FODEC = HT × FODEC%                         // par défaut : HT × 1%
 *   TVA   = (HT + FODEC) × TVA%                 // la TVA porte sur HT + FODEC
 *   TTC facturé = HT + FODEC + TVA
 *
 * Chaque composante est arrondie au millime (3 décimales) AVANT l'étape suivante.
 *
 * Exemple — TTC saisi 299, TVA 19 %, FODEC 1 % :
 *   HT    = 299 / 1,19            = 251,261
 *   FODEC = 251,261 × 1%          = 2,513
 *   TVA   = (251,261 + 2,513)×19% = 48,217
 *   TTC facturé = 251,261 + 2,513 + 48,217 = 301,991
 *
 * Devise : TND (Dinar tunisien), 3 décimales (millimes).
 */

export interface FiscalConfig {
  /** Taux de TVA (ex. 0.19 pour 19%) */
  tvaRate: number;
  /** Taux de FODEC (ex. 0.01 pour 1%) */
  fodecRate: number;
  /** Timbre fiscal en TND (montant fixe ajouté une fois par document) */
  timbreFiscal: number;
}

/** Configuration fiscale par défaut imposée par la spécification CONCEPT LOFT. */
export const DEFAULT_FISCAL_CONFIG: FiscalConfig = {
  tvaRate: 0.19,
  fodecRate: 0.01,
  timbreFiscal: 1,
};

/** Arrondi au millime (3 décimales), robuste aux erreurs de virgule flottante. */
export function round3(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

/** Décomposition d'un montant TTC saisi en ses composantes fiscales. */
export interface TtcBreakdown {
  /** Montant TTC saisi (hors impact FODEC). */
  ttcSaisi: number;
  ht: number;
  fodec: number;
  tva: number;
  /** TTC réellement facturé = HT + FODEC + TVA. */
  ttc: number;
}

/**
 * Décompose un montant TTC saisi.
 *   HT = TTC / (1 + tva) ; FODEC = HT × fodec ; TVA = (HT + FODEC) × tva.
 */
export function decomposeTTC(
  ttcSaisi: number,
  config: FiscalConfig = DEFAULT_FISCAL_CONFIG,
): TtcBreakdown {
  const base = Number.isFinite(ttcSaisi) ? ttcSaisi : 0;
  const ht = round3(base / (1 + config.tvaRate));
  const fodec = round3(ht * config.fodecRate);
  const tva = round3((ht + fodec) * config.tvaRate);
  const ttc = round3(ht + fodec + tva);
  return { ttcSaisi: round3(base), ht, fodec, tva, ttc };
}

/** Une ligne telle que présentée au moteur (l'utilisateur saisit le TTC unitaire). */
export interface CalcLineInput {
  /** Prix unitaire TTC saisi (la seule valeur saisie par l'utilisateur). */
  prixUnitaireTTC: number;
  /** Quantité. */
  quantite: number;
}

/** Résultat calculé pour une ligne (utilisé pour l'affichage détaillé du PDF). */
export interface CalcLineResult extends TtcBreakdown {
  prixUnitaireTTC: number;
  prixUnitaireHT: number;
  quantite: number;
}

/** Totaux d'un document (devis ou facture). */
export interface DocumentTotals {
  totalHT: number;
  totalFODEC: number;
  totalTVA: number;
  totalTTC: number;
  timbreFiscal: number;
  netAPayer: number;
  lines: CalcLineResult[];
  /** Détail de la livraison (présentée comme une ligne dédiée). */
  livraison: CalcLineResult | null;
}

/** Calcule le détail d'une ligne (TTC saisi -> HT/FODEC/TVA) à partir du TTC unitaire et de la quantité. */
export function computeLine(
  input: CalcLineInput,
  config: FiscalConfig = DEFAULT_FISCAL_CONFIG,
): CalcLineResult {
  const qte = Number.isFinite(input.quantite) ? input.quantite : 0;
  const puTTC = Number.isFinite(input.prixUnitaireTTC) ? input.prixUnitaireTTC : 0;
  const lineSaisi = round3(puTTC * qte);
  const b = decomposeTTC(lineSaisi, config);
  const puHT = decomposeTTC(puTTC, config).ht;
  return {
    ...b,
    prixUnitaireTTC: round3(puTTC),
    prixUnitaireHT: puHT,
    quantite: qte,
  };
}

/**
 * Calcule l'ensemble des totaux d'un document.
 *
 * La livraison (frais TTC indépendants, hors catalogue) est intégrée comme une
 * ligne supplémentaire. Les totaux sont la somme des composantes par ligne, déjà
 * arrondies au millime — d'où Total HT + FODEC + TVA = Total TTC à l'exactitude.
 */
export function computeDocumentTotals(
  lines: CalcLineInput[],
  livraisonTTC: number,
  config: FiscalConfig = DEFAULT_FISCAL_CONFIG,
): DocumentTotals {
  const lineResults = lines.map((l) => computeLine(l, config));

  let livraison: CalcLineResult | null = null;
  const livr = Number.isFinite(livraisonTTC) ? livraisonTTC : 0;
  if (livr > 0) {
    livraison = computeLine({ prixUnitaireTTC: livr, quantite: 1 }, config);
  }

  const all = livraison ? [...lineResults, livraison] : lineResults;

  const totalHT = round3(all.reduce((s, l) => s + l.ht, 0));
  const totalFODEC = round3(all.reduce((s, l) => s + l.fodec, 0));
  const totalTVA = round3(all.reduce((s, l) => s + l.tva, 0));
  const totalTTC = round3(all.reduce((s, l) => s + l.ttc, 0));
  const timbreFiscal = round3(config.timbreFiscal);
  const netAPayer = round3(totalTTC + timbreFiscal);

  return {
    totalHT,
    totalFODEC,
    totalTVA,
    totalTTC,
    timbreFiscal,
    netAPayer,
    lines: lineResults,
    livraison,
  };
}
