import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/database";
import { Sheet } from "../pages/Missions";
import LocalAI, {
  isLocalAIAvailable,
  type LocalAIStatusResult,
} from "../plugins/local-ai";
import {
  buildPrompt,
  parseResponse,
  commitExtracted,
  entityLabel,
  entityKindLabel,
  type Extracted,
} from "../lib/brainDump";
import { Sparkles, Check, AlertTriangle, RotateCw, Download } from "lucide-react";

type Stage = "input" | "processing" | "preview" | "done" | "error";

const KIND_COLORS: Record<Extracted["kind"], string> = {
  mission: "#b9a4ff",
  routine_block: "#5dd4c4",
  skill: "#e89a5d",
  skill_resource: "#e89a5d",
  person: "#5d9ae8",
  touchpoint: "#5dd4c4",
  victory: "#FFD479",
  area: "#a987e8",
};

export default function BrainDumpSheet({ onClose }: { onClose: () => void }) {
  const areas = useLiveQuery(() => db.areas.toArray(), []);
  const skills = useLiveQuery(() => db.skills.toArray(), []);
  const people = useLiveQuery(() => db.people.toArray(), []);

  const [text, setText] = useState("");
  const [stage, setStage] = useState<Stage>("input");
  const [extracted, setExtracted] = useState<Extracted[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState("");
  const [rawOutput, setRawOutput] = useState("");
  const [created, setCreated] = useState(0);
  const [skipped, setSkipped] = useState(0);
  const [modelStatus, setModelStatus] = useState<LocalAIStatusResult | null>(
    null,
  );
  const pollTimerRef = useRef<number | null>(null);

  const native = isLocalAIAvailable();

  // Poll lo stato del modello quando siamo in modalità native
  useEffect(() => {
    if (!native) return;
    let cancelled = false;

    async function poll() {
      try {
        const s = await LocalAI.status();
        if (!cancelled) setModelStatus(s);
        if (cancelled) return;
        // Continua il poll finché non è ready/error
        if (s.status !== "ready" && s.status !== "error") {
          pollTimerRef.current = window.setTimeout(poll, 800);
        }
      } catch (e) {
        if (!cancelled) {
          setModelStatus({
            ready: false,
            status: "error",
            error: e instanceof Error ? e.message : String(e),
          });
        }
      }
    }
    poll();

    return () => {
      cancelled = true;
      if (pollTimerRef.current) window.clearTimeout(pollTimerRef.current);
    };
  }, [native]);

  const modelReady = modelStatus?.status === "ready";
  const modelBusy =
    modelStatus?.status === "downloading" || modelStatus?.status === "loading";

  async function process() {
    if (!text.trim()) return;
    if (!native) {
      setError(
        "Il Brain Dump funziona solo nell'app nativa iOS/Android. " +
          "Sul browser non è disponibile (servirebbe scaricare un LLM da ~500MB nel browser).",
      );
      setStage("error");
      return;
    }
    if (!modelReady) {
      setError(
        modelStatus?.status === "downloading"
          ? "Modello in scaricamento, riprova tra poco."
          : modelStatus?.status === "loading"
            ? "Modello in caricamento, attendi qualche secondo."
            : modelStatus?.error ?? "Modello non pronto.",
      );
      setStage("error");
      return;
    }
    setStage("processing");
    setError("");

    const ctx = {
      areas: areas ?? [],
      skills: skills ?? [],
      people: people ?? [],
    };
    const prompt = buildPrompt(text, ctx);

    try {
      const res = await LocalAI.generate({
        prompt,
        maxTokens: 1024,
        temperature: 0.2,
      });
      setRawOutput(res.text);
      const parsed = parseResponse(res.text);
      if (parsed.length === 0) {
        setError(
          "L'AI non ha trovato entità da estrarre. Prova a riformulare il testo, o usa frasi più concrete.",
        );
        setStage("error");
        return;
      }
      setExtracted(parsed);
      setSelected(new Set(parsed.map((_, i) => i)));
      setStage("preview");
    } catch (e) {
      console.error(e);
      setError(`Errore del modello: ${e instanceof Error ? e.message : e}`);
      setStage("error");
    }
  }

  async function confirm() {
    const ctx = {
      areas: areas ?? [],
      skills: skills ?? [],
      people: people ?? [],
    };
    const items = extracted.filter((_, i) => selected.has(i));
    const result = await commitExtracted(items, ctx);
    setCreated(result.created);
    setSkipped(result.skipped);
    setStage("done");
  }

  function toggle(i: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  return (
    <Sheet onClose={onClose} title="Brain Dump" orb="#b9a4ff">
      {stage === "input" && (
        <>
          <p className="text-ink-muted text-[13px] mb-4 leading-relaxed">
            Scrivi tutto quello che hai in testa — missioni, routine, skill,
            persone, vittorie. L'AI on-device estrae e organizza per te.
          </p>

          {!native && (
            <div
              className="card mb-4 inline-flex items-start gap-2 text-[12.5px]"
              style={{
                borderColor: "rgba(255,212,121,0.4)",
                background: "rgba(255,212,121,0.06)",
              }}
            >
              <AlertTriangle
                size={14}
                className="text-sys-yellow flex-shrink-0 mt-0.5"
              />
              <span className="text-ink-dim leading-snug">
                Disponibile solo nell'app iOS/Android. Apri EVO via Capacitor
                (non da browser).
              </span>
            </div>
          )}

          {native && modelStatus && !modelReady && (
            <ModelStatusBanner status={modelStatus} />
          )}

          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Esempio:
Mi alleno lunedì mercoledì venerdì alle 8.
Devo richiamare Giuseppe entro venerdì.
Imparare React Three Fiber.
Ieri ho chiuso la demo davanti a 30 persone.`}
            rows={9}
            className="input w-full resize-none text-[14.5px] leading-relaxed mb-4"
          />

          <div className="grid grid-cols-2 gap-2">
            <button onClick={onClose} className="btn-ghost">
              Annulla
            </button>
            <button
              onClick={process}
              disabled={!text.trim() || (native && !modelReady)}
              className="btn-primary inline-flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Sparkles size={15} />{" "}
              {native && modelBusy
                ? modelStatus?.status === "downloading"
                  ? "Scarico modello..."
                  : "Carico..."
                : "Estrai"}
            </button>
          </div>
        </>
      )}

      {stage === "processing" && (
        <div className="flex flex-col items-center text-center py-10">
          <div className="relative mb-5">
            <div
              className="w-16 h-16 rounded-full"
              style={{
                background: "radial-gradient(circle, #b9a4ff55, transparent)",
                filter: "blur(8px)",
              }}
            />
            <Sparkles
              size={26}
              className="text-accent absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse"
              strokeWidth={2.2}
            />
          </div>
          <p className="text-ink text-[16px] mb-2">EVO sta leggendo…</p>
          <p className="text-ink-muted text-[12.5px] max-w-[280px] leading-relaxed">
            Il modello on-device sta organizzando i tuoi pensieri. Può
            richiedere 30-60 secondi su iPhone.
          </p>
        </div>
      )}

      {stage === "preview" && (
        <>
          <p className="text-ink-muted text-[12.5px] mb-3">
            {extracted.length} entità estratte. Deseleziona quelle che non
            vuoi creare, poi conferma.
          </p>

          {rawOutput && (
            <details className="mb-3">
              <summary className="text-ink-quiet text-[10.5px] uppercase tracking-wider cursor-pointer active:opacity-70">
                Output raw del modello (debug)
              </summary>
              <pre
                className="mt-2 p-2.5 rounded-xl text-[10.5px] whitespace-pre-wrap leading-relaxed"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "0.5px solid rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.6)",
                  maxHeight: "25vh",
                  overflowY: "auto",
                }}
              >
                {rawOutput}
              </pre>
            </details>
          )}

          <ul className="space-y-1.5 max-h-[50vh] overflow-y-auto -mx-1 px-1 mb-4">
            {extracted.map((item, i) => {
              const isSelected = selected.has(i);
              const color = KIND_COLORS[item.kind];
              return (
                <li
                  key={i}
                  onClick={() => toggle(i)}
                  className={`card !p-3 flex items-start gap-3 cursor-pointer active:scale-[0.99] transition-transform ${
                    isSelected ? "" : "opacity-50"
                  }`}
                  style={{
                    borderColor: isSelected ? `${color}55` : undefined,
                    background: isSelected ? `${color}0a` : undefined,
                  }}
                >
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 transition-all`}
                    style={{
                      background: isSelected ? color : "rgba(255,255,255,0.05)",
                      border: `0.5px solid ${
                        isSelected ? color : "rgba(255,255,255,0.2)"
                      }`,
                    }}
                  >
                    {isSelected && (
                      <Check size={12} strokeWidth={3} className="text-bg-deep" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[10px] uppercase font-semibold tracking-[0.12em] mb-0.5"
                      style={{ color }}
                    >
                      {entityKindLabel(item.kind)}
                    </p>
                    <p className="text-[14.5px] text-ink leading-snug">
                      {entityLabel(item)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setStage("input");
                setExtracted([]);
                setSelected(new Set());
              }}
              className="btn-ghost inline-flex items-center justify-center gap-1.5"
            >
              <RotateCw size={14} /> Rifai
            </button>
            <button
              onClick={confirm}
              disabled={selected.size === 0}
              className="btn-primary disabled:opacity-50"
            >
              Crea {selected.size}
            </button>
          </div>
        </>
      )}

      {stage === "done" && (
        <div className="flex flex-col items-center text-center py-8">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
            style={{
              background: "rgba(48,209,88,0.18)",
              border: "1px solid rgba(48,209,88,0.4)",
            }}
          >
            <Check size={26} className="text-sys-green" strokeWidth={2.4} />
          </div>
          <p className="display text-[22px] text-ink mb-1">Fatto</p>
          <p className="text-ink-muted text-[13px] leading-relaxed max-w-[260px]">
            {created} entità create
            {skipped > 0 ? ` · ${skipped} saltate` : ""}.
            Le trovi nelle rispettive sezioni di EVO.
          </p>
          <button onClick={onClose} className="btn-primary mt-6 px-8">
            Chiudi
          </button>
        </div>
      )}

      {stage === "error" && (
        <div className="flex flex-col items-center text-center py-6">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
            style={{
              background: "rgba(255,107,122,0.18)",
              border: "1px solid rgba(255,107,122,0.4)",
            }}
          >
            <AlertTriangle size={22} className="text-sys-red" strokeWidth={2.2} />
          </div>
          <p className="text-ink text-[15px] mb-2">Ops</p>
          <p className="text-ink-muted text-[13px] max-w-[280px] leading-relaxed mb-5">
            {error}
          </p>

          {rawOutput && (
            <details className="w-full text-left mb-5">
              <summary className="text-ink-muted text-[11.5px] uppercase tracking-wider cursor-pointer active:opacity-70">
                Output raw del modello (debug)
              </summary>
              <pre
                className="mt-2 p-3 rounded-xl text-[11px] overflow-x-auto whitespace-pre-wrap leading-relaxed"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "0.5px solid rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.65)",
                  maxHeight: "30vh",
                  overflowY: "auto",
                }}
              >
                {rawOutput}
              </pre>
            </details>
          )}

          <button
            onClick={() => setStage("input")}
            className="btn-ghost px-6"
          >
            Riprova
          </button>
        </div>
      )}
    </Sheet>
  );
}

