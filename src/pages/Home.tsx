import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../db/database";
import Layout from "../components/Layout";
import { todayISO, currentWeekday, timeOfDay, dayName, daysBetween, uid, weekStartISO } from "../lib/date";
import { useAppStore } from "../stores/useAppStore";
import WeeklyReviewSheet, {
  shouldPromptWeeklyReview,
  lastReviewWeekStart,
} from "../components/WeeklyReviewSheet";
import { Check, ChevronRight, Moon, Sun, Sunrise, Target, Flame, MessageCircle, Phone, Mail, Coffee, MoreHorizontal, Network } from "lucide-react";
import type { Mission, Mood, TouchChannel, Challenge, ChallengeStatus } from "../types";

const channelIcons: Record<TouchChannel, React.ComponentType<{ size?: number; className?: string }>> = {
  message: MessageCircle,
  call: Phone,
  email: Mail,
  "in-person": Coffee,
  other: MoreHorizontal,
};

const channelTints: Record<TouchChannel, string> = {
  message: "#5dd4c4",
  call: "#FFD479",
  email: "#8FB8FF",
  "in-person": "#FFB088",
  other: "rgba(255,255,255,0.5)",
};

const priorityWeight: Record<Mission["priority"], number> = {
  high: 0,
  mid: 1,
  low: 2,
};

const priorityHue: Record<Mission["priority"], string> = {
  high: "#FF6B7A",
  mid: "#FFC857",
  low: "rgba(255,255,255,0.35)",
};

const priorityLabel: Record<Mission["priority"], string> = {
  high: "Prioritaria",
  mid: "Importante",
  low: "Quando si può",
};

