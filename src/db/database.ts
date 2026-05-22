import Dexie, { type Table } from "dexie";
import type {
  Area,
  Stat,
  StatHistory,
  RoutineBlock,
  RoutineCheck,
  Skill,
  SkillResource,
  SkillAction,
  Mission,
  RoadmapCard,
  Law,
  Victory,
  Vision,
  DailyCheckin,
  Settings,
  Person,
  Touchpoint,
  Challenge,
  ChallengeLog,
  WeeklyReview,
} from "../types";
import { uid } from "../lib/date";

export class LBDatabase extends Dexie {
  areas!: Table<Area, string>;
  stats!: Table<Stat, string>;
  statHistory!: Table<StatHistory, string>;
  routineBlocks!: Table<RoutineBlock, string>;
  routineChecks!: Table<RoutineCheck, string>;
  skills!: Table<Skill, string>;
  skillResources!: Table<SkillResource, string>;
  skillActions!: Table<SkillAction, string>;
  missions!: Table<Mission, string>;
  roadmap!: Table<RoadmapCard, string>;
  laws!: Table<Law, string>;
  victories!: Table<Victory, string>;
  vision!: Table<Vision, string>;
  checkins!: Table<DailyCheckin, string>;
  settings!: Table<Settings, string>;
  people!: Table<Person, string>;
  touchpoints!: Table<Touchpoint, string>;
  challenges!: Table<Challenge, string>;
  challengeLogs!: Table<ChallengeLog, string>;
  weeklyReviews!: Table<WeeklyReview, string>;

  constructor() {
    super("lb-personal-app");

    this.version(1).stores({
      areas: "id, order",
      stats: "id, order",
      statHistory: "++id, statId, at",
      routineBlocks: "id, order",
      routineChecks: "++id, [blockId+date], date",
      skills: "id, areaId, parentId, order",
      skillResources: "id, skillId, done",
      skillActions: "id, skillId",
      missions: "id, priority, done, areaId, skillId, pinnedForDate, dueDate, order, createdAt",
      roadmap: "id, areaId, phase, order",
      laws: "id, order",
      victories: "id, at",
      vision: "id",
      checkins: "++id, date",
      settings: "id",
    });

    this.version(2).stores({
      areas: "id, order",
      stats: "id, order",
      statHistory: "++id, statId, at",
      routineBlocks: "id, order",
      routineChecks: "++id, [blockId+date], date",
      skills: "id, areaId, parentId, order",
      skillResources: "id, skillId, done",
      skillActions: "id, skillId",
      missions: "id, priority, done, areaId, skillId, pinnedForDate, dueDate, order, createdAt",
      roadmap: "id, areaId, phase, order",
      laws: "id, order",
      victories: "id, at",
      vision: "id",
      checkins: "++id, date",
      settings: "id",
      people: "id, name, createdAt",
      touchpoints: "id, personId, dueDate, done, createdAt",
      challenges: "id, active, startDate, endDate, createdAt",
      challengeLogs: "++id, [challengeId+date], challengeId, date",
    });

    // v3: history tables migrano da ++id (numerico) a id (UUID string) per
    // poter essere sincronizzate con Supabase. Le righe esistenti vengono
    // riassegnate un uid mantenendo tutti gli altri campi.
    this.version(3)
      .stores({
        areas: "id, order",
        stats: "id, order",
        statHistory: "id, statId, at",
        routineBlocks: "id, order",
        routineChecks: "id, [blockId+date], date",
        skills: "id, areaId, parentId, order",
        skillResources: "id, skillId, done",
        skillActions: "id, skillId",
        missions: "id, priority, done, areaId, skillId, pinnedForDate, dueDate, order, createdAt",
        roadmap: "id, areaId, phase, order",
        laws: "id, order",
        victories: "id, at",
        vision: "id",
        checkins: "id, date",
        settings: "id",
        people: "id, name, createdAt",
        touchpoints: "id, personId, dueDate, done, createdAt",
        challenges: "id, active, startDate, endDate, createdAt",
        challengeLogs: "id, [challengeId+date], challengeId, date",
      })
      .upgrade(async (tx) => {
        const migrations: Array<[string, string]> = [
          ["statHistory", "sh-"],
          ["routineChecks", "rc-"],
          ["checkins", "ck-"],
          ["challengeLogs", "cl-"],
        ];
        for (const [name, prefix] of migrations) {
          const rows = await tx.table(name).toArray();
          if (rows.length === 0) continue;
          await tx.table(name).clear();
          const remapped = rows.map((r) => ({ ...r, id: uid(prefix) }));
          await tx.table(name).bulkAdd(remapped);
        }
      });

    // v4: weeklyReviews — riflessione settimanale (1 per weekStart).
    this.version(4).stores({
      areas: "id, order",
      stats: "id, order",
      statHistory: "id, statId, at",
      routineBlocks: "id, order",
      routineChecks: "id, [blockId+date], date",
      skills: "id, areaId, parentId, order",
      skillResources: "id, skillId, done",
      skillActions: "id, skillId",
      missions: "id, priority, done, areaId, skillId, pinnedForDate, dueDate, order, createdAt",
      roadmap: "id, areaId, phase, order",
      laws: "id, order",
      victories: "id, at",
      vision: "id",
      checkins: "id, date",
      settings: "id",
      people: "id, name, createdAt",
      touchpoints: "id, personId, dueDate, done, createdAt",
      challenges: "id, active, startDate, endDate, createdAt",
      challengeLogs: "id, [challengeId+date], challengeId, date",
      weeklyReviews: "id, weekStart, closedAt",
    });
  }
}

export const db = new LBDatabase();
