import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../db/database";
import { Sheet } from "../pages/Missions";
import { uid, todayISO, daysBetween, shiftDate } from "../lib/date";
import {
  Plus,
  Target,
  Flame,
  Check,
  X,
  Trash2,
  Pencil,
  ChevronRight,
} from "lucide-react";
import type { Challenge, ChallengeLog, ChallengeStatus } from "../types";

export default function ChallengePanel() {
  const challenges = useLiveQuery(() => db.challenges.toArray(), []);
  const logs = useLiveQuery(() => db.challengeLogs.toArray(), []);
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<Challenge | null>(null);
  const [openDetail, setOpenDetail] = useState<Challenge | null>(null);
  const [checkInFor, setCheckInFor] = useState<Challenge | null>(null);

  const sorted = useMemo(() => {
    return (challenges ?? [])
      .slice()
      .sort((a, b) => {
        if (a.active !== b.active) return a.active ? -1 : 1;
        return b.createdAt - a.createdAt;
      });
  }, [challenges]);

  return (
    <div className="relative">
      {sorted.length === 0 ? (
        <div className="card text-center text-ink-muted text-[14px] py-12">
          Nessuna sfida ancora.
          <br />
          <span className="text-ink-quiet text-[12px]">
            Crea un patto a tempo determinato con il bottone +
          </span>
        </div>
      ) : (
        <ul className="space-y-3">
          {sorted.map((c) => (
            <ChallengeCard
              key={c.id}
              challenge={c}
              logs={(logs ?? []).filter((l) => l.challengeId === c.id)}
              onOpen={() => setOpenDetail(c)}
              onCheckIn={() => setCheckInFor(c)}
            />
          ))}
        </ul>
      )}

      <button
        onClick={() => setShowNew(true)}
        className="fixed right-5 z-30 w-14 h-14 rounded-full bg-white text-bg-deep flex items-center justify-center active:scale-90 transition-transform"
        style={{
          bottom: "calc(env(safe-area-inset-bottom) + 96px)",
          boxShadow:
            "0 12px 32px rgba(0,0,0,0.45), 0 0 0 0.5px rgba(255,255,255,0.4) inset, 0 1px 0 rgba(255,255,255,0.6) inset",
        }}
        aria-label="Nuova sfida"
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>

      {(showNew || editing) && (
        <ChallengeSheet
          challenge={editing}
          onClose={() => {
            setShowNew(false);
            setEditing(null);
          }}
        />
      )}

      {openDetail && (
        <ChallengeDetailSheet
          challenge={openDetail}
          logs={(logs ?? []).filter((l) => l.challengeId === openDetail.id)}
          onEdit={() => {
            setEditing(openDetail);
            setOpenDetail(null);
          }}
          onClose={() => setOpenDetail(null)}
        />
      )}

      {checkInFor && (
        <CheckInSheet
          challenge={checkInFor}
          existing={(logs ?? []).find(
            (l) => l.challengeId === checkInFor.id && l.date === todayISO(),
          )}
          onClose={() => setCheckInFor(null)}
        />
      )}
    </div>
  );
}

