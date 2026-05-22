import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../db/database";
import Layout from "../components/Layout";
import { Sheet } from "./Missions";
import { uid } from "../lib/date";
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  X,
  Trophy,
  Compass,
  Pencil,
} from "lucide-react";
import type { Victory } from "../types";

type View = "laws" | "vision" | "victories";

export default function Motivation() {
  const laws = useLiveQuery(() => db.laws.toArray(), []);
  const vision = useLiveQuery(() => db.vision.get("main"), []);
  const victories = useLiveQuery(() => db.victories.toArray(), []);
  const [view, setView] = useState<View>("laws");
  const [lawIdx, setLawIdx] = useState(0);
  const [sosOpen, setSosOpen] = useState(false);
  const [editingVision, setEditingVision] = useState(false);
  const [visionText, setVisionText] = useState("");
  const [victorySheet, setVictorySheet] = useState<
    { mode: "new" } | { mode: "edit"; victory: Victory } | null
  >(null);
  const [sosNonce, setSosNonce] = useState(0);

  const sortedLaws = useMemo(
    () => (laws ?? []).slice().sort((a, b) => a.order - b.order),
    [laws],
  );

  function prevLaw() {
    setLawIdx((i) => (i - 1 + sortedLaws.length) % sortedLaws.length);
  }
  function nextLaw() {
    setLawIdx((i) => (i + 1) % sortedLaws.length);
  }

  const sosLaw = useMemo(() => {
    if (sortedLaws.length === 0) return null;
    return sortedLaws[Math.floor(Math.random() * sortedLaws.length)];
  }, [sortedLaws, sosNonce]);

  async function saveVision() {
    await db.vision.update("main", {
      text: visionText,
      updatedAt: Date.now(),
    });
    setEditingVision(false);
  }

  async function deleteVictory(id: string) {
    await db.victories.delete(id);
  }

  return (
    <Layout title="Motivation">
      <div className="mb-5 mt-1">
        <h1 className="display text-[36px] leading-none text-ink">Motivation</h1>
        <p className="text-ink-muted text-[13px] mt-1.5">
          Le tue leggi, la tua visione
        </p>
      </div>

      {/* ── Switch segmented ─────────────────────────────────────────── */}
      <div className="glass-thin rounded-2xl p-1 flex gap-0.5 mb-5">
        {(
          [
            { id: "laws" as View, label: "Leggi", icon: Sparkles },
            { id: "vision" as View, label: "Visione", icon: Compass },
            { id: "victories" as View, label: "Vittorie", icon: Trophy },
          ]
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className={`flex-1 py-2 rounded-xl text-[13px] font-medium inline-flex items-center justify-center gap-1.5 transition-all ${
              view === id ? "bg-white/15 text-ink" : "text-ink-muted active:scale-95"
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* ── LEGGI ─────────────────────────────────────────────────────── */}
      {view === "laws" && sortedLaws.length > 0 && (
        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={sortedLaws[lawIdx].id}
              initial={{ opacity: 0, x: 40, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -40, scale: 0.96 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="card !p-7 min-h-[360px] flex flex-col relative overflow-hidden"
            >
              <div
                className="absolute -top-32 -right-32 w-72 h-72 rounded-full opacity-40 blur-3xl pointer-events-none"
                style={{ background: "#b9a4ff" }}
              />
              <div className="relative">
                <p className="eyebrow num" style={{ color: "#b9a4ff" }}>
                  Legge {String(lawIdx + 1).padStart(2, "0")} / {String(sortedLaws.length).padStart(2, "0")}
                </p>
                <h2 className="display text-[30px] leading-tight mt-3 text-ink">
                  {sortedLaws[lawIdx].title}
                </h2>
                <p className="text-[16px] text-ink-dim mt-4 leading-relaxed">
                  {sortedLaws[lawIdx].body}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-between mt-4 px-1">
            <button
              onClick={prevLaw}
              className="w-11 h-11 rounded-full glass-thin flex items-center justify-center active:scale-90 transition-transform"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex gap-1.5">
              {sortedLaws.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setLawIdx(i)}
                  className="rounded-full transition-all"
                  style={{
                    width: i === lawIdx ? 20 : 6,
                    height: 6,
                    background:
                      i === lawIdx ? "#b9a4ff" : "rgba(255,255,255,0.15)",
                  }}
                />
              ))}
            </div>
            <button
              onClick={nextLaw}
              className="w-11 h-11 rounded-full glass-thin flex items-center justify-center active:scale-90 transition-transform"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}

      {/* ── VISIONE ───────────────────────────────────────────────────── */}
      {view === "vision" && (
        <div className="card !p-7 min-h-[320px] relative overflow-hidden">
          <div
            className="absolute -top-32 -left-32 w-72 h-72 rounded-full opacity-40 blur-3xl pointer-events-none"
            style={{ background: "#C4A8FF" }}
          />
          <p className="eyebrow relative" style={{ color: "#C4A8FF" }}>
            Visione · 10 anni
          </p>
          {editingVision ? (
            <div className="relative mt-4">
              <textarea
                autoFocus
                value={visionText}
                onChange={(e) => setVisionText(e.target.value)}
                rows={9}
                className="input w-full resize-none text-[16px] leading-relaxed"
              />
              <div className="grid grid-cols-2 gap-2 mt-3">
                <button
                  onClick={() => setEditingVision(false)}
                  className="btn-ghost"
                >
                  Annulla
                </button>
                <button onClick={saveVision} className="btn-primary">
                  Salva
                </button>
              </div>
            </div>
          ) : (
            <div className="relative">
              <p className="text-[16.5px] leading-relaxed text-ink mt-4 whitespace-pre-wrap">
                {vision?.text || "Scrivi la tua visione…"}
              </p>
              <button
                onClick={() => {
                  setVisionText(vision?.text ?? "");
                  setEditingVision(true);
                }}
                className="btn-ghost mt-5 text-[13px]"
              >
                Modifica
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── VITTORIE ──────────────────────────────────────────────────── */}
      {view === "victories" && (
        <>
          <ul className="space-y-2">
            {(victories ?? [])
              .slice()
              .sort((a, b) => b.at - a.at)
              .map((v, i) => (
                <motion.li
                  key={v.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.03 }}
                  className="card relative overflow-hidden"
                >
                  <div
                    className="absolute -top-16 -right-16 w-32 h-32 rounded-full opacity-25 blur-2xl pointer-events-none"
                    style={{ background: "#FFD479" }}
                  />
                  <div className="flex items-start justify-between gap-2 relative">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Trophy size={14} style={{ color: "#FFD479" }} />
                        <h4 className="text-[15.5px] font-semibold">{v.title}</h4>
                      </div>
                      <p className="text-[11px] text-ink-muted num mb-2 uppercase tracking-wider">
                        {new Date(v.at).toLocaleDateString("it-IT", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                      <p className="text-[14px] text-ink-dim whitespace-pre-wrap leading-relaxed">
                        {v.story}
                      </p>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => setVictorySheet({ mode: "edit", victory: v })}
                        className="p-1.5 text-ink-quiet active:scale-90"
                        aria-label="Modifica vittoria"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => deleteVictory(v.id)}
                        className="p-1.5 text-ink-quiet active:scale-90"
                        aria-label="Cancella vittoria"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </motion.li>
              ))}
            {(!victories || victories.length === 0) && (
              <div className="card text-center text-ink-muted text-[14px] py-10">
                Aggiungi i momenti in cui ce l'hai fatta.
                <br />
                <span className="text-ink-quiet text-[12px]">
                  Da rileggere nei giorni neri.
                </span>
              </div>
            )}
          </ul>
          <button
            onClick={() => setVictorySheet({ mode: "new" })}
            className="fixed right-5 z-30 w-14 h-14 rounded-full bg-white text-bg-deep flex items-center justify-center active:scale-90 transition-transform"
            style={{
              bottom: "calc(env(safe-area-inset-bottom) + 96px)",
              boxShadow: "0 12px 32px rgba(0,0,0,0.45), 0 0 0 0.5px rgba(255,255,255,0.4) inset, 0 1px 0 rgba(255,255,255,0.6) inset",
            }}
          >
            <Plus size={26} strokeWidth={2.5} />
          </button>
        </>
      )}

      {/* ── SOS bottone (sempre visibile) ─────────────────────────────── */}
      {view !== "victories" && (
        <button
          onClick={() => {
            setSosNonce((n) => n + 1);
            setSosOpen(true);
          }}
          className="fixed left-1/2 -translate-x-1/2 z-30 px-6 py-3.5 rounded-full font-bold text-[13px] tracking-wider inline-flex items-center gap-2 transition-all active:scale-95"
          style={{
            bottom: "calc(env(safe-area-inset-bottom) + 96px)",
            background: "linear-gradient(180deg, #FF8FA4, #FF5C75)",
            color: "#fff",
            boxShadow: "0 12px 28px rgba(255,92,117,0.45), inset 0 1px 0 rgba(255,255,255,0.3)",
          }}
        >
          <Sparkles size={16} strokeWidth={2.4} /> SOS
        </button>
      )}

      {/* ── SOS modal ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {sosOpen && sosLaw && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-7"
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(255,143,164,0.25) 0%, rgba(2,2,5,0.95) 60%)",
              backdropFilter: "blur(40px)",
            }}
            onClick={() => setSosOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 26 }}
              className="max-w-md text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="eyebrow text-accent mb-6">Respira. Ricorda.</p>
              <h2 className="display text-[34px] leading-tight mb-5 text-ink">
                {sosLaw.title}
              </h2>
              <p className="text-[17px] text-ink-dim mb-10 leading-relaxed">
                {sosLaw.body}
              </p>
              {vision?.text && (
                <div className="pt-7 border-t-[0.5px] border-white/15">
                  <p
                    className="eyebrow mb-3"
                    style={{ color: "#C4A8FF" }}
                  >
                    Perché lo fai
                  </p>
                  <p className="text-[14.5px] text-ink-dim italic leading-relaxed">
                    {vision.text}
                  </p>
                </div>
              )}
              <button
                onClick={() => setSosOpen(false)}
                className="mt-10 w-11 h-11 rounded-full glass-thin flex items-center justify-center mx-auto active:scale-90"
              >
                <X size={20} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {victorySheet && (
        <VictorySheet
          victory={victorySheet.mode === "edit" ? victorySheet.victory : undefined}
          onClose={() => setVictorySheet(null)}
        />
      )}
    </Layout>
  );
}

function VictorySheet({
  victory,
  onClose,
}: {
  victory?: Victory;
  onClose: () => void;
}) {
  const editing = !!victory;
  const [title, setTitle] = useState(victory?.title ?? "");
  const [story, setStory] = useState(victory?.story ?? "");

  async function save() {
    if (!title.trim()) return;
    if (editing && victory) {
      await db.victories.update(victory.id, {
        title: title.trim(),
        story: story.trim(),
      });
    } else {
      await db.victories.add({
        id: uid("v-"),
        title: title.trim(),
        story: story.trim(),
        at: Date.now(),
      });
    }
    onClose();
  }

  return (
    <Sheet
      onClose={onClose}
      title={editing ? "Modifica vittoria" : "Nuova vittoria"}
      orb="#FFD479"
    >
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Cosa hai vinto?"
        className="input w-full mb-3"
      />
      <textarea
        value={story}
        onChange={(e) => setStory(e.target.value)}
        placeholder="Racconta com'è andata. Cosa hai sentito? Cosa hai imparato?"
        rows={6}
        className="input w-full mb-5 resize-none text-[14.5px] leading-relaxed"
      />
      <div className="grid grid-cols-2 gap-2">
        <button onClick={onClose} className="btn-ghost">Annulla</button>
        <button onClick={save} className="btn-primary">Salva</button>
      </div>
    </Sheet>
  );
}