export default function Home() {
  const tod = timeOfDay();
  const today = todayISO();
  const wd = currentWeekday();
  const settings = useAppStore((s) => s.settings);
  const incrementStreak = useAppStore((s) => s.incrementStreak);

  const missions = useLiveQuery(() => db.missions.toArray(), []);
  const blocks = useLiveQuery(() => db.routineBlocks.toArray(), []);
  const checks = useLiveQuery(
    () => db.routineChecks.where("date").equals(today).toArray(),
    [today],
  );
  const laws = useLiveQuery(() => db.laws.toArray(), []);
  const checkin = useLiveQuery(
    () => db.checkins.where("date").equals(today).first(),
    [today],
  );
  const challenges = useLiveQuery(() => db.challenges.toArray(), []);
  const challengeLogs = useLiveQuery(() => db.challengeLogs.toArray(), []);
  const touchpoints = useLiveQuery(() => db.touchpoints.toArray(), []);
  const people = useLiveQuery(() => db.people.toArray(), []);
  const weeklyReviews = useLiveQuery(() => db.weeklyReviews.toArray(), []);
  const [reviewOpen, setReviewOpen] = useState(false);

  const showReviewBanner = useMemo(
    () =>
      shouldPromptWeeklyReview(new Date(), lastReviewWeekStart(weeklyReviews)),
    [weeklyReviews],
  );
  const currentWeekStart = weekStartISO();

  // Sfide attive
  const activeChallenge = useMemo(() => {
    if (!challenges) return null;
    const active = challenges.filter(
      (c) => c.active && today >= c.startDate && today <= c.endDate,
    );
    return active[0] ?? null;
  }, [challenges, today]);

  // Follow-up oggi (+ in ritardo)
  const followupsForToday = useMemo(() => {
    if (!touchpoints) return [];
    return touchpoints
      .filter((t) => !t.done && t.dueDate <= today)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 3);
  }, [touchpoints, today]);

  const todayBlocks = useMemo(
    () =>
      (blocks ?? [])
        .filter((b) => b.days.includes(wd as 0 | 1 | 2 | 3 | 4 | 5 | 6))
        .sort((a, b) => {
          if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
          return a.order - b.order;
        }),
    [blocks, wd],
  );

  const topMissions = useMemo(() => {
    const list = (missions ?? []).filter((m) => !m.done);
    list.sort((a, b) => {
      if (a.pinnedForDate === today && b.pinnedForDate !== today) return -1;
      if (b.pinnedForDate === today && a.pinnedForDate !== today) return 1;
      const dp = priorityWeight[a.priority] - priorityWeight[b.priority];
      if (dp !== 0) return dp;
      return a.order - b.order;
    });
    return list.slice(0, 3);
  }, [missions, today]);

  const blocksDone = (checks ?? []).filter((c) => c.done).length;
  const blocksTotal = todayBlocks.length;
  const missionsTotal = (missions ?? []).length;
  const missionsDone = (missions ?? []).filter((m) => m.done).length;

  const dailyLaw = useMemo(() => {
    if (!laws || laws.length === 0) return null;
    const idx = new Date(today).getDate() % laws.length;
    return laws[idx];
  }, [laws, today]);

  // Date formatting
  const now = new Date();
  const dateStr = now.toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
  });

  const greeting =
    tod === "morning" ? "Buongiorno" : tod === "evening" ? "Buonasera" : "Bentornato";

  const todIcon =
    tod === "morning" ? Sun : tod === "evening" ? Moon : Sunrise;
  const TodIcon = todIcon;
  const todTint =
    tod === "morning" ? "#FFD479" : tod === "evening" ? "#C4A8FF" : "#FFB088";

  async function toggleBlock(blockId: string) {
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

  async function completeMission(id: string) {
    await db.missions.update(id, { done: true, doneAt: Date.now() });
  }

  return (
    <Layout title="Oggi">
      {/* ── HERO — saluto editoriale ─────────────────────────────────── */}
      <section className="mb-7 mt-2 animate-rise">
        <p className="eyebrow flex items-center gap-1.5">
          <TodIcon size={12} style={{ color: todTint }} />
          {dayName(wd)} · {dateStr}
        </p>
        <h1 className="display text-[44px] leading-[1.05] mt-2 text-ink">
          {greeting}.
        </h1>
        {tod === "evening" && !checkin && (
          <p className="text-ink-dim text-[15px] mt-2 leading-snug">
            È ora di chiudere la giornata.
          </p>
        )}
      </section>

      {/* ── BANNER REVIEW SETTIMANALE (domenica sera / lunedì) ────────── */}
      {showReviewBanner && (
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => setReviewOpen(true)}
          className="card mb-6 relative overflow-hidden w-full text-left active:scale-[0.99] transition-transform"
          style={{ borderColor: "rgba(185,164,255,0.45)" }}
        >
          <div
            className="absolute -top-16 -right-16 w-44 h-44 rounded-full opacity-30 blur-3xl pointer-events-none"
            style={{ background: "#b9a4ff" }}
          />
          <p className="eyebrow" style={{ color: "#b9a4ff" }}>
            Review della settimana
          </p>
          <h2 className="display text-[22px] leading-tight mt-2 text-ink">
            Chiudi la settimana
          </h2>
          <p className="text-[13.5px] text-ink-dim mt-2 leading-relaxed">
            5 minuti per guardarti indietro e decidere cosa cambiare.
          </p>
        </motion.button>
      )}

      {/* ── LEGGE DEL GIORNO — card editoriale ───────────────────────── */}
      {dailyLaw && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="card mb-6 relative overflow-hidden"
        >
          <div
            className="absolute -top-20 -right-20 w-48 h-48 rounded-full opacity-30 blur-3xl pointer-events-none"
            style={{ background: "#b9a4ff" }}
          />
          <p className="eyebrow" style={{ color: "#b9a4ff" }}>
            Legge del giorno
          </p>
          <h2 className="display text-[22px] leading-tight mt-2 text-ink">
            {dailyLaw.title}
          </h2>
          <p className="text-[15px] text-ink-dim mt-2 leading-relaxed">
            {dailyLaw.body}
          </p>
        </motion.section>
      )}

      {/* ── CHECK-IN SERALE ──────────────────────────────────────────── */}
      <AnimatePresence>
        {tod === "evening" && !checkin && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <EveningCheckin
              today={today}
              blocksDone={blocksDone}
              blocksTotal={blocksTotal}
              missionsDone={missionsDone}
              missionsTotal={missionsTotal}
              onClose={() => incrementStreak()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {tod === "evening" && checkin && (
        <div className="card mb-6 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-sys-green/20 flex items-center justify-center">
            <Check className="text-sys-green" size={18} strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-[15px] font-semibold">Giornata chiusa</p>
            <p className="text-[12px] text-ink-muted num">
              Streak {settings?.streakCount ?? 0} giorni
            </p>
          </div>
        </div>
      )}

      {/* ── SFIDA ATTIVA — tile prominente ─────────────────────────── */}
      {activeChallenge && (
        <ChallengeTile
          challenge={activeChallenge}
          todayLog={
            (challengeLogs ?? []).find(
              (l) => l.challengeId === activeChallenge.id && l.date === today,
            )
          }
        />
      )}

      {/* ── DA SENTIRE — follow-up oggi ────────────────────────────── */}
      {followupsForToday.length > 0 && (
        <section className="mb-7">
          <SectionHeader title="Da sentire" linkTo="/rete" />
          <div className="space-y-2">
            {followupsForToday.map((t) => {
              const person = people?.find((p) => p.id === t.personId);
              const Icon = channelIcons[t.channel];
              const tint = channelTints[t.channel];
              const overdue = t.dueDate < today;
              return (
                <Link
                  key={t.id}
                  to="/rete"
                  className="card flex items-center gap-3 active:scale-[0.98] transition-transform relative overflow-hidden"
                >
                  <div
                    className="absolute -top-10 -right-10 w-24 h-24 rounded-full opacity-20 blur-2xl pointer-events-none"
                    style={{ background: tint }}
                  />
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 relative"
                    style={{
                      background: `${tint}1f`,
                      border: `0.5px solid ${tint}55`,
                    }}
                  >
                    <Icon size={15} className="text-ink" />
                  </div>
                  <div className="flex-1 min-w-0 relative">
                    <p className="text-[15px] font-semibold text-ink leading-tight">
                      {person?.name ?? "—"}
                    </p>
                    {t.message && (
                      <p className="text-[12.5px] text-ink-muted mt-0.5 line-clamp-1">
                        {t.message}
                      </p>
                    )}
                  </div>
                  {overdue && (
                    <span className="chip text-prio-high text-[10px]" style={{ borderColor: "rgba(255,107,122,0.4)", background: "rgba(255,107,122,0.10)" }}>
                      ritardo
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── 3 MISSIONI DEL GIORNO ────────────────────────────────────── */}
      <section className="mb-7">
        <SectionHeader title="Missioni del giorno" linkTo="/missioni" />
        {topMissions.length === 0 ? (
          <EmptyTile message="Nessuna missione attiva." />
        ) : (
          <div className="space-y-2">
            {topMissions.map((m, i) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.1 + i * 0.05 }}
              >
                <button
                  onClick={() => completeMission(m.id)}
                  className="card w-full flex items-center gap-4 active:scale-[0.98] transition-transform text-left"
                >
                  <div
                    className="w-7 h-7 rounded-full border-2 flex-shrink-0"
                    style={{
                      borderColor: priorityHue[m.priority],
                      boxShadow: `0 0 12px ${priorityHue[m.priority]}40`,
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[10px] uppercase font-semibold tracking-[0.12em] mb-0.5"
                      style={{ color: priorityHue[m.priority] }}
                    >
                      {priorityLabel[m.priority]}
                    </p>
                    <p className="text-[15px] font-medium text-ink leading-snug">
                      {m.title}
                    </p>
                  </div>
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* ── ROUTINE DEL GIORNO ───────────────────────────────────────── */}
      <section className="mb-7">
        <SectionHeader title="Routine" linkTo="/routine" />
        {todayBlocks.length === 0 ? (
          <EmptyTile message="Nessun blocco oggi." />
        ) : (
          <div className="card !p-0 overflow-hidden">
            {todayBlocks.map((b, i) => {
              const check = (checks ?? []).find((c) => c.blockId === b.id);
              const done = !!check?.done;
              return (
                <div key={b.id}>
                  {i > 0 && <div className="hairline mx-5" />}
                  <button
                    onClick={() => toggleBlock(b.id)}
                    className="w-full flex items-center gap-3.5 px-5 py-3.5 active:bg-white/5 transition-colors text-left"
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center transition-all ${
                        done
                          ? "bg-sys-green"
                          : "border-[1.5px] border-white/30"
                      }`}
                      style={
                        done
                          ? { boxShadow: "0 0 16px rgba(48,209,88,0.45)" }
                          : undefined
                      }
                    >
                      {done && (
                        <Check size={14} strokeWidth={3} className="text-bg-deep" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-[15px] leading-tight ${
                          done
                            ? "text-ink-muted line-through"
                            : "text-ink font-medium"
                        }`}
                      >
                        {b.title}
                      </p>
                      {b.startTime && (
                        <p className="text-[11.5px] text-ink-muted num mt-0.5">
                          {b.startTime}
                          {b.endTime && ` — ${b.endTime}`}
                        </p>
                      )}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── STATISTICHE GIORNATA ─────────────────────────────────────── */}
      <section className="mb-2">
        <SectionHeader title="Oggi" />
        <div className="grid grid-cols-3 gap-2">
          <MiniStat
            value={`${blocksDone}/${blocksTotal}`}
            label="Routine"
          />
          <MiniStat
            value={`${missionsDone}/${missionsTotal}`}
            label="Missioni"
          />
          <MiniStat
            value={`${settings?.streakCount ?? 0}`}
            label="Streak"
            tint="#FF9F0A"
          />
        </div>
      </section>

      {reviewOpen && (
        <WeeklyReviewSheet
          weekStart={currentWeekStart}
          existing={(weeklyReviews ?? []).find(
            (w) => w.weekStart === currentWeekStart,
          )}
          onClose={() => setReviewOpen(false)}
        />
      )}
    </Layout>
  );
}

function SectionHeader({ title, linkTo }: { title: string; linkTo?: string }) {
  return (
    <div className="flex items-center justify-between mb-3 px-1">
      <h3 className="eyebrow">{title}</h3>
      {linkTo && (
        <a
          href={`#${linkTo}`}
          className="text-ink-muted active:scale-90 transition-transform"
        >
          <ChevronRight size={16} />
        </a>
      )}
    </div>
  );
}

function EmptyTile({ message }: { message: string }) {
  return (
    <div className="card text-center text-ink-muted text-[14px] py-7">
      {message}
    </div>
  );
}

function MiniStat({
  value,
  label,
  tint,
}: {
  value: string;
  label: string;
  tint?: string;
}) {
  return (
    <div className="card !p-4 text-center">
      <p
        className="display-num text-[28px] leading-none"
        style={{ color: tint ?? "#ffffff" }}
      >
        {value}
      </p>
      <p className="eyebrow mt-2 text-[10px]">{label}</p>
    </div>
  );
}

function EveningCheckin({
  today,
  blocksDone,
  blocksTotal,
  missionsDone,
  missionsTotal,
  onClose,
}: {
  today: string;
  blocksDone: number;
  blocksTotal: number;
  missionsDone: number;
  missionsTotal: number;
  onClose: () => void;
}) {
  const [mood, setMood] = useState<Mood | undefined>();
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await db.checkins.add({
      id: uid("ck-"),
      date: today,
      mood,
      note: note.trim() || undefined,
      blocksDone,
      blocksTotal,
      missionsDone,
      missionsTotal,
      closedAt: Date.now(),
    });
    onClose();
    setSaving(false);
  }

  return (
    <div className="card mb-6 relative overflow-hidden space-y-4">
      <div
        className="absolute -top-24 -left-24 w-56 h-56 rounded-full opacity-30 blur-3xl pointer-events-none"
        style={{ background: "#C4A8FF" }}
      />
      <div className="relative">
        <p className="eyebrow" style={{ color: "#C4A8FF" }}>
          Chiusura giornata
        </p>
        <h2 className="display text-[22px] mt-1 text-ink">Come è andata?</h2>
      </div>

      <div className="grid grid-cols-2 gap-2 relative">
        <Recap label="Routine" value={`${blocksDone}/${blocksTotal}`} />
        <Recap label="Missioni" value={`${missionsDone}/${missionsTotal}`} />
      </div>

      <div className="flex gap-2 relative">
        {(["great", "ok", "rough"] as Mood[]).map((m) => (
          <button
            key={m}
            onClick={() => setMood(m)}
            className={`flex-1 py-3 rounded-2xl text-[14px] font-medium transition-all border-[0.5px] ${
              mood === m
                ? "bg-white/15 border-white/25 text-ink"
                : "bg-white/[0.03] border-white/10 text-ink-dim active:scale-95"
            }`}
          >
            {m === "great" ? "💪  Bene" : m === "ok" ? "🟡  Ok" : "😔  Dura"}
          </button>
        ))}
      </div>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="Cosa porti a domani?"
        className="input w-full resize-none text-[14px] relative"
      />

      <button
        onClick={save}
        disabled={saving}
        className="btn-primary w-full disabled:opacity-50 relative"
      >
        {saving ? "…" : "Chiudi giornata"}
      </button>
    </div>
  );
}

function Recap({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl px-4 py-3 bg-white/[0.04] border-[0.5px] border-white/10">
      <p className="display-num text-[22px] leading-none">{value}</p>
      <p className="eyebrow mt-1 text-[10px]">{label}</p>
    </div>
  );
}

function ChallengeTile({
  challenge,
  todayLog,
}: {
  challenge: Challenge;
  todayLog?: { status: ChallengeStatus; reason?: string };
}) {
  const today = todayISO();
  const totalDays = Math.max(1, daysBetween(challenge.startDate, challenge.endDate) + 1);
  const dayN = Math.max(1, Math.min(totalDays, daysBetween(challenge.startDate, today) + 1));
  const tint = "#FFC857";

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.08 }}
      className="mb-6 relative"
    >
      <Link to="/routine" className="block relative">
        <div className="card relative overflow-hidden">
          <div
            className="absolute -top-24 -right-20 w-56 h-56 rounded-full opacity-35 blur-3xl pointer-events-none"
            style={{ background: tint }}
          />
          <div className="flex items-center gap-2 mb-1.5 relative">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{
                background: `${tint}22`,
                border: `0.5px solid ${tint}66`,
              }}
            >
              <Target size={14} style={{ color: tint }} />
            </div>
            <p className="eyebrow num" style={{ color: tint }}>
              Sfida · Giorno {dayN} / {totalDays}
            </p>
          </div>
          <h2 className="display text-[22px] leading-tight text-ink relative mb-2">
            {challenge.title}
          </h2>
          {challenge.goals.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3 relative">
              {challenge.goals.slice(0, 4).map((g, i) => (
                <span key={i} className="chip">
                  {g}
                </span>
              ))}
            </div>
          )}
          <div className="h-1.5 rounded-full bg-white/8 overflow-hidden relative">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(dayN / totalDays) * 100}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{ background: tint, boxShadow: `0 0 12px ${tint}80` }}
            />
          </div>
        </div>
      </Link>
      {!todayLog ? (
        <Link
          to="/routine"
          className="mt-2 btn-accent w-full inline-flex items-center justify-center gap-2"
        >
          <Flame size={16} /> Chiudi oggi
        </Link>
      ) : (
        <div
          className="mt-2 glass-thin rounded-2xl px-4 py-2.5 flex items-center justify-between text-[13px]"
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
          <Link to="/routine" className="text-[11.5px] underline">
            Modifica
          </Link>
        </div>
      )}
    </motion.section>
  );
}

// Unused warning suppression
void Network;
