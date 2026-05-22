// ════════════════════════════════════════════════════════════════════════
// Sync layer — Dexie (locale, source of truth per la UI)  ⇄  Supabase (cloud)
// ────────────────────────────────────────────────────────────────────────
// Strategia:
//  • On login: reconciliation iniziale (push local→cloud se cloud vuoto,
//    altrimenti pull cloud→local).
//  • A regime: ogni create/update/delete su Dexie viene rispecchiato su
//    Supabase tramite Dexie hooks (fire-and-forget, log su errore).
//  • Quando si "pulla" da cloud, suppressSync=true evita loop.
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
];

let suppressSync = false;
let currentUserId: string | null = null;
let hooksAttached = false;

// Converte undefined → null per Postgres (preserva intenzione di "campo vuoto").
function toRemote(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = v === undefined ? null : v;
  }
  return out;
}

// Pulisce le righe arrivate da Supabase: rimuove metadata e nulls.
function fromRemote(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (k === "user_id" || k === "updated_at") continue;
    if (v !== null) out[k] = v;
  }
  return out;
}

function tableOf(name: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (db as any)[name];
}

async function pullAndReplace(t: SyncedTable) {
  if (!supabase) return;
  const { data, error } = await supabase.from(t.remote).select("*");
  if (error) {
    console.warn(`[sync] pull ${t.remote}:`, error.message);
    return;
  }
  const cleanRows = (data ?? []).map(fromRemote);
  suppressSync = true;
  try {
    await tableOf(t.dexie).clear();
    if (cleanRows.length > 0) {
      await tableOf(t.dexie).bulkPut(cleanRows);
    }
  } finally {
    suppressSync = false;
  }
}

async function reconcileTable(t: SyncedTable) {
  if (!supabase || !currentUserId) return;
  const { data, error } = await supabase.from(t.remote).select("*");
  if (error) {
    console.warn(`[sync] check ${t.remote}:`, error.message);
    return;
  }
  const remoteRows = (data ?? []).map(fromRemote);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const localRows: any[] = await tableOf(t.dexie).toArray();

  // 1) Merge remote → local (server values vincono per le righe che ci sono di là).
  if (remoteRows.length > 0) {
    suppressSync = true;
    try {
      await tableOf(t.dexie).bulkPut(remoteRows);
    } finally {
      suppressSync = false;
    }
  }

  // 2) Push locali che non sono in cloud (es. create offline o primo login).
  const remoteIds = new Set(remoteRows.map((r) => (r as { id: string }).id));
  const onlyLocal = localRows.filter((r) => !remoteIds.has(r.id));
  if (onlyLocal.length > 0) {
    const rows = onlyLocal.map((r) =>
      toRemote({ ...r, user_id: currentUserId }),
    );
    const opts = t.singleton ? { onConflict: "user_id,id" } : undefined;
    const { error: pushErr } = await supabase
      .from(t.remote)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .upsert(rows as any, opts as any);
    if (pushErr) console.warn(`[sync] backfill ${t.remote}:`, pushErr.message);
  }
}

async function pushUpsert(t: SyncedTable, obj: Record<string, unknown>) {
  if (!supabase || !currentUserId) return;
  const row = toRemote({ ...obj, user_id: currentUserId });
  const opts = t.singleton ? { onConflict: "user_id,id" } : undefined;
  const { error } = await supabase
    .from(t.remote)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .upsert(row as any, opts as any);
  if (error) console.warn(`[sync] upsert ${t.remote}:`, error.message);
}

async function pushDelete(t: SyncedTable, id: string) {
  if (!supabase || !currentUserId) return;
  const { error } = await supabase
    .from(t.remote)
    .delete()
    .eq("id", id)
    .eq("user_id", currentUserId);
  if (error) console.warn(`[sync] delete ${t.remote}:`, error.message);
}

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function (this: any, primKey: string) {
        if (suppressSync || !currentUserId) return;
        this.onsuccess = () => {
          void pushDelete(t, primKey);
        };
      },
    );
  }
}

// ════════════════════════════════════════════════════════════════════════
// API pubblica
// ════════════════════════════════════════════════════════════════════════

async function reconcileAll(): Promise<void> {
  for (const t of SYNCED_TABLES) {
    await reconcileTable(t);
  }
}

let onlineListenerAttached = false;

function attachOnlineListener() {
  if (onlineListenerAttached) return;
  onlineListenerAttached = true;
  window.addEventListener("online", () => {
    if (currentUserId) {
      void reconcileAll();
    }
  });
}

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
  for (const t of SYNCED_TABLES) {
    await pullAndReplace(t);
  }
}
