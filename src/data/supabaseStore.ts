import { createInitialData } from './defaults';
import { migrate } from './migrate';
import type { DataStore } from './store';
import { getSupabase, STATE_ROW_ID, STATE_TABLE } from './supabaseClient';
import type { AppData } from './types';

/**
 * Stockage Supabase : l'état complet est conservé dans une seule ligne JSONB.
 * Multi-appareils + synchronisation temps réel. Base très légère (1 ligne).
 * Stratégie de concurrence : dernier écrivain gagne (suffisant pour CONCEPT LOFT).
 */
export class SupabaseStore implements DataStore {
  readonly mode = 'supabase' as const;

  async load(): Promise<AppData> {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase non configuré');

    const { data, error } = await supabase
      .from(STATE_TABLE)
      .select('data')
      .eq('id', STATE_ROW_ID)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      const initial = createInitialData();
      await this.save(initial);
      return initial;
    }
    return migrate(data.data);
  }

  async save(data: AppData): Promise<void> {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase non configuré');

    const { error } = await supabase
      .from(STATE_TABLE)
      .upsert({ id: STATE_ROW_ID, data, updated_at: new Date().toISOString() });

    if (error) throw error;
  }

  subscribe(onRemoteChange: (data: AppData) => void): () => void {
    const supabase = getSupabase();
    if (!supabase) return () => {};

    const channel = supabase
      .channel('concept-loft-state')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: STATE_TABLE, filter: `id=eq.${STATE_ROW_ID}` },
        (payload) => {
          const next = (payload.new as { data?: unknown } | null)?.data;
          if (next) onRemoteChange(migrate(next));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}
