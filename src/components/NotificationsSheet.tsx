import { useEffect, useState } from "react";
import { Sheet } from "../pages/Missions";
import {
  Bell,
  BellOff,
  Sunrise,
  Moon,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import {
  pushSupported,
  isStandalonePWA,
  needsPwaInstallForPush,
  notificationPermission,
  getCurrentSubscription,
  subscribe,
  unsubscribe,
  loadPrefs,
  savePrefs,
  type NotificationPrefs,
} from "../lib/push";
import { useAuthStore } from "../stores/useAuthStore";

type State = "checking" | "ready" | "no-pwa" | "unsupported" | "no-auth";

const DEFAULT_PREFS: NotificationPrefs = {
  enable_morning: true,
  morning_time: "07:00",
  enable_evening: true,
  evening_time: "22:00",
  enable_routines: true,
  routine_lead_minutes: 5,
  timezone: "Europe/Rome",
};

export default function NotificationsSheet({
  onClose,
}: {
  onClose: () => void;
}) {
  const session = useAuthStore((s) => s.session);
  const [state, setState] = useState<State>("checking");
  const [subscribed, setSubscribed] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!session) {
        setState("no-auth");
        return;
      }
      if (!pushSupported()) {
        setState("unsupported");
        return;
      }
      if (needsPwaInstallForPush()) {
        setState("no-pwa");
        return;
      }
      const sub = await getCurrentSubscription();
      setSubscribed(!!sub);
      const p = await loadPrefs();
      if (p) setPrefs(p);
      setState("ready");
    })();
  }, [session]);

  async function handleEnable() {
    setBusy(true);
    setError(null);
    const res = await subscribe();
    setBusy(false);
    if (res.ok) {
      setSubscribed(true);
    } else {
      setError(res.reason);
    }
  }

  async function handleDisable() {
    setBusy(true);
    setError(null);
    await unsubscribe();
    setSubscribed(false);
    setBusy(false);
  }

  async function update<K extends keyof NotificationPrefs>(
    key: K,
    value: NotificationPrefs[K],
  ) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    await savePrefs({ [key]: value } as Partial<NotificationPrefs>);
  }

  return (
    <Sheet onClose={onClose} title="Notifiche" orb="#e89a5d">
      {state === "checking" && (
        <p className="text-ink-muted text-[13px] py-4">Verifico…</p>
      )}

      {state === "no-auth" && (
        <EmptyState
          icon={BellOff}
          title="Accedi per attivare le notifiche"
          subtitle="Le notifiche vengono inviate dal cloud al tuo device. Serve un account."
        />
      )}

      {state === "unsupported" && (
        <EmptyState
          icon={BellOff}
          title="Notifiche non supportate"
          subtitle="Il tuo browser non supporta i push. Prova Safari iOS 16.4+ o Chrome desktop."
        />
      )}

      {state === "no-pwa" && (
        <EmptyState
          icon={AlertTriangle}
          title="Prima installa EVO"
          subtitle="Su iPhone: tap il pulsante Condividi (in basso) → Aggiungi alla Home. Poi apri EVO dall'icona e torna qui."
          accent="#e89a5d"
        />
      )}

      {state === "ready" && (
        <>
          {/* ── Master switch ─────────────────────────────────────────── */}
          <div
            className="card mb-5 flex items-center gap-3"
            style={{
              borderColor: subscribed ? "rgba(48,209,88,0.4)" : undefined,
              background: subscribed ? "rgba(48,209,88,0.06)" : undefined,
            }}
          >
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{
                background: subscribed ? "rgba(48,209,88,0.18)" : "rgba(255,255,255,0.06)",
              }}
            >
              {subscribed ? (
                <Bell size={18} className="text-sys-green" strokeWidth={2} />
              ) : (
                <BellOff size={18} className="text-ink-quiet" strokeWidth={2} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-medium text-ink">
                {subscribed ? "Notifiche attive" : "Notifiche spente"}
              </p>
              <p className="text-[12.5px] text-ink-muted">
                {subscribed
                  ? "Questo device riceverà le push"
                  : `Stato permesso: ${notificationPermission()}`}
              </p>
            </div>
            <button
              onClick={subscribed ? handleDisable : handleEnable}
              disabled={busy}
              className={
                subscribed
                  ? "btn-ghost text-[13px] py-2 px-3 disabled:opacity-50"
                  : "btn-primary text-[13px] py-2 px-3 disabled:opacity-50"
              }
            >
              {busy ? "..." : subscribed ? "Disattiva" : "Attiva"}
            </button>
          </div>

          {error && (
            <div
              className="card mb-5 text-[13px]"
              style={{
                borderColor: "rgba(255,107,122,0.4)",
                color: "#FF6B7A",
                background: "rgba(255,107,122,0.06)",
              }}
            >
              {error}
            </div>
          )}

          {/* ── Preferenze per tipo ──────────────────────────────────── */}
          <p className="eyebrow mb-2">Tipi di notifica</p>

          <ToggleRow
            icon={Sunrise}
            color="#FFD479"
            title="Mattina · le tue 3 missioni"
            enabled={prefs.enable_morning}
            onToggle={(v) => update("enable_morning", v)}
            extra={
              <TimePicker
                value={prefs.morning_time}
                onChange={(v) => update("morning_time", v)}
              />
            }
          />

          <ToggleRow
            icon={Moon}
            color="#b9a4ff"
            title="Sera · chiusura giornata"
            enabled={prefs.enable_evening}
            onToggle={(v) => update("enable_evening", v)}
            extra={
              <TimePicker
                value={prefs.evening_time}
                onChange={(v) => update("evening_time", v)}
              />
            }
          />

          <ToggleRow
            icon={Calendar}
            color="#5dd4c4"
            title="Routine · promemoria blocchi"
            enabled={prefs.enable_routines}
            onToggle={(v) => update("enable_routines", v)}
            extra={
              <select
                value={prefs.routine_lead_minutes}
                onChange={(e) =>
                  update("routine_lead_minutes", parseInt(e.target.value, 10))
                }
                className="input num text-[13px] py-1.5 px-2"
                style={{ width: "auto" }}
              >
                <option value={0}>al via</option>
                <option value={5}>5 min prima</option>
                <option value={10}>10 min prima</option>
                <option value={15}>15 min prima</option>
                <option value={30}>30 min prima</option>
              </select>
            }
          />

          <p className="text-[11.5px] text-ink-quiet mt-4 leading-relaxed">
            Le notifiche partono dal cloud nel timezone {prefs.timezone}.
            Disattiva i singoli tipi o spegni tutto col toggle in alto.
          </p>

          {isStandalonePWA() && (
            <p className="text-[11px] text-sys-green mt-3 inline-flex items-center gap-1.5">
              <Bell size={11} /> Installato come PWA
            </p>
          )}
        </>
      )}
    </Sheet>
  );
}

