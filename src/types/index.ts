// Tipi centrali dell'app — single user, dati locali.

export type AreaId = string;

export interface Area {
  id: AreaId;
  name: string;
  color: string; // hex color (es. "#e8c56d")
  icon?: string; // nome icona lucide-react
  order: number;
}

// ─── STATS ──────────────────────────────────────────────────────────────
export interface Stat {
  id: string;
  name: string;
  value: number; // 0-100
  description?: string;
  color: string;
  order: number;
  updatedAt: number;
}

export interface StatHistory {
  id: string;
  statId: string;
  value: number;
  note?: string;
  at: number;
}

// ─── ROUTINE ────────────────────────────────────────────────────────────
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Domenica

export interface RoutineBlock {
  id: string;
  title: string;
  startTime?: string; // "07:00"
  endTime?: string; // "07:45"
  description?: string;
  days: Weekday[]; // giorni in cui questo blocco è attivo
  order: number;
}

export interface RoutineCheck {
  id: string;
  blockId: string;
  date: string; // YYYY-MM-DD
  done: boolean;
  at: number;
}

// ─── SKILL TREE ─────────────────────────────────────────────────────────
export interface Skill {
  id: string;
  name: string;
  areaId: AreaId;
  parentId?: string; // per albero gerarchico
  description?: string;
  level: number; // 0..n, sale completando azioni
  order: number;
}

export interface SkillResource {
  id: string;
  skillId: string;
  title: string;
  type: "book" | "video" | "course" | "person" | "link" | "other";
  url?: string;
  done: boolean;
  notes?: string;
  createdAt: number;
}

export interface SkillAction {
  id: string;
  skillId: string;
  title: string;
  recurring: boolean; // se true, ricomparirà come missione
  createdAt: number;
}

// ─── MISSIONI ───────────────────────────────────────────────────────────
export type Priority = "high" | "mid" | "low";

export interface Mission {
  id: string;
  title: string;
  notes?: string;
  areaId?: AreaId;
  skillId?: string; // se viene da una skill action
  priority: Priority;
  done: boolean;
  doneAt?: number;
  dueDate?: string; // YYYY-MM-DD
  pinnedForDate?: string; // se "fissata" come missione del giorno
  createdAt: number;
  order: number;
}

// ─── ROADMAP ────────────────────────────────────────────────────────────
export type RoadmapPhase =
  | "now"
  | "soon"
  | "months"
  | "year"
  | "vision";

export interface RoadmapCard {
  id: string;
  title: string;
  areaId: AreaId;
  phase: RoadmapPhase;
  description?: string;
  whyNote?: string;
  targetDate?: string;
  createdAt: number;
  order: number;
}

// ─── MOTIVATION ─────────────────────────────────────────────────────────
export interface Law {
  id: string;
  title: string;
  body: string;
  order: number;
}

export interface Victory {
  id: string;
  title: string;
  story: string;
  at: number;
}

export interface Vision {
  id: "main"; // singleton
  text: string;
  updatedAt: number;
}

// ─── CHECK-IN GIORNALIERO ───────────────────────────────────────────────
export type Mood = "great" | "ok" | "rough";

export interface DailyCheckin {
  id: string;
  date: string; // YYYY-MM-DD
  mood?: Mood;
  note?: string;
  blocksDone: number;
  blocksTotal: number;
  missionsDone: number;
  missionsTotal: number;
  closedAt: number;
}

// ─── RETE (persone e follow-up) ─────────────────────────────────────────
export type TouchChannel = "message" | "call" | "email" | "in-person" | "other";

export interface Person {
  id: string;
  name: string;
  role?: string;
  channel?: TouchChannel; // canale preferito
  notes?: string;
  createdAt: number;
}

export interface Touchpoint {
  id: string;
  personId: string;
  dueDate: string; // YYYY-MM-DD
  channel: TouchChannel;
  message?: string; // contesto: cosa devo dire/chiedere
  done: boolean;
  doneAt?: number;
  createdAt: number;
}

// ─── SFIDE (challenge a tempo determinato) ──────────────────────────────
export interface Challenge {
  id: string;
  title: string;
  description?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  goals: string[];   // obiettivi (es. "Abbronzatura", "Alimentazione pulita")
  active: boolean;   // false quando completata o abbandonata
  createdAt: number;
}

export type ChallengeStatus = "done" | "missed";

export interface ChallengeLog {
  id: string;
  challengeId: string;
  date: string;          // YYYY-MM-DD
  status: ChallengeStatus;
  reason?: string;       // motivo se missed
  at: number;
}

// ─── WEEKLY REVIEW ──────────────────────────────────────────────────────
export interface WeeklyReview {
  id: string;
  weekStart: string; // ISO YYYY-MM-DD (Lunedì)
  // Numeri rilevati al momento del salvataggio
  missionsDone: number;
  missionsTotal: number;
  routinesDone: number;
  routinesTotal: number;
  victoriesCount: number;
  moodGreat: number;
  moodOk: number;
  moodRough: number;
  // Riflessione
  wentWell: string;
  didntGo: string;
  changeNext: string;
  closedAt: number;
}

// ─── SETTINGS ───────────────────────────────────────────────────────────
export interface Settings {
  id: "main";
  streakCount: number;
  lastCheckinDate?: string;
  lastSeenLawIndex: number;
  morningCutoffHour: number; // default 12
  eveningStartHour: number; // default 21
}
