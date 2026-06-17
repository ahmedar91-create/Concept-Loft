/** Formatage monétaire et de dates — locale fr / devise TND (millimes, 3 décimales). */

const tndFormatter = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

/** "1 234,500 TND" */
export function formatTND(amount: number): string {
  const value = Number.isFinite(amount) ? amount : 0;
  return `${tndFormatter.format(value)} TND`;
}

/** "1 234,500" (sans devise) */
export function formatNumber3(amount: number): string {
  const value = Number.isFinite(amount) ? amount : 0;
  return tndFormatter.format(value);
}

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/** Accepte une Date ou une chaîne ISO. Renvoie "16/06/2026". */
export function formatDate(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  return dateFormatter.format(d);
}

/** Date ISO du jour au format yyyy-mm-dd (pour les <input type="date">). */
export function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Convertit une valeur saisie (chaîne) en nombre, tolérant la virgule décimale. */
export function parseNumber(input: string | number | null | undefined): number {
  if (typeof input === 'number') return Number.isFinite(input) ? input : 0;
  if (!input) return 0;
  const cleaned = String(input).replace(/\s/g, '').replace(',', '.');
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}
