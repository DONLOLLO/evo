-- ════════════════════════════════════════════════════════════════════════
-- EVO — migrazione 004
-- ────────────────────────────────────────────────────────────────────────
-- Push notifications:
--   • push_subscriptions: una riga per device (un utente può avere più device)
--   • notification_prefs: una riga per utente con preferenze + bookkeeping
--   • notification_log: ledger anti-doppione (idempotenza)
-- ════════════════════════════════════════════════════════════════════════

-- ── push_subscriptions ──────────────────────────────────────────────────
create table if not exists push_subscriptions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, endpoint)
);
create index if not exists push_subscriptions_user_idx on push_subscriptions(user_id);
drop trigger if exists push_subscriptions_set_updated_at on push_subscriptions;
create trigger push_subscriptions_set_updated_at before update on push_subscriptions
  for each row execute function set_updated_at();

-- ── notification_prefs ──────────────────────────────────────────────────
create table if not exists notification_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enable_morning boolean not null default true,
  morning_time text not null default '07:00',
  enable_evening boolean not null default true,
  evening_time text not null default '22:00',
  enable_routines boolean not null default true,
  routine_lead_minutes integer not null default 5,
  timezone text not null default 'Europe/Rome',
  updated_at timestamptz not null default now()
);
drop trigger if exists notification_prefs_set_updated_at on notification_prefs;
create trigger notification_prefs_set_updated_at before update on notification_prefs
  for each row execute function set_updated_at();

-- ── notification_log (idempotenza) ─────────────────────────────────────
create table if not exists notification_log (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,            -- 'morning' | 'evening' | 'routine:{blockId}'
  for_date text not null,        -- YYYY-MM-DD nel timezone dell'utente
  sent_at timestamptz not null default now(),
  unique (user_id, kind, for_date)
);
create index if not exists notification_log_user_date_idx on notification_log(user_id, for_date);

-- ── RLS ─────────────────────────────────────────────────────────────────
alter table push_subscriptions enable row level security;
alter table notification_prefs enable row level security;
alter table notification_log   enable row level security;

drop policy if exists "own rows push_subscriptions" on push_subscriptions;
create policy "own rows push_subscriptions" on push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rows notification_prefs" on notification_prefs;
create policy "own rows notification_prefs" on notification_prefs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- notification_log: solo lettura per l'utente (la scrittura è server-side via service role)
drop policy if exists "read own notification_log" on notification_log;
create policy "read own notification_log" on notification_log
  for select using (auth.uid() = user_id);

-- ── default prefs alla prima sign-up (trigger su auth.users insert) ────
create or replace function create_default_notification_prefs()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.notification_prefs (user_id)
  values (new.id)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_notif_prefs on auth.users;
create trigger on_auth_user_created_notif_prefs
  after insert on auth.users
  for each row execute function create_default_notification_prefs();

-- Per l'utente corrente (se già esiste), inserisci ora se manca
insert into notification_prefs (user_id)
select id from auth.users
on conflict do nothing;
