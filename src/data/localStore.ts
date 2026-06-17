import { createInitialData } from './defaults';
import { migrate } from './migrate';
import type { DataStore } from './store';
import type { AppData } from './types';

const STORAGE_KEY = 'concept-loft-erp:data';

/** Stockage local (localStorage). Hors-ligne, mono-appareil, sans configuration. */
export class LocalStore implements DataStore {
  readonly mode = 'local' as const;

  async load(): Promise<AppData> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const initial = createInitialData();
        await this.save(initial);
        return initial;
      }
      return migrate(JSON.parse(raw));
    } catch (err) {
      console.error('LocalStore.load a échoué, réinitialisation :', err);
      const initial = createInitialData();
      await this.save(initial);
      return initial;
    }
  }

  async save(data: AppData): Promise<void> {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  /** Synchronise les changements entre onglets du même navigateur. */
  subscribe(onRemoteChange: (data: AppData) => void): () => void {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          onRemoteChange(migrate(JSON.parse(e.newValue)));
        } catch {
          /* ignore les valeurs corrompues */
        }
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }
}
