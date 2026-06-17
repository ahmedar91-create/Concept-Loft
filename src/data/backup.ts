import { migrate } from './migrate';
import type { AppData } from './types';

/**
 * Sauvegardes & export/import global.
 *  - Historique local de sauvegardes (filet de sécurité, toujours sur l'appareil).
 *  - Export d'un fichier unique contenant TOUTES les données.
 *  - Import / restauration complète.
 */

const BACKUP_KEY = 'concept-loft-erp:backups';
const MAX_BACKUPS = 25;

export interface BackupEntry {
  id: string;
  timestamp: string;
  label: string;
  data: AppData;
}

export function listBackups(): BackupEntry[] {
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as BackupEntry[];
    return Array.isArray(arr) ? arr.sort((a, b) => b.timestamp.localeCompare(a.timestamp)) : [];
  } catch {
    return [];
  }
}

/** Ajoute une sauvegarde à l'historique (avec déduplication des doublons consécutifs). */
export function pushBackup(data: AppData, label: string): void {
  try {
    const list = listBackups();
    const serialized = JSON.stringify(data);
    if (list.length > 0 && JSON.stringify(list[0].data) === serialized) {
      return; // identique à la dernière sauvegarde -> on évite le doublon
    }
    const entry: BackupEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      label,
      data,
    };
    const next = [entry, ...list].slice(0, MAX_BACKUPS);
    localStorage.setItem(BACKUP_KEY, JSON.stringify(next));
  } catch (err) {
    console.error('Échec de la sauvegarde locale :', err);
  }
}

export function restoreBackup(id: string): AppData | null {
  const entry = listBackups().find((b) => b.id === id);
  return entry ? migrate(entry.data) : null;
}

export function deleteBackup(id: string): void {
  const next = listBackups().filter((b) => b.id !== id);
  localStorage.setItem(BACKUP_KEY, JSON.stringify(next));
}

export function clearBackups(): void {
  localStorage.removeItem(BACKUP_KEY);
}

/** Télécharge toutes les données dans un fichier JSON unique. */
export function exportToFile(data: AppData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  a.href = url;
  a.download = `concept-loft-sauvegarde-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Lit un fichier exporté et renvoie des données normalisées. */
export async function importFromFile(file: File): Promise<AppData> {
  const text = await file.text();
  const parsed = JSON.parse(text);
  return migrate(parsed);
}
