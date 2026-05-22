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

export interface LocalAIPlugin {
  /** Sanity check del bridge native. */
  echo(options: { value: string }): Promise<{ value: string }>;

  /** Stato del modello: caricato, in download, mancante. */
  status(): Promise<{
    ready: boolean;
    modelName?: string;
    modelSize?: number;
    progress?: number;
  }>;

  /** Genera testo dato un prompt. Bloccante (~30s per ~200 token). */
  generate(options: {
    prompt: string;
    maxTokens?: number;
    temperature?: number;
  }): Promise<{ text: string; tokensGenerated: number }>;
}

const Plugin = registerPlugin<LocalAIPlugin>("LocalAI", {
  web: () => ({
    echo: async ({ value }: { value: string }) => ({ value }),
    status: async () => ({ ready: false }),
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
