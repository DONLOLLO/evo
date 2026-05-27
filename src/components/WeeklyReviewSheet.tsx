import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/database";
import { Sheet } from "../pages/Missions";
import { uid, weekStartISO, shiftDate, todayISO } from "../lib/date";
import { Check, Trophy, ListChecks, Calendar, Heart } from "lucide-react";
import type { WeeklyReview } from "../types";
import { success as hSuccess } from "../lib/haptics";

function inRange(iso: string, fromISO: string, toISO: string) {
  return iso >= fromISO && iso <= toISO;
}

export default function WeeklyReviewSheet({
  weekStart,
  existing,
  onClose,
}: {
  weekStart: string;
  existing?: WeeklyReview;
  onClose: () => void;
}) {
  // Range: weekStart (Lun) → +6 (Dom)
  const weekEnd = useMemo(() => shiftDate(weekStart, 6), [weekStart]);

  // ── Calcoli aggregati live dai dati locali ────────────────────────
  const missions = useLiveQuery(() => db.missions.toArray(), []);
  const routineBlocks = useLiveQuery(() => db.routineBlocks.toArray(), []);
  const routineChecks = useLiveQuery(() => db.routineChecks.toArray(), []);
  const victories = useLiveQuery(() => db.victories.toArray(), []);
  const checkins = useLiveQuery(() => db.checkins.toArray(), []);

  const stats = useMemo(() => {
    const weekStartMs = new Date(weekStart + "T00:00:00").getTime();
    const weekEndMs = new Date(weekEnd + "T23:59:59").getTime();

    // Missioni: chiuse nel range
    const missionsDone =
      (missions ?? []).filter(
        (m) => m.done && m.doneAt && m.doneAt >= weekStartMs && m.doneAt <= weekEndMs,
      ).length;
    // Totale = missioni che esistevano (createdAt prima della fine settimana) E non sono già state chiuse PRIMA
    const missionsTotal =
      (missions ?? []).filter(
        (m) =>
          m.createdAt <= weekEndMs &&
          (!m.done || (m.doneAt && m.doneAt >= weekStartMs)),
      ).length;

    // Routine: per ogni blocco × giorno della settimana programmato → check?
    let routinesDone = 0;
    let routinesTotal = 0;
    const blocks = routineBlocks ?? [];
    const checks = routineChecks ?? [];
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const date = shiftDate(weekStart, dayOffset);
      const d = new Date(date + "T00:00:00").getDay();
      for (const block of blocks) {
        if (block.days.includes(d as 0 | 1 | 2 | 3 | 4 | 5 | 6)) {
          routinesTotal++;
          const check = checks.find(
            (c) => c.blockId === block.id && c.date === date,
          );
          if (check?.done) routinesDone++;
        }
      }
    }

    const victoriesCount = (victories ?? []).filter(
      (v) => v.at >= weekStartMs && v.at <= weekEndMs,
    ).length;

    const weekCheckins = (checkins ?? []).filter((c) =>
      inRange(c.date, weekStart, weekEnd),
    );
    const moodGreat = weekCheckins.filter((c) => c.mood === "great").length;
    const moodOk = weekCheckins.filter((c) => c.mood === "ok").length;
    const moodRough = weekCheckins.filter((c) => c.mood === "rough").length;

    return {
      missionsDone,
      missionsTotal,
      routinesDone,
      routinesTotal,
      victoriesCount,
      moodGreat,
      moodOk,
      moodRough,
    };
  }, [
    missions,
    routineBlocks,
    routineChecks,
    victories,
    checkins,
    weekStart,
    weekEnd,
  ]);

  const [wentWell, setWentWell] = useState(existing?.wentWell ?? "");
  const [didntGo, setDidntGo] = useState(existing?.didntGo ?? "");
  const [changeNext, setChangeNext] = useState(existing?.changeNext ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const payload = {
      ...stats,
      weekStart,
      wentWell: wentWell.trim(),
      didntGo: didntGo.trim(),
      changeNext: changeNext.trim(),
      closedAt: Date.now(),
    };
    if (existing) {
      await db.weeklyReviews.update(existing.id, payload);
    } else {
      await db.weeklyReviews.add({
        id: uid("wr-"),
        ...payload,
      });
    }
    hSuccess();
    onClose();
  }

  const isThisWeek = weekStart === weekStartISO();
  const title = isThisWeek
    ? "Review della settimana"
    : `Review · ${weekStart}`;

  return (
    <Sheet onClose={onClose} title={title} orb="#b9a4ff">
      <p className="text-ink-muted text-[12.5px] mb-4">
        Settimana dal {weekStart} al {weekEnd}
      </p>

      {/* ── Numeri ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2 mb-5">
        <StatCard
          icon={ListChecks}
          color="#b9a4ff"
          label="Missioni"
          value={`${stats.missionsDone}/${stats.missionsTotal}`}
        />
        <StatCard
          icon={Calendar}
          color="#5dd4c4"
          label="Routine"
          value={`${stats.routinesDone}/${stats.routinesTotal}`}
        />
        <StatCard
          icon={Trophy}
          color="#FFD479"
          label="Vittorie"
          value={`${stats.victoriesCount}`}
        />
        <StatCard
          icon={Heart}
          color="#ff6b7a"
          label="Mood"
          value={
            stats.moodGreat + stats.moodOk + stats.moodRough === 0
              ? "—"
              : `${stats.moodGreat}·${stats.moodOk}·${stats.moodRough}`
          }
          subtitle={
            stats.moodGreat + stats.moodOk + stats.moodRough === 0
              ? "0 check-in"
              : "great·ok·rough"
          }
        />
      </div>

      {/* ── Prompt 1 ────────────────────────────────────────────────── */}
      <p className="eyebrow mb-1.5" style={{ color: "#7ad48b" }}>
        Cosa è andato bene?
      </p>
      <textarea
        value={wentWell}
        onChange={(e) => setWentWell(e.target.value)}
        placeholder="I momenti che vuoi conservare, le cose che funzionano..."
        rows={3}
        className="input w-full mb-4 resize-none"
      />

      {/* ── Prompt 2 ────────────────────────────────────────────────── */}
      <p className="eyebrow mb-1.5" style={{ color: "#ff6b7a" }}>
        Cosa non è andato?
      </p>
      <textarea
        value={didntGo}
        onChange={(e) => setDidntGo(e.target.value)}
        placeholder="Cosa è scivolato, dove ti sei perso, cosa hai evitato..."
        rows={3}
        className="input w-full mb-4 resize-none"
      />

      {/* ── Prompt 3 ────────────────────────────────────────────────── */}
      <p className="eyebrow mb-1.5 text-accent">Cosa cambi la prossima?</p>
      <textarea
        value={changeNext}
        onChange={(e) => setChangeNext(e.target.value)}
        placeholder="Una sola cosa concreta. Non dieci."
        rows={3}
        className="input w-full mb-5 resize-none"
      />

      <div className="grid grid-cols-2 gap-2">
        <button onClick={onClose} className="btn-ghost">
          Annulla
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="btn-primary inline-flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Check size={16} /> {existing ? "Aggiorna" : "Chiudi settimana"}
        </button>
      </div>
    </Sheet>
  );
}

