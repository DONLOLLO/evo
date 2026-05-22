-- ════════════════════════════════════════════════════════════════════════
-- EVO — migrazione 002
-- ────────────────────────────────────────────────────────────────────────
-- 1) Aggiunge "deleted_at" a tutte le tabelle esistenti (tombstones per
--    sincronizzazione delle delete cross-device).
-- 2) Crea le 4 history tables: stat_history, routine_checks, checkins,
--    challenge_logs.
-- ════════════════════════════════════════════════════════════════════════

-- ── 1) deleted_at su tutte le tabelle ───────────────────────────────────
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
    execute format('alter table %I add column if not exists deleted_at timestamptz', t);
    execute format('create index if not exists %I on %I(user_id) where deleted_at is null', t || '_alive_idx', t);
  end loop;
end$$;

-- ── 2) Nuove history tables ─────────────────────────────────────────────

-- stat_history: log dei cambi valore di una stat
create table if not exists stat_history (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  "statId" text not null,
  value integer not null,
  note text,
  at bigint not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists stat_history_user_idx on stat_history(user_id);
create index if not exists stat_history_alive_idx on stat_history(user_id) where deleted_at is null;
drop trigger if exists stat_history_set_updated_at on stat_history;
create trigger stat_history_set_updated_at before update on stat_history
  for each row execute function set_updated_at();

-- routine_checks: tick giornaliero su un blocco routine
create table if not exists routine_checks (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  "blockId" text not null,
  date text not null,
  done boolean not null default false,
  at bigint not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists routine_checks_user_idx on routine_checks(user_id);
create index if not exists routine_checks_blockdate_idx on routine_checks(user_id, "blockId", date);
create index if not exists routine_checks_alive_idx on routine_checks(user_id) where deleted_at is null;
drop trigger if exists routine_checks_set_updated_at on routine_checks;
create trigger routine_checks_set_updated_at before update on routine_checks
  for each row execute function set_updated_at();

-- checkins: check-in di chiusura giornata
create table if not exists checkins (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date text not null,
  mood text,
  note text,
  "blocksDone" integer not null default 0,
  "blocksTotal" integer not null default 0,
  "missionsDone" integer not null default 0,
  "missionsTotal" integer not null default 0,
  "closedAt" bigint not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists checkins_user_idx on checkins(user_id);
create index if not exists checkins_alive_idx on checkins(user_id) where deleted_at is null;
drop trigger if exists checkins_set_updated_at on checkins;
create trigger checkins_set_updated_at before update on checkins
  for each row execute function set_updated_at();

-- challenge_logs: log giornaliero done/missed di una sfida
create table if not exists challenge_logs (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  "challengeId" text not null,
  date text not null,
  status text not null,
  reason text,
  at bigint not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists challenge_logs_user_idx on challenge_logs(user_id);
create index if not exists challenge_logs_alive_idx on challenge_logs(user_id) where deleted_at is null;
drop trigger if exists challenge_logs_set_updated_at on challenge_logs;
create trigger challenge_logs_set_updated_at before update on challenge_logs
  for each row execute function set_updated_at();

-- ── 3) RLS + policies sulle nuove tabelle ──────────────────────────────
alter table stat_history     enable row level security;
alter table routine_checks   enable row level security;
alter table checkins         enable row level security;
alter table challenge_logs   enable row level security;

do $$
declare
  t text;
  tables text[] := array['stat_history','routine_checks','checkins','challenge_logs'];
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
