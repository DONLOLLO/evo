import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../db/database";
import Layout from "../components/Layout";
import { Sheet } from "./Missions";
import { uid, todayISO, shiftDate, isoToShort, daysBetween } from "../lib/date";
import {
  Plus,
  MessageCircle,
  Phone,
  Mail,
  Coffee,
  MoreHorizontal,
  Check,
  RotateCw,
  Trash2,
  Pencil,
  Users,
} from "lucide-react";
import type { Person, Touchpoint, TouchChannel } from "../types";

const channelIcons: Record<TouchChannel, React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>> = {
  message: MessageCircle,
  call: Phone,
  email: Mail,
  "in-person": Coffee,
  other: MoreHorizontal,
};

const channelLabels: Record<TouchChannel, string> = {
  message: "Messaggio",
  call: "Chiamata",
  email: "Email",
  "in-person": "Di persona",
  other: "Altro",
};

const channelTints: Record<TouchChannel, string> = {
  message: "#5dd4c4",
  call: "#FFD479",
  email: "#8FB8FF",
  "in-person": "#FFB088",
  other: "rgba(255,255,255,0.5)",
};

type Group = { key: string; label: string; items: Touchpoint[] };

export default function Rete() {
  const touchpoints = useLiveQuery(() => db.touchpoints.toArray(), []);
  const people = useLiveQuery(() => db.people.toArray(), []);
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<Touchpoint | null>(null);
  const [showPeopleSheet, setShowPeopleSheet] = useState(false);
  const today = todayISO();

  const groups: Group[] = useMemo(() => {
    if (!touchpoints) return [];
    const open = touchpoints.filter((t) => !t.done);
    const sorted = [...open].sort((a, b) =>
      a.dueDate.localeCompare(b.dueDate),
    );
    const out: Record<string, Touchpoint[]> = {
      overdue: [],
      today: [],
      tomorrow: [],
      week: [],
      later: [],
    };
    for (const t of sorted) {
      const diff = daysBetween(today, t.dueDate);
      if (diff < 0) out.overdue.push(t);
      else if (diff === 0) out.today.push(t);
      else if (diff === 1) out.tomorrow.push(t);
      else if (diff <= 7) out.week.push(t);
      else out.later.push(t);
    }
    const labels: Record<string, string> = {
      overdue: "In ritardo",
      today: "Oggi",
      tomorrow: "Domani",
      week: "Questa settimana",
      later: "Più avanti",
    };
    return Object.entries(out)
      .filter(([, items]) => items.length > 0)
      .map(([key, items]) => ({ key, label: labels[key], items }));
  }, [touchpoints, today]);

  const totalOpen = touchpoints?.filter((t) => !t.done).length ?? 0;
  const done = touchpoints?.filter((t) => t.done).length ?? 0;

  async function markDone(t: Touchpoint) {
    await db.touchpoints.update(t.id, { done: true, doneAt: Date.now() });
  }
  async function postpone(t: Touchpoint, days: number) {
    await db.touchpoints.update(t.id, { dueDate: shiftDate(t.dueDate, days) });
  }
  async function remove(id: string) {
    await db.touchpoints.delete(id);
  }

  return (
    <Layout title="Rete">
      <div className="mb-5 mt-1 flex items-start justify-between gap-3">
        <div>
          <h1 className="display text-[36px] leading-none text-ink">Rete</h1>
          <p className="text-ink-muted text-[13px] mt-1.5">
            Chi devo sentire, e quando · {totalOpen} aperti · {done} chiusi
          </p>
        </div>
        <button
          onClick={() => setShowPeopleSheet(true)}
          className="glass-thin rounded-full px-3 py-2 text-[12px] font-medium inline-flex items-center gap-1.5 active:scale-95 transition-transform"
          aria-label="Persone"
        >
          <Users size={14} />
          {(people ?? []).length}
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="card text-center text-ink-muted text-[14px] py-12">
          Nessun follow-up.
          <br />
          <span className="text-ink-quiet text-[12px]">
            Aggiungi una persona da sentire con il bottone +
          </span>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.key}>
              <h3
                className={`eyebrow mb-3 px-1 ${
                  g.key === "overdue"
                    ? "text-prio-high"
                    : g.key === "today"
                      ? "text-accent"
                      : ""
                }`}
              >
                {g.label} · {g.items.length}
              </h3>
              <ul className="space-y-2">
                <AnimatePresence initial={false}>
                  {g.items.map((t, i) => {
                    const person = people?.find((p) => p.id === t.personId);
                    const Icon = channelIcons[t.channel];
                    const tint = channelTints[t.channel];
                    return (
                      <motion.li
                        key={t.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{
                          duration: 0.25,
                          delay: Math.min(i * 0.02, 0.15),
                        }}
                        className="card flex items-start gap-3.5 relative overflow-hidden"
                      >
                        <div
                          className="absolute -top-12 -right-12 w-24 h-24 rounded-full opacity-20 blur-2xl pointer-events-none"
                          style={{ background: tint }}
                        />
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 relative"
                          style={{
                            background: `${tint}1f`,
                            border: `0.5px solid ${tint}55`,
                          }}
                        >
                          <Icon size={16} className="text-ink" />
                        </div>
                        <div className="flex-1 min-w-0 relative">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <p className="text-[15.5px] font-semibold text-ink leading-tight">
                              {person?.name ?? "—"}
                            </p>
                            {person?.role && (
                              <span className="text-[11.5px] text-ink-muted">
                                {person.role}
                              </span>
                            )}
                          </div>
                          <p
                            className="text-[10.5px] uppercase font-semibold tracking-[0.12em] mt-1"
                            style={{ color: tint }}
                          >
                            {channelLabels[t.channel]} · {isoToShort(t.dueDate)}
                          </p>
                          {t.message && (
                            <p className="text-[13.5px] text-ink-dim mt-1.5 leading-snug">
                              {t.message}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-3">
                            <button
                              onClick={() => markDone(t)}
                              className="glass-thin rounded-full px-3 py-1.5 text-[11.5px] font-semibold inline-flex items-center gap-1 active:scale-95 transition-transform"
                              style={{
                                background: "rgba(48,209,88,0.10)",
                                borderColor: "rgba(48,209,88,0.40)",
                                color: "#30D158",
                              }}
                            >
                              <Check size={12} strokeWidth={2.5} /> Fatto
                            </button>
                            <button
                              onClick={() => postpone(t, 1)}
                              className="glass-thin rounded-full px-3 py-1.5 text-[11.5px] font-semibold inline-flex items-center gap-1 active:scale-95 transition-transform"
                            >
                              <RotateCw size={11} strokeWidth={2.5} /> +1g
                            </button>
                            <button
                              onClick={() => setEditing(t)}
                              className="p-1.5 text-ink-quiet active:scale-90"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => remove(t.id)}
                              className="p-1.5 text-ink-quiet active:scale-90"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
            </section>
          ))}
        </div>
      )}

      <button
        onClick={() => setShowNew(true)}
        className="fixed right-5 z-30 w-14 h-14 rounded-full bg-white text-bg-deep flex items-center justify-center active:scale-90 transition-transform"
        style={{
          bottom: "calc(env(safe-area-inset-bottom) + 96px)",
          boxShadow:
            "0 12px 32px rgba(0,0,0,0.45), 0 0 0 0.5px rgba(255,255,255,0.4) inset, 0 1px 0 rgba(255,255,255,0.6) inset",
        }}
        aria-label="Nuovo follow-up"
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>

      {(showNew || editing) && (
        <TouchpointSheet
          touchpoint={editing}
          people={people ?? []}
          onClose={() => {
            setShowNew(false);
            setEditing(null);
          }}
        />
      )}

      {showPeopleSheet && (
        <PeopleSheet
          people={people ?? []}
          touchpoints={touchpoints ?? []}
          onClose={() => setShowPeopleSheet(false)}
        />
      )}
    </Layout>
  );
}

