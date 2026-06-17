import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { computeDocumentTotals } from '../lib/fiscal';
import { newId, nowISO } from '../lib/id';
import { todayISO } from '../lib/format';
import { pushBackup } from '../data/backup';
import { LocalStore } from '../data/localStore';
import { structuredCloneSafe } from '../data/defaults';
import { isSupabaseConfigured, type DataStore } from '../data/store';
import { SupabaseStore } from '../data/supabaseStore';
import type {
  AppData,
  AppSettings,
  CatalogueItem,
  Client,
  ClientSnapshot,
  Commande,
  CommandeArticle,
  DocumentType,
  SalesDocument,
  ThemeMode,
} from '../data/types';

export const THEME_MIRROR_KEY = 'concept-loft-erp:theme';

interface AppContextValue {
  ready: boolean;
  mode: 'local' | 'supabase';
  data: AppData;
  settings: AppSettings;
  theme: ThemeMode;

  // Thème
  toggleTheme(): void;

  // Paramètres
  updateCompany(info: Partial<AppSettings['company']>): void;
  updateFiscal(cfg: Partial<AppSettings['fiscal']>): void;

  // Clients
  upsertClient(client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Client;
  deleteClient(id: string): void;

  // Catalogue
  addCatalogueItem(item: Pick<CatalogueItem, 'nom' | 'description' | 'prixTTC'>): CatalogueItem;
  updateCatalogueItem(id: string, patch: Partial<CatalogueItem>): void;
  deleteCatalogueItem(id: string): void;

  // Documents (devis / factures)
  createDraftDocument(type: DocumentType): SalesDocument;
  saveDocument(doc: SalesDocument): SalesDocument;
  deleteDocument(id: string): void;
  duplicateDocument(id: string): SalesDocument | null;
  getDocument(id: string): SalesDocument | undefined;
  previewNumero(type: DocumentType): string;

  // Commandes
  createCommandeFromDocument(documentId: string): Commande | null;
  createDraftCommande(): Commande;
  saveCommande(commande: Commande): Commande;
  deleteCommande(id: string): void;
  getCommande(id: string): Commande | undefined;

  // Données globales
  replaceAllData(next: AppData): void;
}

const AppContext = createContext<AppContextValue | null>(null);

function pickStore(): DataStore {
  return isSupabaseConfigured() ? new SupabaseStore() : new LocalStore();
}

function applyTheme(theme: ThemeMode) {
  document.documentElement.setAttribute('data-theme', theme);
  try {
    localStorage.setItem(THEME_MIRROR_KEY, theme);
  } catch {
    /* ignore */
  }
}

function padNumber(n: number): string {
  return String(n).padStart(4, '0');
}

export function AppProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<DataStore>(pickStore());
  const [data, setData] = useState<AppData | null>(null);
  const dataRef = useRef<AppData | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Conserve une référence à jour pour les sauvegardes différées et les abonnements.
  const commit = useCallback((next: AppData, opts: { backup?: boolean; label?: string } = {}) => {
    dataRef.current = next;
    setData(next);
    applyTheme(next.settings.theme);

    if (opts.backup) {
      pushBackup(next, opts.label ?? 'Modification');
    }

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      storeRef.current.save(next).catch((err) => console.error('Échec de la persistance :', err));
    }, 350);
  }, []);

  // Chargement initial + abonnement aux changements distants.
  useEffect(() => {
    let mounted = true;
    storeRef.current
      .load()
      .then((loaded) => {
        if (!mounted) return;
        dataRef.current = loaded;
        setData(loaded);
        applyTheme(loaded.settings.theme);
      })
      .catch((err) => {
        console.error('Échec du chargement, repli local :', err);
        const local = new LocalStore();
        storeRef.current = local;
        local.load().then((loaded) => {
          if (!mounted) return;
          dataRef.current = loaded;
          setData(loaded);
          applyTheme(loaded.settings.theme);
        });
      });

    const unsub = storeRef.current.subscribe?.((remote) => {
      // Ignore si identique à l'état courant (évite les boucles d'écho).
      if (JSON.stringify(remote) !== JSON.stringify(dataRef.current)) {
        dataRef.current = remote;
        setData(remote);
        applyTheme(remote.settings.theme);
      }
    });

    return () => {
      mounted = false;
      unsub?.();
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const value = useMemo<AppContextValue | null>(() => {
    if (!data) return null;

    const update = (
      mutator: (draft: AppData) => void,
      opts: { backup?: boolean; label?: string } = {},
    ): AppData => {
      const draft = structuredCloneSafe(dataRef.current ?? data);
      mutator(draft);
      commit(draft, opts);
      return draft;
    };

    const ctx: AppContextValue = {
      ready: true,
      mode: storeRef.current.mode,
      data,
      settings: data.settings,
      theme: data.settings.theme,

      toggleTheme() {
        update((d) => {
          d.settings.theme = d.settings.theme === 'dark' ? 'light' : 'dark';
        });
      },

      updateCompany(info) {
        update(
          (d) => {
            d.settings.company = { ...d.settings.company, ...info };
          },
          { backup: true, label: 'Paramètres société' },
        );
      },

      updateFiscal(cfg) {
        update(
          (d) => {
            d.settings.fiscal = { ...d.settings.fiscal, ...cfg };
          },
          { backup: true, label: 'Paramètres fiscaux' },
        );
      },

      upsertClient(client) {
        let saved!: Client;
        update(
          (d) => {
            const ts = nowISO();
            if (client.id) {
              const idx = d.clients.findIndex((c) => c.id === client.id);
              if (idx >= 0) {
                saved = { ...d.clients[idx], ...client, id: client.id, updatedAt: ts };
                d.clients[idx] = saved;
                return;
              }
            }
            saved = {
              id: client.id ?? newId(),
              nom: client.nom,
              adresse: client.adresse,
              telephone: client.telephone,
              matriculeFiscal: client.matriculeFiscal,
              createdAt: ts,
              updatedAt: ts,
            };
            d.clients.push(saved);
          },
          { backup: true, label: 'Client' },
        );
        return saved;
      },

      deleteClient(id) {
        update(
          (d) => {
            d.clients = d.clients.filter((c) => c.id !== id);
          },
          { backup: true, label: 'Suppression client' },
        );
      },

      addCatalogueItem(item) {
        let saved!: CatalogueItem;
        update(
          (d) => {
            const ts = nowISO();
            saved = {
              id: newId(),
              nom: item.nom,
              description: item.description,
              prixTTC: item.prixTTC,
              createdAt: ts,
              updatedAt: ts,
            };
            d.catalogue.push(saved);
          },
          { backup: true, label: 'Article catalogue' },
        );
        return saved;
      },

      updateCatalogueItem(id, patch) {
        update(
          (d) => {
            const idx = d.catalogue.findIndex((c) => c.id === id);
            if (idx >= 0) d.catalogue[idx] = { ...d.catalogue[idx], ...patch, updatedAt: nowISO() };
          },
          { backup: true, label: 'Article catalogue' },
        );
      },

      deleteCatalogueItem(id) {
        update(
          (d) => {
            d.catalogue = d.catalogue.filter((c) => c.id !== id);
          },
          { backup: true, label: 'Suppression article' },
        );
      },

      previewNumero(type) {
        const year = new Date().getFullYear();
        const prefix = type === 'devis' ? 'DEV' : 'FAC';
        const next = (data.settings.counters[type] ?? 0) + 1;
        return `${prefix}-${year}-${padNumber(next)}`;
      },

      createDraftDocument(type) {
        const ts = nowISO();
        return {
          id: newId(),
          type,
          numero: '', // attribué à l'enregistrement
          date: todayISO(),
          clientId: null,
          client: { nom: '', adresse: '', telephone: '', matriculeFiscal: '' },
          lines: [],
          livraisonTTC: 0,
          notes: '',
          createdAt: ts,
          updatedAt: ts,
        };
      },

      saveDocument(doc) {
        let saved!: SalesDocument;
        update(
          (d) => {
            const ts = nowISO();
            const next = structuredCloneSafe(doc);

            // Client : création automatique si inexistant, sinon mise à jour de la fiche centrale.
            const snap: ClientSnapshot = next.client;
            if (snap.nom.trim()) {
              const normalized = snap.nom.trim().toLowerCase();
              let existing = d.clients.find((c) => c.nom.trim().toLowerCase() === normalized);
              if (!existing) {
                existing = {
                  id: newId(),
                  nom: snap.nom.trim(),
                  adresse: snap.adresse,
                  telephone: snap.telephone,
                  matriculeFiscal: snap.matriculeFiscal,
                  createdAt: ts,
                  updatedAt: ts,
                };
                d.clients.push(existing);
              } else {
                existing.adresse = snap.adresse || existing.adresse;
                existing.telephone = snap.telephone || existing.telephone;
                existing.matriculeFiscal = snap.matriculeFiscal || existing.matriculeFiscal;
                existing.updatedAt = ts;
              }
              next.clientId = existing.id;
            }

            const idx = d.documents.findIndex((x) => x.id === next.id);
            if (idx >= 0) {
              next.createdAt = d.documents[idx].createdAt;
              next.numero = d.documents[idx].numero || next.numero;
              next.updatedAt = ts;
              d.documents[idx] = next;
            } else {
              // Nouveau document : attribution du numéro + incrément du compteur.
              if (!next.numero) {
                const year = new Date().getFullYear();
                const prefix = next.type === 'devis' ? 'DEV' : 'FAC';
                const counter = (d.settings.counters[next.type] ?? 0) + 1;
                d.settings.counters[next.type] = counter;
                next.numero = `${prefix}-${year}-${padNumber(counter)}`;
              }
              next.createdAt = ts;
              next.updatedAt = ts;
              d.documents.push(next);
            }
            saved = next;
          },
          { backup: true, label: `Document ${doc.type}` },
        );
        return saved;
      },

      deleteDocument(id) {
        update(
          (d) => {
            d.documents = d.documents.filter((x) => x.id !== id);
          },
          { backup: true, label: 'Suppression document' },
        );
      },

      duplicateDocument(id) {
        const original = data.documents.find((x) => x.id === id);
        if (!original) return null;
        let copy!: SalesDocument;
        update(
          (d) => {
            const ts = nowISO();
            const src = d.documents.find((x) => x.id === id)!;
            const year = new Date().getFullYear();
            const prefix = src.type === 'devis' ? 'DEV' : 'FAC';
            const counter = (d.settings.counters[src.type] ?? 0) + 1;
            d.settings.counters[src.type] = counter;
            copy = {
              ...structuredCloneSafe(src),
              id: newId(),
              numero: `${prefix}-${year}-${padNumber(counter)}`,
              date: todayISO(),
              lines: src.lines.map((l) => ({ ...l, id: newId() })),
              createdAt: ts,
              updatedAt: ts,
            };
            d.documents.push(copy);
          },
          { backup: true, label: 'Duplication document' },
        );
        return copy;
      },

      getDocument(id) {
        return data.documents.find((x) => x.id === id);
      },

      createCommandeFromDocument(documentId) {
        const doc = data.documents.find((x) => x.id === documentId);
        if (!doc) return null;
        const totals = computeDocumentTotals(
          doc.lines.map((l) => ({ prixUnitaireTTC: l.prixUnitaireTTC, quantite: l.quantite })),
          doc.livraisonTTC,
          data.settings.fiscal,
        );
        const articles: CommandeArticle[] = doc.lines.map((l) => ({
          nom: l.nom,
          description: l.description,
          dimensions: l.dimensions,
          quantite: l.quantite,
        }));
        let saved!: Commande;
        update(
          (d) => {
            const ts = nowISO();
            const year = new Date().getFullYear();
            const counter = (d.settings.counters.commande ?? 0) + 1;
            d.settings.counters.commande = counter;
            saved = {
              id: newId(),
              numero: `CMD-${year}-${padNumber(counter)}`,
              clientNom: doc.client.nom || 'Client',
              adresse: doc.client.adresse || '',
              telephone: doc.client.telephone || '',
              date: todayISO(),
              montantTotal: totals.netAPayer,
              description: `Réalisation issue du ${doc.type} ${doc.numero}`,
              articles,
              statut: 'en_production',
              sourceType: doc.type,
              sourceDocumentId: doc.id,
              createdAt: ts,
              updatedAt: ts,
            };
            d.commandes.push(saved);
          },
          { backup: true, label: 'Commande depuis document' },
        );
        return saved;
      },

      createDraftCommande() {
        const ts = nowISO();
        return {
          id: newId(),
          numero: '',
          clientNom: '',
          adresse: '',
          telephone: '',
          date: todayISO(),
          montantTotal: 0,
          description: '',
          articles: [],
          statut: 'en_production',
          sourceType: 'manuelle',
          sourceDocumentId: null,
          createdAt: ts,
          updatedAt: ts,
        };
      },

      saveCommande(commande) {
        let saved!: Commande;
        update(
          (d) => {
            const ts = nowISO();
            const next = structuredCloneSafe(commande);
            const idx = d.commandes.findIndex((c) => c.id === next.id);
            if (idx >= 0) {
              next.createdAt = d.commandes[idx].createdAt;
              next.numero = d.commandes[idx].numero || next.numero;
              next.updatedAt = ts;
              d.commandes[idx] = next;
            } else {
              if (!next.numero) {
                const year = new Date().getFullYear();
                const counter = (d.settings.counters.commande ?? 0) + 1;
                d.settings.counters.commande = counter;
                next.numero = `CMD-${year}-${padNumber(counter)}`;
              }
              next.createdAt = ts;
              next.updatedAt = ts;
              d.commandes.push(next);
            }
            saved = next;
          },
          { backup: true, label: 'Commande' },
        );
        return saved;
      },

      deleteCommande(id) {
        update(
          (d) => {
            d.commandes = d.commandes.filter((c) => c.id !== id);
          },
          { backup: true, label: 'Suppression commande' },
        );
      },

      getCommande(id) {
        return data.commandes.find((c) => c.id === id);
      },

      replaceAllData(next) {
        commit(structuredCloneSafe(next), { backup: true, label: 'Import / restauration' });
      },
    };
    return ctx;
  }, [data, commit]);

  if (!value) {
    return <div className="app-loading">Chargement…</div>;
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp doit être utilisé dans <AppProvider>');
  return ctx;
}
