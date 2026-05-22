import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/database";
import Layout from "../components/Layout";
import { Sheet } from "./Missions";
import ChallengePanel from "../components/ChallengePanel";
import { dayName, todayISO, currentWeekday, uid } from "../lib/date";
import { Plus, Trash2, Pencil, Check } from "lucide-react";
import type { RoutineBlock, Weekday } from "../types";

const allDays: Weekday[] = [1, 2, 3, 4, 5, 6, 0]; // Lun..Dom

type Tab = "routine" | "sfida";

export default function Routine() {
  const [tab, setTab] = useState<Tab>("routine");
  const [selectedDay, setSelectedDay] = useState<Weekday>(
    currentWeekday() as Weekday,
  );
  const today = todayISO();
  const blocks = useLiveQuery(() => db.routineBlocks.toArray(), []);
  const checks = useLiveQuery(
    () => db.routineChecks.where("date").equals(today).toArray(),
    [today],
  );
  const challenges = useLiveQuery(() => db.challenges.toArray(), []);
  const [editing, setEditing] = useState<RoutineBlock | null>(null);
  const [showNew, setShowNew] = useState(false);

  const dayBlocks = useMemo(
    () =>
      (blocks ?? [])
        .filter((b) => b.days.includes(selectedDay))
        .sort((a, b) => {
          if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
          return a.order - b.order;
        }),
    [blocks, selectedDay],
  );

  const isToday = selectedDay === (currentWeekday() as Weekday);
  const activeChallenges = (challenges ?? []).filter((c) => c.active);

  async function toggleCheck(blockId: string) {
    if (!isToday) return;
    const existing = await db.routineChecks
      .where({ blockId, date: today })
      .first();
    if (existing) {
      await db.routineChecks.update(existing.id, { done: !existing.done, at: Date.now() });
    } else {
      await db.routineChecks.add({
        id: uid("rc-"),
        blockId,
        date: today,
        done: true,
        at: Date.now(),
      });
    }
  }

  async function deleteBlock(id: string) {
    await db.routineBlocks.delete(id);
  }

  return (
    <Layout title={tab === "routine" ? "Routine" : "Sfida"}>
      <div className="mb-4 mt-1">
        <h1 className="display text-[36px] leading-none text-ink">
          {tab === "routine" ? "Routine" : "Sfida"}
        </h1>
        <p className="text-ink-muted text-[13px] mt-1.5">
          {tab === "routine"
            ? `${dayBlocks.length} blocchi · ${dayName(selectedDay)}`
            : `${activeChallenges.length} attive · patti a tempo`}
        </p>
      </div>

      {/* ── Tab switch ──────────────────────────────────────────────── */}
      <div className="glass-thin rounded-2xl p-1 flex gap-0.5 mb-5">
        <button
          onClick={() => setTab("routine")}
          className={`flex-1 py-2 rounded-xl text-[13px] font-medium transition-all ${
            tab === "routine"
              ? "bg-white/15 text-ink"
              : "text-ink-muted active:scale-95"
          }`}
        >
          Routine
        </button>
        <button
          onClick={() => setTab("sfida")}
          className={`flex-1 py-2 rounded-xl text-[13px] font-medium inline-flex items-center justify-center gap-1.5 transition-all ${
            tab === "sfida"
              ? "bg-white/15 text-ink"
              : "text-ink-muted active:scale-95"
          }`}
        >
          Sfida
          {activeChallenges.length > 0 && (
            <span
              className="text-[10px] num font-bold px-1.5 rounded-full"
              style={{
                background: "rgba(255,200,87,0.2)",
                color: "#FFC857",
              }}
            >
              {activeChallenges.length}
            </span>
          )}
        </button>
      </div>

      {tab === "routine" ? (
        <>
          {/* Selettore giorno */}
          <div className="flex gap-1.5 mb-5 overflow-x-auto -mx-5 px-5 pb-1">
            {allDays.map((d) => {
              const isSel = selectedDay === d;
              const isTd = d === (currentWeekday() as Weekday);
              return (
                <button
                  key={d}
                  onClick={() => setSelectedDay(d)}
                  className={`flex-1 min-w-[44px] py-3 rounded-2xl text-center transition-all border-[0.5px] ${
                    isSel
                      ? "bg-white/15 border-white/25 text-ink"
                      : "bg-white/[0.03] border-white/10 text-ink-muted active:scale-95"
                  }`}
                >
                  <div className="text-[12px] font-semibold uppercase tracking-wider">
                    {dayName(d, true)}
                  </div>
                  {isTd && (
                    <div
                      className="text-[8px] uppercase font-bold tracking-wider mt-0.5"
                      style={{ color: isSel ? "#b9a4ff" : "rgba(185,164,255,0.7)" }}
                    >
                      oggi
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {dayBlocks.length === 0 ? (
            <div className="card text-center text-ink-muted text-[14px] py-10">
              Nessun blocco per {dayName(selectedDay).toLowerCase()}.
            </div>
          ) : (
            <div className="card !p-0 overflow-hidden">
              {dayBlocks.map((b, i) => {
                const check = (checks ?? []).find((c) => c.blockId === b.id);
                const done = isToday && !!check?.done;
                return (
                  <div key={b.id}>
                    {i > 0 && <div className="hairline mx-5" />}
                    <div className="flex items-center gap-3 px-5 py-4">
                      <button
                        onClick={() => toggleCheck(b.id)}
                        disabled={!isToday}
                        className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center transition-all ${
                          done ? "bg-sys-green" : "border-[1.5px] border-white/30"
                        } ${!isToday ? "opacity-30" : ""}`}
                        style={
                          done
                            ? { boxShadow: "0 0 16px rgba(48,209,88,0.5)" }
                            : undefined
                        }
                      >
                        {done && (
                          <Check size={14} strokeWidth={3} className="text-bg-deep" />
                        )}
                      </button>
                      <button
                        onClick={() => setEditing(b)}
                        className="flex-1 min-w-0 text-left"
                      >
                        {b.startTime && (
                          <p className="num text-[11.5px] text-accent font-semibold tracking-wider">
                            {b.startTime}
                            {b.endTime && ` — ${b.endTime}`}
                          </p>
                        )}
                        <p
                          className={`text-[15.5px] leading-tight mt-0.5 ${
                            done ? "line-through text-ink-muted" : "text-ink font-medium"
                          }`}
                        >
                          {b.title}
                        </p>
                        {b.description && (
                          <p className="text-[12.5px] text-ink-muted mt-1 leading-snug">
                            {b.description}
                          </p>
                        )}
                      </button>
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => setEditing(b)}
                          className="p-2 text-ink-quiet active:scale-90 transition-transform"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => deleteBlock(b.id)}
                          className="p-2 text-ink-quiet active:scale-90 transition-transform"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <button
            onClick={() => setShowNew(true)}
            className="fixed right-5 z-30 w-14 h-14 rounded-full bg-white text-bg-deep flex items-center justify-center active:scale-90 transition-transform"
            style={{
              bottom: "calc(env(safe-area-inset-bottom) + 96px)",
              boxShadow: "0 12px 32px rgba(0,0,0,0.45), 0 0 0 0.5px rgba(255,255,255,0.4) inset, 0 1px 0 rgba(255,255,255,0.6) inset",
            }}
            aria-label="Nuovo blocco"
          >
            <Plus size={26} strokeWidth={2.5} />
          </button>

          {(editing || showNew) && (
            <BlockSheet
              block={editing}
              defaultDay={selectedDay}
              onClose={() => {
                setEditing(null);
                setShowNew(false);
              }}
            />
          )}
        </>
      ) : (
        <ChallengePanel />
      )}
    </Layout>
  );
}

function BlockSheet({
  block,
  defaultDay,
  onClose,
}: {
  block: RoutineBlock | null;
  defaultDay: Weekday;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(block?.title ?? "");
  const [startTime, setStartTime] = useState(block?.startTime ?? "");
  const [endTime, setEndTime] = useState(block?.endTime ?? "");
  const [description, setDescription] = useState(block?.description ?? "");
  const [days, setDays] = useState<Weekday[]>(block?.days ?? [defaultDay]);

  function toggleDay(d: Weekday) {
    setDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );
  }

  async function save() {
    if (!title.trim()) return;
    if (block) {
      await db.routineBlocks.update(block.id, {
        title: title.trim(),
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        description: description.trim() || undefined,
        days,
      });
    } else {
      await db.routineBlocks.add({
        id: uid("b-"),
        title: title.trim(),
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        description: description.trim() || undefined,
        days,
        order: Date.now(),
      });
    }
    onClose();
  }

  return (
    <Sheet onClose={onClose} title={block ? "Modifica blocco" : "Nuovo blocco"} orb="#7EE8D7">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Titolo (es. Deep Work)"
        className="input w-full mb-3"
      />

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label className="eyebrow block mb-1.5">Inizio</label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="input w-full num"
          />
        </div>
        <div>
          <label className="eyebrow block mb-1.5">Fine</label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="input w-full num"
          />
        </div>
      </div>

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Descrizione (opzionale)"
        rows={2}
        className="input w-full mb-3 resize-none"
      />

      <p className="eyebrow mb-2">Giorni</p>
      <div className="flex gap-1.5 mb-5">
        {allDays.map((d) => (
          <button
            key={d}
            onClick={() => toggleDay(d)}
            className={`flex-1 py-2.5 rounded-xl text-[11px] font-semibold border-[0.5px] transition-all ${
              days.includes(d)
                ? "bg-accent/15 border-accent/50 text-accent"
                : "bg-white/[0.03] border-white/10 text-ink-muted"
            }`}
          >
            {dayName(d, true)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button onClick={onClose} className="btn-ghost">Annulla</button>
        <button onClick={save} className="btn-primary">Salva</button>
      </div>
    </Sheet>
  );
}