function TouchpointSheet({
  touchpoint,
  people,
  onClose,
}: {
  touchpoint: Touchpoint | null;
  people: Person[];
  onClose: () => void;
}) {
  const isEdit = !!touchpoint;
  const initialPerson = people.find((p) => p.id === touchpoint?.personId);
  const [personSearch, setPersonSearch] = useState(initialPerson?.name ?? "");
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(
    initialPerson?.id ?? null,
  );
  const [dueDate, setDueDate] = useState(touchpoint?.dueDate ?? todayISO());
  const [channel, setChannel] = useState<TouchChannel>(
    touchpoint?.channel ?? "message",
  );
  const [message, setMessage] = useState(touchpoint?.message ?? "");
  const [newPersonRole, setNewPersonRole] = useState("");

  const trimmed = personSearch.trim();
  const matched = useMemo(
    () =>
      trimmed.length === 0
        ? []
        : people.filter((p) =>
            p.name.toLowerCase().includes(trimmed.toLowerCase()),
          ),
    [people, trimmed],
  );
  const exact = people.find(
    (p) => p.name.toLowerCase() === trimmed.toLowerCase(),
  );
  const showCreateOption =
    !isEdit && trimmed.length > 0 && !exact && !selectedPersonId;

  async function save() {
    if (!trimmed) return;
    let personId = selectedPersonId;
    if (!personId) {
      if (exact) {
        personId = exact.id;
      } else {
        personId = uid("p-");
        const person: Person = {
          id: personId,
          name: trimmed,
          role: newPersonRole.trim() || undefined,
          channel,
          createdAt: Date.now(),
        };
        await db.people.add(person);
      }
    }
    if (isEdit) {
      await db.touchpoints.update(touchpoint!.id, {
        personId,
        dueDate,
        channel,
        message: message.trim() || undefined,
      });
    } else {
      await db.touchpoints.add({
        id: uid("tp-"),
        personId,
        dueDate,
        channel,
        message: message.trim() || undefined,
        done: false,
        createdAt: Date.now(),
      });
    }
    onClose();
  }

  return (
    <Sheet onClose={onClose} title={isEdit ? "Modifica follow-up" : "Nuovo follow-up"} orb="#5dd4c4">
      <p className="eyebrow mb-2">Persona</p>
      <input
        autoFocus={!isEdit}
        value={personSearch}
        onChange={(e) => {
          setPersonSearch(e.target.value);
          setSelectedPersonId(null);
        }}
        placeholder="Nome (es. Giuseppe Lupi)"
        className="input w-full mb-2"
      />
      {matched.length > 0 && !selectedPersonId && !exact && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {matched.slice(0, 6).map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setSelectedPersonId(p.id);
                setPersonSearch(p.name);
              }}
              className="chip"
            >
              {p.name}
            </button>
          ))}
        </div>
      )}
      {showCreateOption && (
        <input
          value={newPersonRole}
          onChange={(e) => setNewPersonRole(e.target.value)}
          placeholder="Ruolo / contesto (opzionale)"
          className="input w-full mb-2"
        />
      )}

      <p className="eyebrow mb-2 mt-3">Canale</p>
      <div className="grid grid-cols-5 gap-1.5 mb-3">
        {(Object.keys(channelLabels) as TouchChannel[]).map((c) => {
          const Icon = channelIcons[c];
          const active = channel === c;
          return (
            <button
              key={c}
              onClick={() => setChannel(c)}
              className="py-3 rounded-2xl border-[0.5px] flex flex-col items-center gap-1 transition-all"
              style={
                active
                  ? {
                      background: `${channelTints[c]}22`,
                      borderColor: `${channelTints[c]}80`,
                      color: channelTints[c],
                    }
                  : {
                      background: "rgba(255,255,255,0.04)",
                      borderColor: "rgba(255,255,255,0.10)",
                      color: "rgba(255,255,255,0.55)",
                    }
              }
            >
              <Icon size={16} />
              <span className="text-[9px] uppercase tracking-wider font-semibold">
                {channelLabels[c].slice(0, 4)}
              </span>
            </button>
          );
        })}
      </div>

      <p className="eyebrow mb-2 mt-3">Data</p>
      <div className="flex gap-2 mb-3">
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="input flex-1 num"
        />
        <button
          onClick={() => setDueDate(todayISO())}
          className="chip"
        >
          Oggi
        </button>
        <button
          onClick={() => setDueDate(shiftDate(todayISO(), 1))}
          className="chip"
        >
          Domani
        </button>
      </div>

      <p className="eyebrow mb-2 mt-3">Contesto</p>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Cosa devi dire/chiedere? Es. sollecitare riunione commerciali"
        rows={3}
        className="input w-full mb-5 resize-none"
      />

      <div className="grid grid-cols-2 gap-2">
        <button onClick={onClose} className="btn-ghost">
          Annulla
        </button>
        <button onClick={save} className="btn-primary">
          {isEdit ? "Aggiorna" : "Salva"}
        </button>
      </div>
    </Sheet>
  );
}

