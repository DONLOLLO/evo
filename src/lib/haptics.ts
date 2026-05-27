// ════════════════════════════════════════════════════════════════════════
// Haptic feedback helper. Wrapper sopra @capacitor/haptics.
// Su web (PWA in browser) usa navigator.vibrate come fallback (Android Chrome).
// Su iOS Safari PWA non c'è vibrazione possibile, le chiamate sono no-op.
// Su native iOS/Android (Capacitor) usa l'API nativa.
// ════════════════════════════════════════════════════════════════════════

import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

const isNative = Capacitor.isNativePlatform();
const hasWebVibrate =
  typeof navigator !== "undefined" && typeof navigator.vibrate === "function";

/** Tocchi sottili: tap leggero, toggle, switch. */
export function tap(): void {
  if (isNative) {
    void Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
  } else if (hasWebVibrate) {
    navigator.vibrate(10);
  }
}

/** Selezione: dot, scroll-stop, segmented control. */
export function selection(): void {
  if (isNative) {
    void Haptics.selectionStart().catch(() => {});
    setTimeout(() => {
      void Haptics.selectionEnd().catch(() => {});
    }, 30);
  } else if (hasWebVibrate) {
    navigator.vibrate(5);
  }
}

/** Conferma più decisa: invio, swipe-action, importante. */
export function medium(): void {
  if (isNative) {
    void Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
  } else if (hasWebVibrate) {
    navigator.vibrate(20);
  }
}

/** Successo (verde): completamento, vittoria, salvataggio. */
export function success(): void {
  if (isNative) {
    void Haptics.notification({ type: NotificationType.Success }).catch(() => {});
  } else if (hasWebVibrate) {
    navigator.vibrate([10, 50, 10]);
  }
}

/** Warning (giallo): caution, conferma operazione delicata. */
export function warning(): void {
  if (isNative) {
    void Haptics.notification({ type: NotificationType.Warning }).catch(() => {});
  } else if (hasWebVibrate) {
    navigator.vibrate([20, 30, 20]);
  }
}

/** Errore (rosso): fallimento, rejected, errore form. */
export function error(): void {
  if (isNative) {
    void Haptics.notification({ type: NotificationType.Error }).catch(() => {});
  } else if (hasWebVibrate) {
    navigator.vibrate([30, 40, 30, 40, 30]);
  }
}
