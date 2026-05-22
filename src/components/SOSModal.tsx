import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/database";
import { X, Trophy, Sparkles, Wind, ChevronRight } from "lucide-react";

type SosMood = "down" | "anxious" | "stuck" | "frustrated";

const MOODS: Array<{
  id: SosMood;
  emoji: string;
  label: string;
  color: string;
}> = [
  { id: "down", emoji: "🌧", label: "Giù di morale", color: "#8a9cff" },
  { id: "anxious", emoji: "⚡️", label: "Ansioso", color: "#ffd479" },
  { id: "stuck", emoji: "🌀", label: "Bloccato", color: "#5dd4c4" },
  { id: "frustrated", emoji: "🔥", label: "Frustrato", color: "#ff6b7a" },
];

const MICRO_ACTIONS: Record<SosMood, string[]> = {
  down: [
    "Vai a camminare 10 minuti, anche dentro casa.",
    "Chiama o scrivi a una persona della tua rete.",
    "Rileggi 1 vittoria recente. Quella feeling è tua, non sparisce.",
    "Esci di casa per qualsiasi motivo: cambiare scena prima, capire dopo.",
    "Spegni notifiche per 30 min. Fai qualcosa con le mani.",
  ],
  anxious: [
    "Respira 4-7-8 per 60 secondi: inspira 4, trattieni 7, espira 8.",
    "Scrivi 3 cose che PUOI controllare adesso. Ignora il resto.",
    "Acqua fredda sul viso, 30 secondi. Resetta il sistema nervoso.",
    "Esci 5 minuti, guarda lontano. Lo sguardo distante calma.",
    "Una micro-missione, la più piccola che hai. Falla subito.",
  ],
  stuck: [
    "Cambia posto fisico. Anche solo un'altra stanza.",
    "Apri una skill e completa 1 risorsa (anche solo 5 min di video).",
    "Scrivi quello su cui sei bloccato in 1 frase. Riguardala dopo.",
    "Fai la missione meno importante ma più rapida: rompi l'inerzia.",
    "Timer 25 min, una cosa sola, niente altro. Pomodoro.",
  ],
  frustrated: [
    "Pausa 10 minuti, nessuno schermo. Cammina o stira.",
    "Scrivi cosa esattamente ti frustra. Spesso non è quello che pensi.",
    "Esercizio fisico breve: 20 piegamenti, 1 minuto di plank, qualcosa.",
    "Domanda: 'Tra una settimana, mi importerà ancora di questo?'.",
    "Chiudi tutto, esci di casa 15 min. Solo dopo decidi.",
  ],
};

