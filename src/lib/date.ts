export function todayISO(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function currentWeekday(d: Date = new Date()): number {
  return d.getDay(); // 0 = Domenica
}

export function timeOfDay(d: Date = new Date()): "morning" | "day" | "evening" {
  const h = d.getHours();
  if (h < 12) return "morning";
  if (h < 21) return "day";
  return "evening";
}

export function relativeDay(iso: string): string {
  const today = todayISO();
  if (iso === today) return "Oggi";
  const yesterday = todayISO(new Date(Date.now() - 86400000));
  if (iso === yesterday) return "Ieri";
  return iso;
}

export function dayName(weekday: number, short = false): string {
  const full = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
  const abbr = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
  return short ? abbr[weekday] : full[weekday];
}

export function uid(prefix = ""): string {
  return prefix + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
}

export function shiftDate(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return todayISO(d);
}

export function daysBetween(fromISO: string, toISO: string): number {
  const a = new Date(fromISO + "T00:00:00").getTime();
  const b = new Date(toISO + "T00:00:00").getTime();
  return Math.round((b - a) / 86400000);
}

export function isoToShort(iso: string): string {
  const today = todayISO();
  if (iso === today) return "Oggi";
  const tomorrow = todayISO(new Date(Date.now() + 86400000));
  if (iso === tomorrow) return "Domani";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
}
