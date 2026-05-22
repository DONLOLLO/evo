// ════════════════════════════════════════════════════════════════════════
// EVO — notification-tick
// ────────────────────────────────────────────────────────────────────────
// Edge Function chiamata ogni minuto da pg_cron. Per ogni utente con
// preferenze + subscription valide, calcola se "adesso" è il momento di
// inviare:
//   - morning push (alle preferenze.morning_time)
//   - evening push
//   - routine reminder (lead_minutes prima di ogni block schedulato oggi)
// Idempotenza via notification_log (unique constraint user_id, kind, for_date).
// ════════════════════════════════════════════════════════════════════════

// @ts-ignore -- Deno-only import (Edge Functions runtime)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
// @ts-ignore
import webpush from "npm:web-push@3.6.7";

// @ts-ignore -- Deno globals available at runtime
declare const Deno: {
  env: { get(key: string): string | undefined };
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
};

const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT =
  Deno.env.get("VAPID_SUBJECT") ?? "mailto:lorenzoborello6@gmail.com";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

interface NotificationPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

interface Prefs {
  user_id: string;
  enable_morning: boolean;
  morning_time: string;
  enable_evening: boolean;
  evening_time: string;
  enable_routines: boolean;
  routine_lead_minutes: number;
  timezone: string;
}

interface RoutineBlock {
  id: string;
  title: string;
  startTime: string | null;
  days: number[];
}

interface Subscription {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

function nowInTimezone(tz: string): { date: string; minutesOfDay: number; dayOfWeek: number } {
  const now = new Date();
  // sv-SE locale produce "YYYY-MM-DD HH:mm" stabilmente
  const fmt = new Intl.DateTimeFormat("sv-SE", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const formatted = fmt.format(now); // "2026-05-22 09:35"
  const [date, time] = formatted.split(" ");
  const [h, m] = time.split(":").map(Number);
  const minutesOfDay = h * 60 + m;
  // Day of week nel timezone
  const dowFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
  });
  const dowStr = dowFmt.format(now); // "Thu"
  const dowMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return { date, minutesOfDay, dayOfWeek: dowMap[dowStr] ?? 0 };
}

function parseHM(hm: string): number {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
}

async function sendToUser(
  userId: string,
  payload: NotificationPayload,
  kind: string,
  forDate: string,
): Promise<boolean> {
  // Idempotency check
  const { data: existing } = await supabase
    .from("notification_log")
    .select("id")
    .eq("user_id", userId)
    .eq("kind", kind)
    .eq("for_date", forDate)
    .limit(1);
  if (existing && existing.length > 0) return false;

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (!subs || subs.length === 0) {
    // Niente subs ma logghiamo lo stesso (così non riproviamo ogni minuto)
    await supabase.from("notification_log").insert({
      user_id: userId,
      kind,
      for_date: forDate,
    });
    return false;
  }

  let anySent = false;
  for (const sub of subs as Subscription[]) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload),
        { TTL: 60 * 60 * 4 },
      );
      anySent = true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      const code = err?.statusCode;
      console.warn(`[push] failed ${sub.endpoint.slice(0, 60)}…`, code, err?.message);
      if (code === 410 || code === 404) {
        await supabase.from("push_subscriptions").delete().eq("id", sub.id);
      }
    }
  }

  // Log anyway (anche se tutti i device sono offline — non riproviamo oggi)
  await supabase.from("notification_log").insert({
    user_id: userId,
    kind,
    for_date: forDate,
  });

  return anySent;
}

async function processMorningCount(userId: string): Promise<number> {
  // Conta missioni non chiuse per il body del push
  const { count } = await supabase
    .from("missions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("done", false)
    .is("deleted_at", null);
  return count ?? 0;
}

async function tick(): Promise<{ checked: number; sent: number }> {
  const { data: users, error } = await supabase
    .from("notification_prefs")
    .select("*");
  if (error || !users) {
    console.error("[tick] failed to load prefs:", error?.message);
    return { checked: 0, sent: 0 };
  }

  let sent = 0;
  for (const u of users as Prefs[]) {
    const tz = u.timezone || "Europe/Rome";
    const { date, minutesOfDay, dayOfWeek } = nowInTimezone(tz);

    // ── Morning ──────────────────────────────────────────────────────
    if (u.enable_morning) {
      const target = parseHM(u.morning_time);
      if (minutesOfDay === target) {
        const open = await processMorningCount(u.user_id);
        const body =
          open === 0
            ? "Apri EVO, scrivi le 3 missioni di oggi."
            : open === 1
              ? "1 missione in attesa. Si apre il giorno."
              : `${open} missioni in attesa. Si apre il giorno.`;
        if (await sendToUser(u.user_id, {
          title: "Buongiorno",
          body,
          url: "/missioni",
          tag: "morning",
        }, "morning", date)) sent++;
      }
    }

    // ── Evening ──────────────────────────────────────────────────────
    if (u.enable_evening) {
      const target = parseHM(u.evening_time);
      if (minutesOfDay === target) {
        if (await sendToUser(u.user_id, {
          title: "Chiudi la giornata",
          body: "Check-in giornaliero. Come è andata?",
          url: "/",
          tag: "evening",
        }, "evening", date)) sent++;
      }
    }

    // ── Routine reminders ────────────────────────────────────────────
    if (u.enable_routines) {
      const { data: blocks } = await supabase
        .from("routine_blocks")
        .select('id, title, "startTime", days')
        .eq("user_id", u.user_id)
        .is("deleted_at", null);
      if (blocks) {
        for (const block of blocks as RoutineBlock[]) {
          if (!block.startTime) continue;
          if (!block.days.includes(dayOfWeek)) continue;
          const blockMinutes = parseHM(block.startTime);
          const fireMinutes = blockMinutes - u.routine_lead_minutes;
          if (minutesOfDay === fireMinutes) {
            const lead = u.routine_lead_minutes;
            const title =
              lead === 0
                ? "Ora: " + block.title
                : `Tra ${lead} min: ${block.title}`;
            if (await sendToUser(u.user_id, {
              title,
              body: `Inizia alle ${block.startTime}`,
              url: "/routine",
              tag: `routine-${block.id}`,
            }, `routine:${block.id}`, date)) sent++;
          }
        }
      }
    }
  }

  return { checked: users.length, sent };
}

Deno.serve(async (_req: Request) => {
  try {
    if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
      return new Response(
        JSON.stringify({ error: "VAPID keys non configurate" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
    const result = await tick();
    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[tick] uncaught:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
