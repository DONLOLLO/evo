import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../db/database";
import Layout from "../components/Layout";
import { priorityHue, priorityLabels } from "../components/PriorityDot";
import { uid, todayISO } from "../lib/date";
import { Plus, Trash2, Pin, X, Check, Pencil, Target } from "lucide-react";
import type { Mission, Priority, Area } from "../types";
import { tap as hTap, success as hSuccess } from "../lib/haptics";
import EmptyState from "../components/EmptyState";

type Filter = "today" | "all" | "done";
const priorityWeight: Record<Priority, number> = { high: 0, mid: 1, low: 2 };

export default function Missions() {
  const today = todayISO();
  const missions = useLiveQuery(() => db.missions.toArray(), []);
  const areas = useLiveQuery(() => db.areas.toArray(), []);

  const [filter, setFilter] = useState<Filter>("today");
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [sheet, setSheet] = useState<{ mode: "new" } | { mode: "edit"; mission: Mission } | null>(null);

  const filtered = useMemo(() => {
    let list = missions ?? [];
    if (filter === "today") list = list.filter((m) => !m.done);
    else if (filter === "done") list = list.filter((m) => m.done);
    if (areaFilter !== "all") list = list.filter((m) => m.areaId === areaFilter);
    return [...list].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      if (a.pinnedForDate === today && b.pinnedForDate !== today) return -1;
      if (b.pinnedForDate === today && a.pinnedForDate !== today) return 1;
      const dp = priorityWeight[a.priority] - priorityWeight[b.priority];
      if (dp !== 0) return dp;
      return a.createdAt - b.createdAt;
    });
  }, [missions, filter, areaFilter, today]);

  async function toggleDone(m: Mission) {
    if (!m.done) hSuccess();
    else hTap();
    await db.missions.update(m.id, {
      done: !m.done,
      doneAt: !m.done ? Date.now() : undefined,
    });
  }
  async function togglePin(m: Mission) {
    hTap();
    await db.missions.update(m.id, {
      pinnedForDate: m.pinnedForDate === today ? undefined : today,
    });
  }
  async function remove(id: string) {
    hTap();
    await db.missions.delete(id);
  }

  return (
    <Layout title="Missioni">
      <div className="mb-5 mt-1">
        <h1 className="display text-[36px] leading-none text-ink">Missioni</h1>
        <p className="text-ink-muted text-[13px] mt-1.5">
          {(missions ?? []).filter((m) => !m.done).length} attive · {(missions ?? []).filter((m) => m.done).length} chiuse
        </p>
      </div>

      {/* ── Filtri segmented ─────────────────────────────────────────── */}
      <div className="glass-thin rounded-2xl p-1 flex gap-0.5 mb-3">
        {(["today", "all", "done"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-2 rounded-xl text-[13px] font-medium transition-all ${
              filter === f
                ? "bg-white/15 text-ink"
                : "text-ink-muted active:scale-95"
            }`}
          >
            {f === "today" ? "Attive" : f === "all" ? "Tutte" : "Fatte"}
          </button>
        ))}
      </div>

      {/* ── Filtri area ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 mb-5 overflow-x-auto pb-1 -mx-5 px-5">
        <button
          onClick={() => setAreaFilter("all")}
          className={`chip whitespace-nowrap ${
            areaFilter === "all" ? "chip-active" : ""
          }`}
        >
          Tutte aree
        </button>
        {(areas ?? []).map((a) => {
          const active = areaFilter === a.id;
          return (
            <button
              key={a.id}
              onClick={() => setAreaFilter(a.id)}
              className="chip whitespace-nowrap"
              style={{
                color: active ? a.color : "rgba(255,255,255,0.7)",
                background: active ? `${a.color}22` : undefined,
                borderColor: active ? `${a.color}66` : undefined,
              }}
            >
              {a.name}
            </button>
          );
        })}
      </div>

      {/* ── Lista ───────────────────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        <ul className="space-y-2">
          {filtered.map((m, i) => {
            const area = areas?.find((a) => a.id === m.areaId);
            return (
              <motion.li
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, delay: Math.min(i * 0.02, 0.2) }}
                className={`card flex items-start gap-4 ${m.done ? "opacity-50" : ""}`}
              >
                <button
                  onClick={() => toggleDone(m)}
                  className="flex-shrink-0 mt-0.5"
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                      m.done ? "bg-sys-green" : ""
                    }`}
                    style={
                      m.done
                        ? { boxShadow: "0 0 16px rgba(48,209,88,0.45)" }
                        : {
                            border: `2px solid ${priorityHue[m.priority]}`,
                            boxShadow: `0 0 14px ${priorityHue[m.priority]}40`,
                          }
                    }
                  >
                    {m.done && (
                      <Check size={14} strokeWidth={3} className="text-bg-deep" />
                    )}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setSheet({ mode: "edit", mission: m })}
                  className="flex-1 min-w-0 text-left active:scale-[0.99] transition-transform"
                >
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span
                      className="text-[10px] uppercase font-semibold tracking-[0.12em]"
                      style={{ color: priorityHue[m.priority] }}
                    >
                      {priorityLabels[m.priority]}
                    </span>
                    {area && (
                      <span
                        className="chip"
                        style={{
                          color: area.color,
                          background: `${area.color}1a`,
                          borderColor: `${area.color}55`,
                        }}
                      >
                        {area.name}
                      </span>
                    )}
                    {m.pinnedForDate === today && (
                      <span className="chip text-accent" style={{ borderColor: "rgba(185,164,255,0.5)", background: "rgba(185,164,255,0.12)" }}>
                        <Pin size={9} /> oggi
                      </span>
                    )}
                  </div>
                  <p className={`text-[15.5px] leading-snug ${m.done ? "line-through" : "text-ink"}`}>
                    {m.title}
                  </p>
                  {m.notes && (
                    <p className="text-[13px] text-ink-muted mt-1">{m.notes}</p>
                  )}
                </button>
                <div className="flex flex-col gap-0.5 -mr-1">
                  <button
                    onClick={() => setSheet({ mode: "edit", mission: m })}
                    className="p-2 rounded-full text-ink-quiet active:scale-90 transition-transform"
                    aria-label="Modifica missione"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => togglePin(m)}
                    className={`p-2 rounded-full active:scale-90 transition-transform ${
                      m.pinnedForDate === today ? "text-accent" : "text-ink-quiet"
                    }`}
                  >
                    <Pin size={14} />
                  </button>
                  <button
                    onClick={() => remove(m.id)}
                    className="p-2 rounded-full text-ink-quiet active:scale-90 transition-transform"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </motion.li>
            );
          })}
        </ul>
      </AnimatePresence>

      {filtered.length === 0 && (
        <EmptyState
          icon={Target}
          title={
            filter === "done"
              ? "Nessuna missione chiusa ancora"
              : filter === "today"
                ? "Niente in agenda"
                : "Nessuna missione"
          }
          subtitle={
            filter === "done"
              ? "Quando completi una missione la trovi qui."
              : filter === "today"
                ? "Tocca + in basso per aggiungere la prima. O usa Brain Dump per scaricarne molte tutte insieme."
                : "Aggiungi la tua prima missione con il bottone + in basso."
          }
          accent="#b9a4ff"
        />
      )}

      {/* ── FAB ─────────────────────────────────────────────────────── */}
      <button
        onClick={() => setSheet({ mode: "new" })}
        className="fixed right-5 z-30 w-14 h-14 rounded-full bg-white text-bg-deep flex items-center justify-center active:scale-90 transition-transform"
        style={{
          bottom: "calc(env(safe-area-inset-bottom) + 96px)",
          boxShadow: "0 12px 32px rgba(0,0,0,0.45), 0 0 0 0.5px rgba(255,255,255,0.4) inset, 0 1px 0 rgba(255,255,255,0.6) inset",
        }}
        aria-label="Nuova missione"
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>

      {sheet && (
        <MissionSheet
          areas={areas ?? []}
          mission={sheet.mode === "edit" ? sheet.mission : undefined}
          onClose={() => setSheet(null)}
        />
      )}
    </Layout>
  );
}