function ChallengeCard({
  challenge,
  logs,
  onOpen,
  onCheckIn,
}: {
  challenge: Challenge;
  logs: ChallengeLog[];
  onOpen: () => void;
  onCheckIn: () => void;
}) {
  const today = todayISO();
  const totalDays = Math.max(1, daysBetween(challenge.startDate, challenge.endDate) + 1);
  const dayNumber = Math.max(0, Math.min(totalDays, daysBetween(challenge.startDate, today) + 1));
  const elapsed = Math.max(0, dayNumber);
  const doneDays = logs.filter((l) => l.status === "done").length;
  const missedDays = logs.filter((l) => l.status === "missed").length;
  const completedPct = totalDays > 0 ? Math.round((doneDays / totalDays) * 100) : 0;
  const todayLog = logs.find((l) => l.date === today);
  const isOngoing = challenge.active && today >= challenge.startDate && today <= challenge.endDate;
  const isUpcoming = challenge.active && today < challenge.startDate;
  const isPast = today > challenge.endDate;

  const tint = isOngoing ? "#FFC857" : isUpcoming ? "#8FB8FF" : "rgba(255,255,255,0.4)";
  const stateLabel = isOngoing
    ? `Giorno ${elapsed} / ${totalDays}`
    : isUpcoming
      ? `Inizia il ${challenge.startDate}`
      : `Conclusa · ${doneDays}/${totalDays}`;

  return (
    <li className="card relative overflow-hidden">
      <div
        className="absolute -top-20 -right-16 w-44 h-44 rounded-full opacity-30 blur-3xl pointer-events-none"
        style={{ background: tint }}
      />
      <button
        onClick={onOpen}
        className="w-full text-left active:scale-[0.99] transition-transform relative"
      >
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{
              background: `${tint}22`,
              border: `0.5px solid ${tint}66`,
            }}
          >
            <Target size={14} style={{ color: tint }} />
          </div>
          <p
            className="eyebrow num"
            style={{ color: tint }}
          >
            {stateLabel}
          </p>
        </div>
        <h3 className="display text-[22px] leading-tight text-ink mb-2">
          {challenge.title}
        </h3>
        {challenge.goals.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {challenge.goals.map((g, i) => (
              <span key={i} className="chip">
                {g}
              </span>
            ))}
          </div>
        )}

        {/* Progress bar giorni */}
        <div className="h-1.5 rounded-full bg-white/8 overflow-hidden mb-1.5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(elapsed / totalDays) * 100}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{
              background: tint,
              boxShadow: `0 0 12px ${tint}80`,
            }}
          />
        </div>
        <div className="flex items-center gap-3 text-[11px] num text-ink-muted">
          <span className="inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-sys-green" /> {doneDays}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-prio-high" /> {missedDays}
          </span>
          <span className="ml-auto text-ink-quiet">{completedPct}%</span>
        </div>
      </button>

      {isOngoing && !todayLog && (
        <button
          onClick={onCheckIn}
          className="w-full mt-4 btn-accent inline-flex items-center justify-center gap-2"
        >
          <Flame size={16} /> Chiudi oggi
        </button>
      )}
      {isOngoing && todayLog && (
        <div
          className="mt-4 glass-thin rounded-2xl px-4 py-2.5 flex items-center justify-between text-[13px]"
          style={{
            borderColor:
              todayLog.status === "done"
                ? "rgba(48,209,88,0.40)"
                : "rgba(255,107,122,0.40)",
            background:
              todayLog.status === "done"
                ? "rgba(48,209,88,0.10)"
                : "rgba(255,107,122,0.10)",
            color: todayLog.status === "done" ? "#30D158" : "#FF6B7A",
          }}
        >
          <span className="font-semibold">
            {todayLog.status === "done" ? "Oggi · Fatto" : "Oggi · Non fatto"}
          </span>
          <button onClick={onCheckIn} className="text-[11.5px] underline">
            Modifica
          </button>
        </div>
      )}
      {isPast && challenge.active && (
        <PastChallengeActions challenge={challenge} />
      )}
    </li>
  );
}

function PastChallengeActions({ challenge }: { challenge: Challenge }) {
  async function archive() {
    await db.challenges.update(challenge.id, { active: false });
  }
  return (
    <button
      onClick={archive}
      className="mt-4 btn-ghost w-full text-[13px]"
    >
      Archivia sfida
    </button>
  );
}

