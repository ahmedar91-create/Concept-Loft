import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

/** Renvoie un client Supabase singleton, ou null si non configuré. */
export function getSupabase(): SupabaseClient | null {
  if (client) return client;
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  client = createClient(url, key, {
    auth: {
      persistSession: true, // conserve la session de connexion entre les rechargements
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
  return client;
}

/** Nom de la table contenant l'unique ligne d'état applicatif. */
export const STATE_TABLE = 'concept_loft_state';
/** Identifiant fixe de la ligne d'état partagée. */
export const STATE_ROW_ID = 'main';
