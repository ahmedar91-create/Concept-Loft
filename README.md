# CONCEPT LOFT — ERP

Application ERP pour **CONCEPT LOFT** : gestion commerciale (catalogue, devis, factures,
clients) et suivi opérationnel de production/livraison (commandes, interface mobile).

- **React + Vite + TypeScript**
- **Fonctionne hors-ligne** (données locales dans le navigateur) — aucune configuration requise
- **Multi-appareils optionnel et gratuit** via Supabase (voir plus bas)
- **PDF professionnel A4** (devis & factures), **mode clair/sombre**, **export/import** et
  **sauvegardes** intégrés

---

## 🚀 Démarrage rapide

Pré-requis : [Node.js](https://nodejs.org) 18+.

```bash
npm install      # une seule fois
npm run dev      # lance l'application sur http://localhost:5173
```

Pour une version optimisée :

```bash
npm run build    # génère le dossier dist/
npm run preview  # prévisualise la version de production
```

> 💡 Le serveur de dev est aussi accessible depuis un **téléphone/tablette sur le même Wi-Fi**
> via l'adresse `Network` affichée au lancement (ex. `http://192.168.x.x:5173`). C'est pratique
> pour utiliser le **module Atelier** sur mobile.

---

## 🧩 Les deux modules (séparation stricte)

### 1. Module FINANCIER (bureau)

- **Tableau de bord** — vue d'ensemble
- **Catalogue** — articles modèles (prix TTC de référence)
- **Clients** — base centralisée (création automatique à l'émission d'un document)
- **Devis & Factures** — création, édition, duplication, suppression, PDF
- **Paramètres** — société, fiscalité, thème, sauvegardes, export/import

### 2. Module OPÉRATIONNEL (mobile) — `/atelier`

- **Commandes** — suivi de production & livraison, optimisé mobile
- Statuts : **En production · Livré · Retour**
- **Aucun lien financier** : les commandes ne modifient jamais les devis, factures ni le catalogue.

Une commande peut être créée **automatiquement** depuis un devis/facture
(bouton « Créer une commande ») ou **manuellement**.

---

## 🧮 Règle de calcul (CRITIQUE)

L'utilisateur **saisit uniquement le TTC** (considéré comme un TTC *hors impact FODEC*).
Tout le reste est calculé automatiquement :

```
HT          = TTC_saisi / (1 + TVA%)      →  par défaut TTC / 1,19
FODEC       = HT × FODEC%                  →  par défaut HT × 1%
TVA         = (HT + FODEC) × TVA%          →  la TVA porte sur HT + FODEC
TTC facturé = HT + FODEC + TVA
```

Exemple (TTC saisi 299, TVA 19 %, FODEC 1 %) → HT **251,261** · FODEC **2,513** ·
TVA **48,217** · **Total TTC 301,991**.

- **Timbre fiscal** : 1 TND par document
- **Net à payer** = Total TTC facturé + Timbre fiscal
- Le **prix TTC unitaire n'apparaît pas** sur le PDF (présentation HT formelle).
- Devise : **TND**, arrondi au **millime** (3 décimales).

Les taux sont modifiables dans **Paramètres** (valeurs par défaut : TVA 19 %, FODEC 1 %, Timbre 1 TND).

---

## 💾 Sauvegarde & sécurité des données

- **Sauvegarde automatique** locale après chaque modification importante (25 points conservés,
  restaurables depuis **Paramètres**).
- **Export global** : un fichier JSON unique contenant *tout* (clients, catalogue, devis,
  factures, commandes, paramètres).
- **Import global** : restauration complète depuis un fichier exporté.

> En mode local, les données vivent dans le navigateur de l'appareil. **Exportez régulièrement**
> (ou activez Supabase) pour ne rien perdre en cas de changement de machine.

---

## 🌐 Activer le multi-appareils (gratuit, optionnel)

Pour que le **poste bureau** et la **tablette/téléphone de l'atelier** partagent les mêmes données
en temps réel, on utilise [Supabase](https://supabase.com) (offre gratuite, sans carte bancaire).

1. Créez un compte puis un **nouveau projet** sur https://supabase.com.
2. Dans le projet : **SQL Editor → New query**, collez le contenu de
   [`src/data/schema.sql`](src/data/schema.sql) puis **Run**.
3. Dans **Project Settings → API**, copiez :
   - **Project URL**
   - **anon public key**
4. À la racine du projet, copiez `.env.example` en `.env` et renseignez :

   ```env
   VITE_SUPABASE_URL=https://votre-projet.supabase.co
   VITE_SUPABASE_ANON_KEY=votre_cle_anon
   ```

5. Relancez `npm run dev` (ou rebuild). L'application bascule automatiquement en mode
   **multi-appareils** (indiqué dans la barre latérale et dans Paramètres).

> Migration des données existantes : en mode local, faites **Exporter**, passez en mode Supabase,
> puis **Importer** le fichier. Les données seront alors partagées entre appareils.
>
> 🔒 La politique SQL fournie autorise l'accès avec la clé anonyme (usage interne). Pour un
> déploiement public, ajoutez l'authentification Supabase et restreignez la politique.

---

## 🗂️ Structure du projet

```
src/
  lib/            fiscal.ts (moteur de calcul), format.ts, id.ts
  data/           types, store (local + supabase), backup, migration, schema.sql
  state/          AppContext.tsx (état global, CRUD, thème, numérotation, auto-save)
  components/     Layouts, Logo, Icônes, UI (modale/toast/confirm), pdf/DocumentPDF.tsx
  modules/
    finance/      Dashboard, Catalogue, Clients, Documents, DocumentEditor, Settings
    operations/   Commandes, CommandeForm, CommandeDetail
```

Le stockage est abstrait derrière une interface (`DataStore`) : `LocalStore` (localStorage) ou
`SupabaseStore` (Postgres + temps réel). Toutes les données sont sérialisées en un seul document
JSON, ce qui garde la base minimale et la synchronisation simple.
