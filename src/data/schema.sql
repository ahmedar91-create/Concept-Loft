-- ════════════════════════════════════════════════════════════════════════
-- CONCEPT LOFT ERP — Schéma Supabase (multi-appareils, gratuit)
-- ════════════════════════════════════════════════════════════════════════
-- À exécuter une seule fois dans : Supabase → SQL Editor → New query → Run.
--
-- L'état complet de l'application est stocké dans une unique ligne JSONB,
-- ce qui garde la base minimale et la synchronisation simple/temps réel.
-- ────────────────────────────────────────────────────────────────────────

create table if not exists public.concept_loft_state (
  id          text primary key,
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);

-- Active la synchronisation temps réel entre appareils.
alter publication supabase_realtime add table public.concept_loft_state;

-- Sécurité au niveau ligne (RLS).
alter table public.concept_loft_state enable row level security;

-- Politique : accès réservé aux utilisateurs AUTHENTIFIÉS (Supabase Auth).
-- La clé publishable seule (non connectée) ne peut ni lire ni écrire.
-- => Pensez à désactiver l'inscription publique et à créer les comptes manuellement
--    (Authentication > Users > Add user, avec "Auto Confirm User").
drop policy if exists "concept_loft_full_access" on public.concept_loft_state;
drop policy if exists "concept_loft_auth_access" on public.concept_loft_state;
create policy "concept_loft_auth_access"
  on public.concept_loft_state
  for all
  to authenticated
  using (true)
  with check (true);