function PeopleSheet({
  people,
  touchpoints,
  onClose,
}: {
  people: Person[];
  touchpoints: Touchpoint[];
  onClose: () => void;
}) {
  async function remove(id: string) {
    if (touchpoints.some((t) => t.personId === id && !t.done)) return;
    await db.people.delete(id);
  }
  const sorted = [...people].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Sheet onClose={onClose} title={`Persone · ${people.length}`} orb="#b9a4ff">
      {sorted.length === 0 ? (
        <div className="text-center text-ink-muted text-[14px] py-8">
          Nessuna persona ancora.
          <br />
          <span className="text-ink-quiet text-[12px]">
            Le persone si aggiungono creando un follow-up.
          </span>
        </div>
      ) : (
        <ul className="space-y-1.5 max-h-[60vh] overflow-y-auto -mx-1 px-1">
          {sorted.map((p) => {
            const openCount = touchpoints.filter(
              (t) => t.personId === p.id && !t.done,
            ).length;
            return (
              <li
                key={p.id}
                className="card !p-3.5 flex items-center justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[14.5px] font-semibold text-ink">
                    {p.name}
                  </p>
                  {p.role && (
                    <p className="text-[12px] text-ink-muted mt-0.5">
                      {p.role}
                    </p>
                  )}
                </div>
                {openCount > 0 && (
                  <span className="chip num text-accent" style={{ borderColor: "rgba(185,164,255,0.4)", background: "rgba(185,164,255,0.10)" }}>
                    {openCount}
                  </span>
                )}
                <button
                  onClick={() => remove(p.id)}
                  className="p-1.5 text-ink-quiet active:scale-90"
                  disabled={openCount > 0}
                >
                  <Trash2 size={13} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Sheet>
  );
}
