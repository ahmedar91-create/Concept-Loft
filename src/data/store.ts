import type { AppData } from './types';

/**
 * Abstraction de stockage (repository pattern).
 * Deux implémentations interchangeables :
 *   - LocalStore    : localStorage (hors-ligne, mono-appareil) — par défaut.
 *   - SupabaseStore : base Postgres hébergée gratuitement (multi-appareils + temps réel).
 *
 * Toute l'application est sérialisée en un seul document JSON (AppData),
 * ce qui garde la base "légère" et la synchronisation simple.
 */
export interface DataStore {
  readonly mode: 'local' | 'supabase';
  /** Charge l'état complet (crée l'état initial si vide). */
  load(): Promise<AppData>;
  /** Persiste l'état complet. */
  save(data: AppData): Promise<void>;
  /**
   * S'abonne aux changements distants (autres appareils/onglets).
   * Retourne une fonction de désabonnement. Optionnel.
   */
  subscribe?(onRemoteChange: (data: AppData) => void): () => void;
}

/** Indique si Supabase est configuré (variables d'environnement présentes). */
export function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return Boolean(url && key);
}