function ModelStatusBanner({ status }: { status: LocalAIStatusResult }) {
  if (status.status === "downloading") {
    const pct = Math.round((status.progress ?? 0) * 100);
    return (
      <div
        className="card mb-4 flex items-start gap-2.5 text-[12.5px]"
        style={{
          borderColor: "rgba(185,164,255,0.4)",
          background: "rgba(185,164,255,0.06)",
        }}
      >
        <Download
          size={14}
          className="text-accent flex-shrink-0 mt-0.5 animate-pulse"
        />
        <div className="flex-1 min-w-0">
          <p className="text-ink mb-1.5">
            Scarico il modello AI · {pct}%
          </p>
          <div className="h-1 rounded-full overflow-hidden bg-white/8">
            <div
              className="h-full transition-all rounded-full"
              style={{
                width: `${pct}%`,
                background:
                  "linear-gradient(90deg, #b9a4ff, #5dd4c4)",
              }}
            />
          </div>
          <p className="text-ink-quiet text-[11px] mt-1.5">
            Una volta sola, ~500 MB. Poi è offline per sempre.
          </p>
        </div>
      </div>
    );
  }

  if (status.status === "loading") {
    return (
      <div
        className="card mb-4 inline-flex items-start gap-2.5 text-[12.5px]"
        style={{
          borderColor: "rgba(185,164,255,0.4)",
          background: "rgba(185,164,255,0.06)",
        }}
      >
        <Sparkles size={14} className="text-accent flex-shrink-0 mt-0.5 animate-pulse" />
        <span className="text-ink-dim leading-snug">
          Carico il modello in memoria...
        </span>
      </div>
    );
  }

  if (status.status === "error") {
    return (
      <div
        className="card mb-4 inline-flex items-start gap-2.5 text-[12.5px]"
        style={{
          borderColor: "rgba(255,107,122,0.4)",
          background: "rgba(255,107,122,0.06)",
        }}
      >
        <AlertTriangle
          size={14}
          className="text-sys-red flex-shrink-0 mt-0.5"
        />
        <span className="text-ink-dim leading-snug">
          {status.error ?? "Errore caricamento modello."}
        </span>
      </div>
    );
  }

  return null;
}
