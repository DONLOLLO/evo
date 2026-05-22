-- ════════════════════════════════════════════════════════════════════════
-- EVO — Supabase schema (step 1)
-- ════════════════════════════════════════════════════════════════════════
-- Per ogni tabella:
--   • id TEXT primario (UUID lato client, già usato da Dexie)
--   • user_id UUID che lega la riga all'utente loggato
--   • updated_at TIMESTAMPTZ per sync futura più sofisticata
--   • tutte le altre colonne replicano i campi TypeScript (camelCase, virgolettati)
-- RLS attivo: ogni utente vede SOLO le proprie righe.
-- ════════════════════════════════════════════════════════════════════════

-- ── helper: trigger per aggiornare updated_at su ogni UPDATE ──────────
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── AREAS ────────────────────────────────────────────────────────────
create table if not exists areas (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null,
  icon text,
  "order" integer not null default 0,
  updated_at timestamptz not null default now()
);
create index if not exists areas_user_idx on areas(user_id);
create trigger areas_set_updated_at before update on areas
  for each row execute function set_updated_at();

-- ── STATS ────────────────────────────────────────────────────────────
create table if not exists stats (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  value integer not null default 0,
  description text,
  color text not null,
  "order" integer not null default 0,
  "updatedAt" bigint not null default 0,
  updated_at timestamptz not null default now()
);
create index if not exists stats_user_idx on stats(user_id);
create trigger stats_set_updated_at before update on stats
  for each row execute function set_updated_at();

-- ── ROUTINE BLOCKS ───────────────────────────────────────────────────
create table if not exists routine_blocks (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  "startTime" text,
  "endTime" text,
  description text,
  days integer[] not null default '{}',
  "order" integer not null default 0,
  updated_at timestamptz not null default now()
);
create index if not exists routine_blocks_user_idx on routine_blocks(user_id);
create trigger routine_blocks_set_updated_at before update on routine_blocks
  for each row execute function set_updated_at();

-- ── SKILLS ───────────────────────────────────────────────────────────
create table if not exists skills (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  "areaId" text not null,
  "parentId" text,
  description text,
  level integer not null default 0,
  "order" integer not null default 0,
  updated_at timestamptz not null default now()
);
create index if not exists skills_user_idx on skills(user_id);
create trigger skills_set_updated_at before update on skills
  for each row execute function set_updated_at();

-- ── SKILL RESOURCES ──────────────────────────────────────────────────
create table if not exists skill_resources (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  "skillId" text not null,
  title text not null,
  type text not null,
  url text,
  done boolean not null default false,
  notes text,
  "createdAt" bigint not null,
  updated_at timestamptz not null default now()
);
create index if not exists skill_resources_user_idx on skill_resources(user_id);
create trigger skill_resources_set_updated_at before update on skill_resources
  for each row execute function set_updated_at();

-- ── SKILL ACTIONS ────────────────────────────────────────────────────
create table if not exists skill_actions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  "skillId" text not null,
  title text not null,
  recurring boolean not null default false,
  "createdAt" bigint not null,
  updated_at timestamptz not null default now()
);
create index if not exists skill_actions_user_idx on skill_actions(user_id);
create trigger skill_actions_set_updated_at before update on skill_actions
  for each row execute function set_updated_at();

-- ── MISSIONS ─────────────────────────────────────────────────────────
create table if not exists missions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  notes text,
  "areaId" text,
  "skillId" text,
  priority text not null,
  done boolean not null default false,
  "doneAt" bigint,
  "dueDate" text,
  "pinnedForDate" text,
  "createdAt" bigint not null,
  "order" bigint not null default 0,
  updated_at timestamptz not null default now()
);
create index if not exists missions_user_idx on missions(user_id);
create trigger missions_set_updated_at before update on missions
  for each row execute function set_updated_at();

-- ── ROADMAP ──────────────────────────────────────────────────────────
create table if not exists roadmap (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  "areaId" text not null,
  phase text not null,
  description text,
  "whyNote" text,
  "targetDate" text,
  "createdAt" bigint not null,
  "order" integer not null default 0,
  updated_at timestamptz not null default now()
);
create index if not exists roadmap_user_idx on roadmap(user_id);
create trigger roadmap_set_updated_at before update on roadmap
  for each row execute function set_updated_at();