function StatCard({
  icon: Icon,
  color,
  label,
  value,
  subtitle,
}: {
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  color: string;
  label: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <div
      className="card !p-3.5 relative overflow-hidden"
      style={{ borderColor: `${color}30` }}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon size={12} className="text-ink-muted" strokeWidth={2} />
        <p className="text-[11px] uppercase tracking-[0.10em] text-ink-muted font-semibold">
          {label}
        </p>
      </div>
      <p className="display text-[26px] leading-none num" style={{ color }}>
        {value}
      </p>
      {subtitle && (
        <p className="text-[10px] uppercase tracking-wider text-ink-quiet mt-1">
          {subtitle}
        </p>
      )}
    </div>
  );
}

/** Quando va mostrato il banner sulla Home? */
export function shouldPromptWeeklyReview(
  now: Date,
  lastReviewWeekStart?: string,
): boolean {
  const day = now.getDay(); // 0=Dom
  const hour = now.getHours();
  const currentWeekStart = weekStartISO(now);
  // Già fatto questa settimana → no
  if (lastReviewWeekStart === currentWeekStart) return false;
  // Mostra solo da Domenica 18:00 in poi (così l'utente ha tempo)
  if (day === 0 && hour >= 18) return true;
  // O da Lunedì come ritardatario, fino a fine lunedì
  if (day === 1) return true;
  return false;
}

/** Usage: import this and call when you need to know if user is missing it. */
export function lastReviewWeekStart(reviews: WeeklyReview[] | undefined): string | undefined {
  if (!reviews || reviews.length === 0) return undefined;
  return reviews.slice().sort((a, b) => b.weekStart.localeCompare(a.weekStart))[0]
    .weekStart;
}

// Mute unused warning for todayISO if not used elsewhere here
void todayISO;