function ToggleRow({
  icon: Icon,
  color,
  title,
  enabled,
  onToggle,
  extra,
}: {
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  color: string;
  title: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  extra?: React.ReactNode;
}) {
  return (
    <div
      className={`card !p-3.5 mb-2 flex items-center gap-3 ${
        enabled ? "" : "opacity-60"
      }`}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{
          background: `${color}1f`,
          border: `0.5px solid ${color}55`,
        }}
      >
        <Icon size={16} className="text-ink" strokeWidth={1.8} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14.5px] font-medium text-ink">{title}</p>
        {extra && <div className="mt-1.5">{extra}</div>}
      </div>
      <Switch enabled={enabled} onChange={onToggle} color={color} />
    </div>
  );
}

function Switch({
  enabled,
  onChange,
  color,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
  color: string;
}) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
      style={{
        background: enabled ? color : "rgba(255,255,255,0.12)",
      }}
      aria-pressed={enabled}
    >
      <span
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform"
        style={{
          left: enabled ? "calc(100% - 1.375rem)" : "2px",
        }}
      />
    </button>
  );
}

function TimePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="input num text-[13px] py-1.5 px-2"
      style={{ width: "auto" }}
    />
  );
}

function EmptyState({
  icon: Icon,
  title,
  subtitle,
  accent = "#777",
}: {
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  title: string;
  subtitle: string;
  accent?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center"
        style={{
          background: `${accent}22`,
          border: `1px solid ${accent}55`,
        }}
      >
        <Icon size={22} className="text-ink" strokeWidth={1.8} />
      </div>
      <p className="text-ink text-[15px] max-w-[260px]">{title}</p>
      <p className="text-ink-muted text-[12.5px] max-w-[280px] leading-relaxed">
        {subtitle}
      </p>
    </div>
  );
}
