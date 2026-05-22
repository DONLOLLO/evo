// Client-side helpers per Web Push.
// Pattern:
//   1) requireSupport() → verifica che il browser/device supporti push
//   2) subscribe() → richiede permesso, ottiene subscription, salva su Supabase
//   3) unsubscribe() → revoca + rimuove dal DB
//   4) getCurrentSubscription() → recupera l'attuale per il device corrente

import { supabase } from "./supabase";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as
  | string
  | undefined;

/** Vero se il browser ha tutte le API necessarie. */
export function pushSupported(): boolean {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** iOS Safari abilita push solo quando l'app è "Aggiunta a Home" (display-mode: standalone). */
export function isStandalonePWA(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.navigator as any).standalone === true
  );
}

/** Su iOS Safari "normale" (non installato) push non funziona. Suggeriamo l'install. */
export function needsPwaInstallForPush(): boolean {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  return isIOS && !isStandalonePWA();
}

/** Stato corrente del permesso notifiche. */
export function notificationPermission(): NotificationPermission | "unsupported" {
  if (!pushSupported()) return "unsupported";
  return Notification.permission;
}

function urlBase64ToUint8Array(base64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const buf = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < raw.length; ++i) view[i] = raw.charCodeAt(i);
  return buf;
}

async function ensureRegistration(): Promise<ServiceWorkerRegistration> {
  const reg = await navigator.serviceWorker.ready;
  return reg;
}

export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const reg = await ensureRegistration();
  return await reg.pushManager.getSubscription();
}

export async function subscribe(): Promise<
  { ok: true } | { ok: false; reason: string }
> {
  if (!pushSupported()) return { ok: false, reason: "Push non supportato su questo device." };
  if (!VAPID_PUBLIC_KEY) return { ok: false, reason: "VAPID key mancante (configurazione)." };
  if (!supabase) return { ok: false, reason: "Backend non configurato." };
  if (needsPwaInstallForPush()) {
    return {
      ok: false,
      reason:
        "Su iPhone devi prima aggiungere EVO alla schermata Home (Condividi → Aggiungi a Home), poi aprire dall'icona.",
    };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { ok: false, reason: "Permesso notifiche negato." };
  }

  const reg = await ensureRegistration();
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });

  const json = sub.toJSON();
  const endpoint = sub.endpoint;
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!p256dh || !auth) {
    return { ok: false, reason: "Subscription incompleta dal browser." };
  }

  // Recupera l'utente loggato per scrivere user_id corretto
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return { ok: false, reason: "Non sei loggato." };

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      id: `${userId}:${endpoint}`,
      user_id: userId,
      endpoint,
      p256dh,
      auth,
      user_agent: navigator.userAgent.slice(0, 200),
    },
    { onConflict: "user_id,endpoint" },
  );
  if (error) return { ok: false, reason: error.message };

  return { ok: true };
}

export async function unsubscribe(): Promise<{ ok: boolean; reason?: string }> {
  if (!pushSupported() || !supabase) return { ok: false, reason: "Non supportato." };
  const sub = await getCurrentSubscription();
  if (!sub) return { ok: true };

  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (userId) {
    await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", userId)
      .eq("endpoint", endpoint);
  }
  return { ok: true };
}

/** Preferenze utente lato Supabase. */
export interface NotificationPrefs {
  enable_morning: boolean;
  morning_time: string; // HH:MM
  enable_evening: boolean;
  evening_time: string;
  enable_routines: boolean;
  routine_lead_minutes: number;
  timezone: string;
}

export async function loadPrefs(): Promise<NotificationPrefs | null> {
  if (!supabase) return null;
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return null;
  const { data, error } = await supabase
    .from("notification_prefs")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    enable_morning: data.enable_morning,
    morning_time: data.morning_time,
    enable_evening: data.enable_evening,
    evening_time: data.evening_time,
    enable_routines: data.enable_routines,
    routine_lead_minutes: data.routine_lead_minutes,
    timezone: data.timezone,
  };
}

export async function savePrefs(p: Partial<NotificationPrefs>): Promise<boolean> {
  if (!supabase) return false;
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return false;
  const { error } = await supabase
    .from("notification_prefs")
    .upsert({ user_id: userId, ...p }, { onConflict: "user_id" });
  return !error;
}
