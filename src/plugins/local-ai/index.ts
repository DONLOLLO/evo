import { Capacitor, registerPlugin } from "@capacitor/core";

// ════════════════════════════════════════════════════════════════════════
// LocalAI — bridge JS ↔ MediaPipe LLM Inference (iOS + Android)
// ────────────────────────────────────────────────────────────────────────
// Stesso engine usato in Sparq (flutter_gemma → MediaPipe). Qui esposto
// a React via Capacitor plugin nativo (Swift su iOS, Kotlin su Android).
//
// Stato attuale: STUB. Il plugin esiste e risponde, ma genera testo finto.
// Quando integriamo MediaPipe + Qwen 2.5 1.5B, solo l'implementazione
// nativa cambia, l'API JS resta identica.
//
// In ambiente web (PWA in browser), il plugin non è disponibile: tutte
// le chiamate ritornano `available: false`.
// ════════════════════════════════════════════════════════════════════════

export type LocalAIStatus =
  | "idle"
  | "downloading"
  | "loading"
  | "ready"
  | "error";

export interface LocalAIStatusResult {
  ready: boolean;
  status: LocalAIStatus;
  modelName?: string;
  progress?: number; // 0..1 durante downloading
  error?: string | null;
}

export interface LocalAIPlugin {
  /** Sanity check del bridge native. */
  echo(options: { value: string }): Promise<{ value: string }>;

  /** Stato del modello: caricato, in download, mancante. */
  status(): Promise<LocalAIStatusResult>;

  /** Genera testo dato un prompt. Bloccante (decine di secondi). */
  generate(options: {
    prompt: string;
    maxTokens?: number;
    temperature?: number;
  }): Promise<{ text: string; tokensGenerated: number }>;
}

const Plugin = registerPlugin<LocalAIPlugin>("LocalAI", {
  web: () => ({
    echo: async ({ value }: { value: string }) => ({ value }),
    status: async () => ({
      ready: false,
      status: "idle" as LocalAIStatus,
      error: "Web environment: AI on-device disponibile solo in app nativa.",
    }),
    generate: async () => ({
      text: "",
      tokensGenerated: 0,
    }),
  }),
});

/** Vero solo su iOS/Android nativo (Capacitor wrap). */
export function isLocalAIAvailable(): boolean {
  return Capacitor.isNativePlatform();
}

export default Plugin;
