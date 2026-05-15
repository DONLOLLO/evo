import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { motion } from "framer-motion";
import { db } from "../db/database";
import Layout from "../components/Layout";
import { Sheet } from "./Missions";
import { uid } from "../lib/date";
import { Plus, Trash2, Play, ChevronLeft, ChevronRight } from "lucide-react";
import type { RoadmapCard, RoadmapPhase, Area, Priority } from "../types";

const phases: { id: RoadmapPhase; label: string; sub: string; color: string }[] = [
  { id: "now", label: "Adesso", sub: "in corso", color: "#30D158" },
  { id: "soon", label: "A breve", sub: "settimane", color: "#FFD479" },
  { id: "months", label: "Prossimi mesi", sub: "1-3 mesi", color: "#FFB088" },
  { id: "year", label: "Quest'anno", sub: "entro 12 mesi", color: "#8FB8FF" },
  { id: "vision", label: "Visione", sub: "10 anni", color: "#C4A8FF" },
];

const phaseIdx: Record<RoadmapPhase, number> = {
  now: 0,
  soon: 1,
  months: 2,
  year: 3,
  vision: 4,
};

export default function Roadmap() {
  const cards = useLiveQuery(() => db.roadmap.toArray(), []);
  const areas = useLiveQuery(() => db.areas.toArray(), []);
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<RoadmapCard | null>(null);
  const [areaFilter, setAreaFilter] = useState<string>("all");

  const filteredCards = useMemo(() => {
    if (!cards) return [];
    return areaFilter === "all" ? cards : cards.filter((c) => c.areaId === areaFilter);
  }, [cards, areaFilter]);

  return (
    <Layout title="Rotta">
      <div className="mb-5 mt-1">
        <h1 className="display text-[36px] leading-none text-ink">Rotta</h1>
        <p className="text-ink-muted text-[13px] mt-1.5">
          Dove sta andando la tua vita, per area
        </p>
      </div>

      {/* ── Filtro area ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 mb-6 overflow-x-auto -mx-5 px-5 pb-1">
        <button
          onClick={() => setAreaFilter("all")}
          className={`chip whitespace-nowrap ${areaFilter === "all" ? "chip-active" : ""}`}
        >
          Tutte
        </button>
        {(areas ?? []).map((a) => (
          <button
            key={a.id}
            onClick={() => setAreaFilter(a.id)}
            className="chip whitespace-nowrap"
            style={{
              color: areaFilter === a.id ? a.color : "rgba(255,255,255,0.7)",
              background: areaFilter === a.id ? `${a.color}1a` : undefined,
              borderColor: areaFilter === a.id ? `${a.color}55` : undefined,
            }}
          >
            {a.name}
          </button>
        ))}
      </div>

      {/* ── Timeline verticale ───────────────────────────────────────── */}
      <div className="relative pl-6">
        {/* Linea-vetro continua */}
        <div
          className="absolute left-[7px] top-2 bottom-0 w-px"
          style={{
            background:
              "linear-gradient(to bottom, rgba(255,255,255,0.30), rgba(255,255,255,0.04))",
          }}
        />

        {phases.map((ph, phIdx) => {
          const phCards = filteredCards
            .filter((c) => c.phase === ph.id)
            .sort((a, b) => a.order - b.order);
          return (
            <section key={ph.id} className="relative mb-6">
              {/* Nodo timeline */}
              <div
                className="absolute -left-6 top-1 w-4 h-4 rounded-full"
                style={{
                  background: ph.color,
                  boxShadow: `0 0 16px ${ph.color}`,
                  border: "2px solid rgba(2,2,5,1)",
                }}
              />
              <div className="mb-3">
                <h3
                  className="text-[14px] font-bold tracking-tight-2"
                  style={{ color: ph.color }}
                >
                  {ph.label}
                </h3>
                <p className="text-[11px] text-ink-muted uppercase tracking-wider">
                  {ph.sub}
                </p>
              </div>
              {phCards.length === 0 ? (
                <div className="card !py-3 text-center text-ink-quiet text-[12px]">
                  Vuoto
                </div>
              ) : (
                <div className="space-y-2">
                  {phCards.map((c, i) => {
                    const area = areas?.find((a) => a.id === c.areaId);
                    return (
                      <motion.button
                        key={c.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: phIdx * 0.05 + i * 0.03 }}
                        onClick={() => setEditing(c)}
                        className="card w-full text-left active:scale-[0.98] transition-transform relative overflow-hidden"
                      >
                        {area && (
                          <div
                            className="absolute -top-10 -right-10 w-24 h-24 rounded-full opacity-25 blur-2xl pointer-events-none"
                            style={{ background: area.color }}
                          />
                        )}
                        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap relative">
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
                          {c.targetDate && (
                            <span className="text-[10px] text-ink-muted num">
                              → {c.targetDate}
                            </span>
                          )}
                        </div>
                        <p className="text-[15.5px] font-semibold text-ink leading-tight relative">
                          {c.title}
                        </p>
                        {c.description && (
                          <p className="text-[13px] text-ink-muted mt-1 leading-snug relative line-clamp-2">
                            {c.description}
                          </p>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>

      <button
        onClick={() => setShowNew(true)}
        className="fixed right-5 z-30 w-14 h-14 rounded-full bg-white text-bg-deep flex items-center justify-center active:scale-90 transition-transform"
        style={{
          bottom: "calc(env(safe-area-inset-bottom) + 96px)",
          boxShadow: "0 12px 32px rgba(0,0,0,0.45), 0 0 0 0.5px rgba(255,255,255,0.4) inset, 0 1px 0 rgba(255,255,255,0.6) inset",
        }}
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>

      {(showNew || editing) && (
        <CardSheet
          card={editing}
          areas={areas ?? []}
          onClose={() => {
            setShowNew(false);
            setEditing(null);
          }}
        />
      )}
    </Layout>
  );
}

function CardSheet({
  card,
  areas,
  onClose,
}: {
  card: RoadmapCard | null;
  areas: Area[];
  onClose: () => void;
}) {
  const [title, setTitle] = useState(card?.title ?? "");
  const [areaId, setAreaId] = useState<string>(card?.areaId ?? areas[0]?.id ?? "");
  const [phase, setPhase] = useState<RoadmapPhase>(card?.phase ?? "soon");
  const [description, setDescription] = useState(card?.description ?? "");
  const [whyNote, setWhyNote] = useState(card?.whyNote ?? "");
  const [targetDate, setTargetDate] = useState(card?.targetDate ?? "");

  function shiftPhase(delta: number) {
    const next = phaseIdx[phase] + delta;
    if (next < 0 || next >= phases.length) return;
    setPhase(phases[next].id);
  }

  async function save() {
    if (!title.trim() || !areaId) return;
    if (card) {
      await db.roadmap.update(card.id, {
        title: title.trim(),
        areaId,
        phase,
        description: description.trim() || undefined,
        whyNote: whyNote.trim() || undefined,
        targetDate: targetDate || undefined,
      });
    } else {
      await db.roadmap.add({
        id: uid("rm-"),
        title: title.trim(),
        areaId,
        phase,
        description: description.trim() || undefined,
        whyNote: whyNote.trim() || undefined,
        targetDate: targetDate || undefined,
        createdAt: Date.now(),
        order: Date.now(),
      });
    }
    onClose();
  }

  async function remove() {
    if (!card) return;
    await db.roadmap.delete(card.id);
    onClose();
  }

  async function promoteToMission() {
    if (!card) return;
    await db.missions.add({
      id: uid("m-"),
      title: card.title,
      areaId: card.areaId,
      priority: "high" as Priority,
      notes: card.description,
      done: false,
      createdAt: Date.now(),
      order: Date.now(),
    });
    await db.roadmap.update(card.id, { phase: "now" });
    onClose();
  }

  const currentPhase = phases.find((p) => p.id === phase)!;

  return (
    <Sheet onClose={onClose} title={card ? "Modifica" : "Nuova rotta"} orb={currentPhase.color}>
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Cosa? (es. Dimissioni TNB)"
        className="input w-full mb-3"
      />

      <p className="eyebrow mb-2">Fase temporale</p>
      <div className="card !p-3 flex items-center justify-between mb-3">
        <button
          onClick={() => shiftPhase(-1)}
          disabled={phaseIdx[phase] === 0}
          className="p-2 text-ink-muted disabled:opacity-30 active:scale-90 transition-transform"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="text-center flex-1">
          <p
            className="text-[14px] font-bold tracking-tight-2"
            style={{ color: currentPhase.color }}
          >
            {currentPhase.label}
          </p>
          <p className="text-[10px] text-ink-muted uppercase tracking-wider mt-0.5">
            {currentPhase.sub}
          </p>
        </div>
        <button
          onClick={() => shiftPhase(1)}
          disabled={phaseIdx[phase] === phases.length - 1}
          className="p-2 text-ink-muted disabled:opacity-30 active:scale-90 transition-transform"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <p className="eyebrow mb-2">Area</p>
      <div className="flex flex-wrap gap-1.5 mb-3">
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

      <input
        type="date"
        value={targetDate}
        onChange={(e) => setTargetDate(e.target.value)}
        className="input w-full mb-3 num"
      />

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Descrizione"
        rows={2}
        className="input w-full mb-3 resize-none"
      />

      <textarea
        value={whyNote}
        onChange={(e) => setWhyNote(e.target.value)}
        placeholder="Perché? La tua motivazione"
        rows={2}
        className="input w-full mb-5 resize-none"
      />

      <div className="grid grid-cols-2 gap-2 mb-2">
        <button onClick={onClose} className="btn-ghost">Annulla</button>
        <button onClick={save} className="btn-primary">
          {card ? "Aggiorna" : "Salva"}
        </button>
      </div>

      {card && (
        <div className="grid grid-cols-2 gap-2 pt-3 mt-2 border-t-[0.5px] border-white/10">
          <button
            onClick={promoteToMission}
            className="btn-ghost inline-flex items-center justify-center gap-2 text-accent"
            style={{ borderColor: "rgba(185,164,255,0.4)" }}
          >
            <Play size={14} /> A Missioni
          </button>
          <button
            onClick={remove}
            className="btn-ghost inline-flex items-center justify-center gap-2"
            style={{ color: "#FF6B7A", borderColor: "rgba(255,107,122,0.4)" }}
          >
            <Trash2 size={14} /> Elimina
          </button>
        </div>
      )}
    </Sheet>
  );
}