function ChallengeSheet({
  challenge,
  onClose,
}: {
  challenge: Challenge | null;
  onClose: () => void;
}) {
  const isEdit = !!challenge;
  const [title, setTitle] = useState(challenge?.title ?? "");
  const [description, setDescription] = useState(challenge?.description ?? "");
  const [startDate, setStartDate] = useState(challenge?.startDate ?? todayISO());
  const [endDate, setEndDate] = useState(
    challenge?.endDate ?? shiftDate(todayISO(), 29),
  );
  const [goals, setGoals] = useState<string[]>(challenge?.goals ?? []);
  const [newGoal, setNewGoal] = useState("");

  function setPreset(days: number) {
    setEndDate(shiftDate(startDate, days - 1));
  }

  function addGoal() {
    const t = newGoal.trim();
    if (!t) return;
    setGoals((g) => [...g, t]);
    setNewGoal("");
  }

  function removeGoal(i: number) {
    setGoals((g) => g.filter((_, idx) => idx !== i));
  }

  async function save() {
    if (!title.trim()) return;
    if (isEdit) {
      await db.challenges.update(challenge!.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        startDate,
        endDate,
        goals,
      });
    } else {
      await db.challenges.add({
        id: uid("ch-"),
        title: title.trim(),
        description: description.trim() || undefined,
        startDate,
        endDate,
        goals,
        active: true,
        createdAt: Date.now(),
      });
    }
    onClose();
  }

  async function deleteChallenge() {
    if (!challenge) return;
    await db.challenges.delete(challenge.id);
    await db.challengeLogs
      .where("challengeId")
      .equals(challenge.id)
      .delete();
    onClose();
  }

  const totalDays = Math.max(1, daysBetween(startDate, endDate) + 1);

  return (
    <Sheet onClose={onClose} title={isEdit ? "Modifica sfida" : "Nuova sfida"} orb="#FFC857">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Titolo (es. Sfida 30 giorni · Fisico)"
        className="input w-full mb-3"
      />

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Descrizione / regole (opzionale)"
        rows={2}
        className="input w-full mb-4 resize-none"
      />

      <p className="eyebrow mb-2">Durata · {totalDays} giorni</p>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label className="text-[10px] uppercase tracking-wider text-ink-muted">
            Inizio
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="input w-full mt-1 num"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-ink-muted">
            Fine
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="input w-full mt-1 num"
          />
        </div>
      </div>
      <div className="flex gap-1.5 mb-4">
        {[7, 14, 21, 30, 60, 90].map((d) => (
          <button
            key={d}
            onClick={() => setPreset(d)}
            className="chip num flex-1"
          >
            {d}g
          </button>
        ))}
      </div>

      <p className="eyebrow mb-2">Obiettivi</p>
      <div className="flex gap-2 mb-2">
        <input
          value={newGoal}
          onChange={(e) => setNewGoal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addGoal();
          }}
          placeholder="Es. abbronzatura"
          className="input flex-1"
        />
        <button onClick={addGoal} className="btn-ghost px-4">
          <Plus size={16} />
        </button>
      </div>
      {goals.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-5">
          {goals.map((g, i) => (
            <button
              key={i}
              onClick={() => removeGoal(i)}
              className="chip chip-active inline-flex items-center gap-1.5"
            >
              {g}
              <X size={11} />
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 mb-2">
        <button onClick={onClose} className="btn-ghost">
          Annulla
        </button>
        <button onClick={save} className="btn-primary">
          {isEdit ? "Aggiorna" : "Crea sfida"}
        </button>
      </div>

      {isEdit && (
        <button
          onClick={deleteChallenge}
          className="btn-ghost w-full mt-3 inline-flex items-center justify-center gap-2"
          style={{ color: "#FF6B7A", borderColor: "rgba(255,107,122,0.40)" }}
        >
          <Trash2 size={14} /> Elimina sfida (e log)
        </button>
      )}
    </Sheet>
  );
}

function CheckInSheet({
  challenge,
  existing,
  onClose,
}: {
  challenge: Challenge;
  existing?: ChallengeLog;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<ChallengeStatus | null>(
    existing?.status ?? null,
  );
  const [reason, setReason] = useState(existing?.reason ?? "");

  async function save() {
    if (!status) return;
    const date = todayISO();
    if (existing?.id) {
      await db.challengeLogs.update(existing.id, {
        status,
        reason: status === "missed" ? reason.trim() || undefined : undefined,
        at: Date.now(),
      });
    } else {
      await db.challengeLogs.add({
        id: uid("cl-"),
        challengeId: challenge.id,
        date,
        status,
        reason: status === "missed" ? reason.trim() || undefined : undefined,
        at: Date.now(),
      });
    }
    onClose();
  }

  return (
    <Sheet
      onClose={onClose}
      title="Chiudi giorno"
      orb={status === "done" ? "#30D158" : status === "missed" ? "#FF6B7A" : "#FFC857"}
    >
      <p className="text-ink-dim text-[14px] mb-4 leading-relaxed">
        <span className="font-semibold text-ink">{challenge.title}</span>
        <br />
        Come è andata oggi?
      </p>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          onClick={() => setStatus("done")}
          className="py-5 rounded-2xl border-[0.5px] transition-all flex flex-col items-center gap-2"
          style={
            status === "done"
              ? {
                  background: "rgba(48,209,88,0.15)",
                  borderColor: "rgba(48,209,88,0.6)",
                  color: "#30D158",
                }
              : {
                  background: "rgba(255,255,255,0.04)",
                  borderColor: "rgba(255,255,255,0.10)",
                  color: "rgba(255,255,255,0.7)",
                }
          }
        >
          <Check size={22} strokeWidth={2.5} />
          <span className="text-[13.5px] font-bold">Fatto</span>
        </button>
        <button
          onClick={() => setStatus("missed")}
          className="py-5 rounded-2xl border-[0.5px] transition-all flex flex-col items-center gap-2"
          style={
            status === "missed"
              ? {
                  background: "rgba(255,107,122,0.15)",
                  borderColor: "rgba(255,107,122,0.6)",
                  color: "#FF6B7A",
                }
              : {
                  background: "rgba(255,255,255,0.04)",
                  borderColor: "rgba(255,255,255,0.10)",
                  color: "rgba(255,255,255,0.7)",
                }
          }
        >
          <X size={22} strokeWidth={2.5} />
          <span className="text-[13.5px] font-bold">Non fatto</span>
        </button>
      </div>

      <AnimatePresence>
        {status === "missed" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <p className="eyebrow mb-2 text-prio-high">Perché?</p>
            <textarea
              autoFocus
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Cosa è successo? Senza scuse — onestà"
              rows={4}
              className="input w-full mb-4 resize-none"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-2 gap-2">
        <button onClick={onClose} className="btn-ghost">
          Annulla
        </button>
        <button
          onClick={save}
          disabled={!status}
          className="btn-primary disabled:opacity-40"
        >
          Salva
        </button>
      </div>
    </Sheet>
  );
}

function ChallengeDetailSheet({
  challenge,
  logs,
  onEdit,
  onClose,
}: {
  challenge: Challenge;
  logs: ChallengeLog[];
  onEdit: () => void;
  onClose: () => void;
}) {
  const today = todayISO();
  const totalDays = Math.max(1, daysBetween(challenge.startDate, challenge.endDate) + 1);
  const doneLogs = logs.filter((l) => l.status === "done");
  const missedLogs = logs.filter((l) => l.status === "missed").sort((a, b) => b.at - a.at);
  const pct = Math.round((doneLogs.length / totalDays) * 100);

  // Calendar heatmap (lista giorni dal start)
  const days: { date: string; status: ChallengeStatus | "future" | "empty" }[] = [];
  for (let i = 0; i < totalDays; i++) {
    const d = shiftDate(challenge.startDate, i);
    const log = logs.find((l) => l.date === d);
    if (log) days.push({ date: d, status: log.status });
    else if (d > today) days.push({ date: d, status: "future" });
    else days.push({ date: d, status: "empty" });
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 280, damping: 30 }}
        className="glass-thick absolute inset-x-0 bottom-0 top-16 rounded-t-3xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 6rem)" }}
      >
        <div
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full opacity-30 blur-3xl pointer-events-none"
          style={{ background: "#FFC857" }}
        />
        <div className="sticky top-0 z-10 glass-thick px-5 pt-5 pb-3 border-b-[0.5px] border-white/10">
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="eyebrow num" style={{ color: "#FFC857" }}>
                {challenge.startDate} → {challenge.endDate} · {totalDays}g
              </p>
              <h3 className="display text-[26px] leading-tight mt-0.5">
                {challenge.title}
              </h3>
            </div>
            <button onClick={onEdit} className="text-ink-muted p-1">
              <Pencil size={18} />
            </button>
            <button onClick={onClose} className="text-ink-muted p-1">
              <X size={22} />
            </button>
          </div>
        </div>

        <div className="px-5 pt-5 relative space-y-5">
          {/* Riepilogo numeri */}
          <div className="grid grid-cols-3 gap-2">
            <div className="card !p-4 text-center">
              <p className="display-num text-[28px] leading-none text-sys-green">
                {doneLogs.length}
              </p>
              <p className="eyebrow mt-1.5 text-[10px]">Fatti</p>
            </div>
            <div className="card !p-4 text-center">
              <p className="display-num text-[28px] leading-none text-prio-high">
                {missedLogs.length}
              </p>
              <p className="eyebrow mt-1.5 text-[10px]">Mancati</p>
            </div>
            <div className="card !p-4 text-center">
              <p className="display-num text-[28px] leading-none">{pct}%</p>
              <p className="eyebrow mt-1.5 text-[10px]">Tasso</p>
            </div>
          </div>

          {/* Obiettivi */}
          {challenge.goals.length > 0 && (
            <div>
              <p className="eyebrow mb-2">Obiettivi</p>
              <div className="flex flex-wrap gap-1.5">
                {challenge.goals.map((g, i) => (
                  <span key={i} className="chip chip-active">
                    {g}
                  </span>
                ))}
              </div>
            </div>
          )}

          {challenge.description && (
            <div>
              <p className="eyebrow mb-2">Regole</p>
              <p className="text-[14px] text-ink-dim leading-relaxed">
                {challenge.description}
              </p>
            </div>
          )}

          {/* Heatmap calendar */}
          <div>
            <p className="eyebrow mb-3">Calendario</p>
            <div className="grid grid-cols-7 gap-1.5">
              {days.map((d, i) => (
                <div
                  key={d.date}
                  title={d.date}
                  className="aspect-square rounded-md flex items-center justify-center text-[10px] num font-semibold"
                  style={
                    d.status === "done"
                      ? {
                          background: "rgba(48,209,88,0.30)",
                          color: "#30D158",
                          boxShadow: "inset 0 0 0 0.5px rgba(48,209,88,0.5)",
                        }
                      : d.status === "missed"
                        ? {
                            background: "rgba(255,107,122,0.25)",
                            color: "#FF6B7A",
                            boxShadow: "inset 0 0 0 0.5px rgba(255,107,122,0.45)",
                          }
                        : d.status === "future"
                          ? {
                              background: "rgba(255,255,255,0.03)",
                              color: "rgba(255,255,255,0.20)",
                            }
                          : {
                              background: "rgba(255,255,255,0.05)",
                              color: "rgba(255,255,255,0.35)",
                            }
                  }
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>

          {/* Motivi dei fallimenti */}
          {missedLogs.length > 0 && (
            <div>
              <p className="eyebrow mb-2 text-prio-high">
                Motivi dei mancati · insight
              </p>
              <ul className="space-y-1.5">
                {missedLogs.map((m) => (
                  <li key={m.id} className="card !p-3.5">
                    <p className="text-[11px] num text-ink-muted uppercase tracking-wider mb-1">
                      {m.date}
                    </p>
                    <p className="text-[14px] text-ink-dim leading-snug">
                      {m.reason || (
                        <span className="text-ink-quiet italic">
                          Nessun motivo scritto
                        </span>
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// Suppress unused
void ChevronRight;
