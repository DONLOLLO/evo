-- ════════════════════════════════════════════════════════════════════════
-- EVO — migrazione 003
-- ────────────────────────────────────────────────────────────────────────
-- Aggiunge la tabella weekly_reviews (riflessione settimanale).
-- ════════════════════════════════════════════════════════════════════════

create table if not exists weekly_reviews (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  "weekStart" text not null,
  "missionsDone" integer not null default 0,
  "missionsTotal" integer not null default 0,
  "routinesDone" integer not null default 0,
  "routinesTotal" integer not null default 0,
  "victoriesCount" integer not null default 0,
  "moodGreat" integer not null default 0,
  "moodOk" integer not null default 0,
  "moodRough" integer not null default 0,
  "wentWell" text not null default '',
  "didntGo" text not null default '',
  "changeNext" text not null default '',
  "closedAt" bigint not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, "weekStart")
);
create index if not exists weekly_reviews_user_idx on weekly_reviews(user_id);
create index if not exists weekly_reviews_alive_idx on weekly_reviews(user_id) where deleted_at is null;
drop trigger if exists weekly_reviews_set_updated_at on weekly_reviews;
create trigger weekly_reviews_set_updated_at before update on weekly_reviews
  for each row execute function set_updated_at();

alter table weekly_reviews enable row level security;

drop policy if exists "own rows weekly_reviews" on weekly_reviews;
create policy "own rows weekly_reviews" on weekly_reviews
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