function MissionSheet({
  areas,
  mission,
  onClose,
}: {
  areas: Area[];
  mission?: Mission;
  onClose: () => void;
}) {
  const editing = !!mission;
  const [title, setTitle] = useState(mission?.title ?? "");
  const [priority, setPriority] = useState<Priority>(mission?.priority ?? "mid");
  const [areaId, setAreaId] = useState<string | undefined>(mission?.areaId);
  const [notes, setNotes] = useState(mission?.notes ?? "");

  async function save() {
    if (!title.trim()) return;
    if (editing && mission) {
      await db.missions.update(mission.id, {
        title: title.trim(),
        notes: notes.trim() || undefined,
        priority,
        areaId,
      });
    } else {
      await db.missions.add({
        id: uid("m-"),
        title: title.trim(),
        notes: notes.trim() || undefined,
        priority,
        areaId,
        done: false,
        createdAt: Date.now(),
        order: Date.now(),
      });
    }
    onClose();
  }

  return (
    <Sheet onClose={onClose} title={editing ? "Modifica missione" : "Nuova missione"}>
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Cosa devi fare?"
        className="input w-full mb-3"
      />

      <div className="grid grid-cols-3 gap-2 mb-3">
        {(["high", "mid", "low"] as Priority[]).map((p) => (
          <button
            key={p}
            onClick={() => setPriority(p)}
            className="py-3 rounded-2xl text-[12px] font-semibold transition-all border-[0.5px]"
            style={
              priority === p
                ? {
                    background: `${priorityHue[p]}22`,
                    borderColor: `${priorityHue[p]}80`,
                    color: priorityHue[p],
                  }
                : {
                    background: "rgba(255,255,255,0.04)",
                    borderColor: "rgba(255,255,255,0.10)",
                    color: "rgba(255,255,255,0.5)",
                  }
            }
          >
            {priorityLabels[p]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        <button
          onClick={() => setAreaId(undefined)}
          className={`chip ${!areaId ? "chip-active" : ""}`}
        >
          Senza area
        </button>
        {areas.map((a) => (
          <button
            key={a.id}
            onClick={() => setAreaId(a.id)}
            className="chip"
            style={{
              color: areaId === a.id ? a.color : "rgba(255,255,255,0.7)",
              background: areaId === a.id ? `${a.color}1a` : undefined,
              borderColor: areaId === a.id ? `${a.color}55` : undefined,
            }}
          >
            {a.name}
          </button>
        ))}
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Note (opzionale)"
        rows={2}
        className="input w-full mb-5 resize-none"
      />

      <div className="grid grid-cols-2 gap-2">
        <button onClick={onClose} className="btn-ghost">Annulla</button>
        <button onClick={save} className="btn-primary">Salva</button>
      </div>
    </Sheet>
  );
}

export function Sheet({
  onClose,
  title,
  children,
  orb = "#b9a4ff",
}: {
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  orb?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="glass-thick w-full rounded-t-3xl relative overflow-hidden flex flex-col"
        style={{ maxHeight: "90dvh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full opacity-30 blur-3xl pointer-events-none"
          style={{ background: orb }}
        />
        <div className="relative px-5 pt-5 flex-shrink-0">
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
          <div className="flex items-center justify-between mb-5">
            <h3 className="display text-[22px] text-ink">{title}</h3>
            <button onClick={onClose} className="text-ink-muted p-1 -mr-1">
              <X size={22} />
            </button>
          </div>
        </div>
        <div
          className="relative px-5 overflow-y-auto"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)" }}
        >
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}