function pickRandom<T>(arr: T[]): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function SOSModal({ onClose }: { onClose: () => void }) {
  const laws = useLiveQuery(() => db.laws.toArray(), []);
  const victories = useLiveQuery(() => db.victories.toArray(), []);
  const vision = useLiveQuery(() => db.vision.get("main"), []);

  const [mood, setMood] = useState<SosMood | null>(null);
  const [nonce, setNonce] = useState(0);

  const law = useMemo(
    () => pickRandom(laws ?? []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [laws, mood, nonce],
  );
  const victory = useMemo(
    () => pickRandom(victories ?? []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [victories, mood, nonce],
  );
  const action = useMemo<string | null>(() => {
    if (!mood) return null;
    return pickRandom(MICRO_ACTIONS[mood]) ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mood, nonce]);

  const moodMeta = mood ? MOODS.find((m) => m.id === mood) : null;
  const orbColor = moodMeta?.color ?? "#FF8FA4";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-6 overflow-y-auto"
      style={{
        background: `radial-gradient(ellipse at center, ${orbColor}30 0%, rgba(2,2,5,0.96) 60%)`,
        backdropFilter: "blur(40px)",
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 24 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
        className="max-w-md w-full text-center my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {!mood ? (
          <MoodPicker onPick={setMood} onClose={onClose} />
        ) : (
          <Sequence
            mood={moodMeta!}
            victory={victory}
            law={law}
            action={action}
            visionText={vision?.text}
            onShuffle={() => setNonce((n) => n + 1)}
            onClose={onClose}
            onBack={() => setMood(null)}
          />
        )}
      </motion.div>
    </motion.div>
  );
}

function MoodPicker({
  onPick,
  onClose,
}: {
  onPick: (m: SosMood) => void;
  onClose: () => void;
}) {
  return (
    <>
      <p className="eyebrow text-accent mb-3">Sei qui. Respira.</p>
      <h2 className="display text-[30px] leading-tight mb-2 text-ink">
        Come stai adesso?
      </h2>
      <p className="text-ink-muted text-[14px] mb-8">
        Riconoscere lo stato è metà del lavoro.
      </p>
      <div className="grid grid-cols-2 gap-2.5 mb-8">
        {MOODS.map((m) => (
          <button
            key={m.id}
            onClick={() => onPick(m.id)}
            className="card !p-4 flex flex-col items-center gap-2 active:scale-95 transition-transform"
            style={{
              borderColor: `${m.color}40`,
              background: `${m.color}10`,
            }}
          >
            <span className="text-[28px]">{m.emoji}</span>
            <span className="text-[13px] font-semibold" style={{ color: m.color }}>
              {m.label}
            </span>
          </button>
        ))}
      </div>
      <button
        onClick={onClose}
        className="w-11 h-11 rounded-full glass-thin flex items-center justify-center mx-auto active:scale-90"
      >
        <X size={20} />
      </button>
    </>
  );
}

function Sequence({
  mood,
  victory,
  law,
  action,
  visionText,
  onShuffle,
  onClose,
  onBack,
}: {
  mood: (typeof MOODS)[number];
  victory: import("../types").Victory | undefined;
  law: import("../types").Law | undefined;
  action: string | null;
  visionText: string | undefined;
  onShuffle: () => void;
  onClose: () => void;
  onBack: () => void;
}) {
  return (
    <>
      <div className="flex items-center justify-center gap-2 mb-7">
        <button
          onClick={onBack}
          className="eyebrow text-ink-muted active:opacity-70"
        >
          ←
        </button>
        <p className="eyebrow" style={{ color: mood.color }}>
          {mood.emoji} {mood.label}
        </p>
      </div>

      {/* ── Vittoria pertinente ─────────────────────────────────────── */}
      {victory && (
        <div className="text-left mb-7">
          <p className="eyebrow mb-2 inline-flex items-center gap-1.5" style={{ color: "#FFD479" }}>
            <Trophy size={11} /> Ricorda
          </p>
          <h3 className="display text-[22px] leading-tight mb-1.5 text-ink">
            {victory.title}
          </h3>
          {victory.story && (
            <p className="text-[14px] text-ink-dim leading-relaxed line-clamp-4">
              {victory.story}
            </p>
          )}
        </div>
      )}

      {/* ── Legge ───────────────────────────────────────────────────── */}
      {law && (
        <div className="text-left mb-7 pt-6 border-t-[0.5px] border-white/12">
          <p className="eyebrow mb-2 inline-flex items-center gap-1.5 text-accent">
            <Sparkles size={11} /> Tua legge
          </p>
          <h3 className="display text-[22px] leading-tight mb-1.5 text-ink">
            {law.title}
          </h3>
          <p className="text-[14px] text-ink-dim leading-relaxed">
            {law.body}
          </p>
        </div>
      )}

      {/* ── Micro-azione ────────────────────────────────────────────── */}
      {action && (
        <div className="text-left mb-7 pt-6 border-t-[0.5px] border-white/12">
          <p
            className="eyebrow mb-2 inline-flex items-center gap-1.5"
            style={{ color: mood.color }}
          >
            <Wind size={11} /> Fai questo ora
          </p>
          <p className="text-[18px] text-ink leading-snug font-medium">
            {action}
          </p>
        </div>
      )}

      {/* ── Vision ───────────────────────────────────────────────────── */}
      {visionText && (
        <div className="text-left mb-7 pt-6 border-t-[0.5px] border-white/12">
          <p className="eyebrow mb-2" style={{ color: "#C4A8FF" }}>
            Perché lo fai
          </p>
          <p className="text-[13.5px] text-ink-muted italic leading-relaxed">
            {visionText}
          </p>
        </div>
      )}

      {/* ── Azioni ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-3 mt-2">
        <button
          onClick={onShuffle}
          className="glass-thin rounded-full px-4 py-2 text-[12.5px] font-medium inline-flex items-center gap-1.5 active:scale-95 transition-transform"
        >
          <ChevronRight size={13} /> Altra combinazione
        </button>
        <button
          onClick={onClose}
          className="w-11 h-11 rounded-full glass-thin flex items-center justify-center active:scale-90"
        >
          <X size={20} />
        </button>
      </div>
    </>
  );
}
