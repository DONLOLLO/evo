// ════════════════════════════════════════════════════════════════════════
// Sync layer — Dexie (locale)  ⇄  Supabase (cloud)
// ────────────────────────────────────────────────────────────────────────
// • Local-first: la UI legge sempre da Dexie. Le scritture Dexie vengono
//   rispecchiate su Supabase via hook (creating/updating/deleting).
// • Soft delete (tombstone): le delete locali si traducono in upsert su
//   Supabase con deleted_at = now(). In reconcile, le righe con
//   deleted_at sul cloud vengono cancellate localmente.
// • Reconcile = merge:
//     - alive remote rows  → bulkPut su Dexie
//     - tombstone remote   → delete locale
//     - local extra rows   → backfill su Supabase
// • Online listener: al ritorno della rete, ri-reconcile.
// ════════════════════════════════════════════════════════════════════════

import { db } from "../db/database";
import { supabase } from "./supabase";

type SyncedTable = {
  dexie: keyof typeof db & string;
  remote: string;
  singleton?: boolean;
};

const SYNCED_TABLES: SyncedTable[] = [
  { dexie: "areas", remote: "areas" },
  { dexie: "stats", remote: "stats" },
  { dexie: "routineBlocks", remote: "routine_blocks" },
  { dexie: "skills", remote: "skills" },
  { dexie: "skillResources", remote: "skill_resources" },
  { dexie: "skillActions", remote: "skill_actions" },
  { dexie: "missions", remote: "missions" },
  { dexie: "roadmap", remote: "roadmap" },
  { dexie: "laws", remote: "laws" },
  { dexie: "victories", remote: "victories" },
  { dexie: "vision", remote: "vision", singleton: true },
  { dexie: "settings", remote: "settings", singleton: true },
  { dexie: "people", remote: "people" },
  { dexie: "touchpoints", remote: "touchpoints" },
  { dexie: "challenges", remote: "challenges" },
  // history tables (append-only logs)
  { dexie: "statHistory", remote: "stat_history" },
  { dexie: "routineChecks", remote: "routine_checks" },
  { dexie: "checkins", remote: "checkins" },
  { dexie: "challengeLogs", remote: "challenge_logs" },
  { dexie: "weeklyReviews", remote: "weekly_reviews" },
];

let suppressSync = false;
let currentUserId: string | null = null;
let hooksAttached = false;
let onlineListenerAttached = false;

function toRemote(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = v === undefined ? null : v;
  }
  return out;
}

function fromRemote(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (k === "user_id" || k === "updated_at" || k === "deleted_at") continue;
    if (v !== null) out[k] = v;
  }
  return out;
}

function tableOf(name: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (db as any)[name];
}

// ── reconcile ──────────────────────────────────────────────────────────

async function reconcileTable(t: SyncedTable) {
  if (!supabase || !currentUserId) return;
  // Fetch tutto, anche le righe tombstone (per applicare delete locali).
  const { data, error } = await supabase.from(t.remote).select("*");
  if (error) {
    console.warn(`[sync] check ${t.remote}:`, error.message);
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const remoteAll: any[] = data ?? [];
  const alive = remoteAll.filter((r) => !r.deleted_at);
  const dead = remoteAll.filter((r) => !!r.deleted_at);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const localRows: any[] = await tableOf(t.dexie).toArray();

  suppressSync = true;
  try {
    // 1) Applica tombstone remote → delete locale.
    if (dead.length > 0) {
      const deadIds = dead.map((r) => r.id);
      await tableOf(t.dexie).bulkDelete(deadIds);
    }
    // 2) Merge alive remote → local (server wins per id condivisi).
    if (alive.length > 0) {
      await tableOf(t.dexie).bulkPut(alive.map(fromRemote));
    }
  } finally {
    suppressSync = false;
  }

  // 3) Backfill: locali non visti su remote (né alive né dead) → push up.
  const knownRemoteIds = new Set(remoteAll.map((r) => r.id));
  const onlyLocal = localRows.filter((r) => !knownRemoteIds.has(r.id));
  if (onlyLocal.length > 0) {
    const rows = onlyLocal.map((r) =>
      toRemote({ ...r, user_id: currentUserId, deleted_at: null }),
    );
    const opts = t.singleton ? { onConflict: "user_id,id" } : undefined;
    const { error: pushErr } = await supabase
      .from(t.remote)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .upsert(rows as any, opts as any);
    if (pushErr) console.warn(`[sync] backfill ${t.remote}:`, pushErr.message);
  }
}

async function reconcileAll(): Promise<void> {
  for (const t of SYNCED_TABLES) {
    await reconcileTable(t);
  }
}

// ── push (writes locali → cloud) ───────────────────────────────────────

async function pushUpsert(t: SyncedTable, obj: Record<string, unknown>) {
  if (!supabase || !currentUserId) return;
  const row = toRemote({
    ...obj,
    user_id: currentUserId,
    deleted_at: null,
  });
  const opts = t.singleton ? { onConflict: "user_id,id" } : undefined;
  const { error } = await supabase
    .from(t.remote)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .upsert(row as any, opts as any);
  if (error) console.warn(`[sync] upsert ${t.remote}:`, error.message);
}

async function pushTombstone(
  t: SyncedTable,
  id: string,
  obj: Record<string, unknown> | undefined,
) {
  if (!supabase || !currentUserId) return;
  // Upsert con deleted_at impostato. Manteniamo gli altri campi se li abbiamo,
  // così la riga resta consultabile (audit) anche da cancellata.
  const row = toRemote({
    ...(obj ?? {}),
    id,
    user_id: currentUserId,
    deleted_at: new Date().toISOString(),
  });
  const opts = t.singleton ? { onConflict: "user_id,id" } : undefined;
  const { error } = await supabase
    .from(t.remote)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .upsert(row as any, opts as any);
  if (error) console.warn(`[sync] tombstone ${t.remote}:`, error.message);
}

// ── Dexie hooks ────────────────────────────────────────────────────────

function attachHooks() {
  if (hooksAttached) return;
  hooksAttached = true;
  for (const t of SYNCED_TABLES) {
    const table = tableOf(t.dexie);

    table.hook(
      "creating",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function (this: any, primKey: string, obj: Record<string, unknown>) {
        if (suppressSync || !currentUserId) return;
        this.onsuccess = () => {
          void pushUpsert(t, { ...obj, id: primKey });
        };
      },
    );

    table.hook(
      "updating",
      function (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this: any,
        mods: Record<string, unknown>,
        primKey: string,
        obj: Record<string, unknown>,
      ) {
        if (suppressSync || !currentUserId) return;
        this.onsuccess = () => {
          void pushUpsert(t, { ...obj, ...mods, id: primKey });
        };
      },
    );

    table.hook(
      "deleting",
      function (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this: any,
        primKey: string,
        obj: Record<string, unknown>,
      ) {
        if (suppressSync || !currentUserId) return;
        this.onsuccess = () => {
          void pushTombstone(t, primKey, obj);
        };
      },
    );
  }
}

function attachOnlineListener() {
  if (onlineListenerAttached) return;
  onlineListenerAttached = true;
  window.addEventListener("online", () => {
    if (currentUserId) {
      void reconcileAll();
    }
  });
}

// ── API pubblica ───────────────────────────────────────────────────────

export async function startSync(userId: string): Promise<void> {
  if (!supabase) return;
  currentUserId = userId;
  await reconcileAll();
  attachHooks();
  attachOnlineListener();
}

export function stopSync(): void {
  currentUserId = null;
}

export async function fullPull(): Promise<void> {
  if (!supabase || !currentUserId) return;
  await reconcileAll();
}