-- ── LAWS ─────────────────────────────────────────────────────────────
create table if not exists laws (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  "order" integer not null default 0,
  updated_at timestamptz not null default now()
);
create index if not exists laws_user_idx on laws(user_id);
create trigger laws_set_updated_at before update on laws
  for each row execute function set_updated_at();

-- ── VICTORIES ────────────────────────────────────────────────────────
create table if not exists victories (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  story text not null,
  at bigint not null,
  updated_at timestamptz not null default now()
);
create index if not exists victories_user_idx on victories(user_id);
create trigger victories_set_updated_at before update on victories
  for each row execute function set_updated_at();

-- ── VISION (singleton per utente, id sempre 'main') ──────────────────
create table if not exists vision (
  id text not null default 'main',
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null default '',
  "updatedAt" bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create trigger vision_set_updated_at before update on vision
  for each row execute function set_updated_at();

-- ── SETTINGS (singleton per utente, id sempre 'main') ────────────────
create table if not exists settings (
  id text not null default 'main',
  user_id uuid not null references auth.users(id) on delete cascade,
  "streakCount" integer not null default 0,
  "lastCheckinDate" text,
  "lastSeenLawIndex" integer not null default 0,
  "morningCutoffHour" integer not null default 12,
  "eveningStartHour" integer not null default 21,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create trigger settings_set_updated_at before update on settings
  for each row execute function set_updated_at();

-- ── PEOPLE ───────────────────────────────────────────────────────────
create table if not exists people (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  role text,
  channel text,
  notes text,
  "createdAt" bigint not null,
  updated_at timestamptz not null default now()
);
create index if not exists people_user_idx on people(user_id);
create trigger people_set_updated_at before update on people
  for each row execute function set_updated_at();

-- ── TOUCHPOINTS ──────────────────────────────────────────────────────
create table if not exists touchpoints (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  "personId" text not null,
  "dueDate" text not null,
  channel text not null,
  message text,
  done boolean not null default false,
  "doneAt" bigint,
  "createdAt" bigint not null,
  updated_at timestamptz not null default now()
);
create index if not exists touchpoints_user_idx on touchpoints(user_id);
create trigger touchpoints_set_updated_at before update on touchpoints
  for each row execute function set_updated_at();

-- ── CHALLENGES ───────────────────────────────────────────────────────
create table if not exists challenges (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  "startDate" text not null,
  "endDate" text not null,
  goals text[] not null default '{}',
  active boolean not null default true,
  "createdAt" bigint not null,
  updated_at timestamptz not null default now()
);
create index if not exists challenges_user_idx on challenges(user_id);
create trigger challenges_set_updated_at before update on challenges
  for each row execute function set_updated_at();

-- ════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY: ogni riga è visibile solo al suo proprietario.
-- ════════════════════════════════════════════════════════════════════════

alter table areas             enable row level security;
alter table stats             enable row level security;
alter table routine_blocks    enable row level security;
alter table skills            enable row level security;
alter table skill_resources   enable row level security;
alter table skill_actions     enable row level security;
alter table missions          enable row level security;
alter table roadmap           enable row level security;
alter table laws              enable row level security;
alter table victories         enable row level security;
alter table vision            enable row level security;
alter table settings          enable row level security;
alter table people            enable row level security;
alter table touchpoints       enable row level security;
alter table challenges        enable row level security;

-- Policy generica per tutte le tabelle: l'utente può fare tutto sulle proprie righe.
do $$
declare
  t text;
  tables text[] := array[
    'areas','stats','routine_blocks','skills','skill_resources','skill_actions',
    'missions','roadmap','laws','victories','vision','settings','people',
    'touchpoints','challenges'
  ];
begin
  foreach t in array tables loop
    execute format('drop policy if exists "own rows %1$s" on %1$I', t);
    execute format($p$
      create policy "own rows %1$s" on %1$I
        for all
        using (auth.uid() = user_id)
        with check (auth.uid() = user_id)
    $p$, t);
  end loop;
end$$;
