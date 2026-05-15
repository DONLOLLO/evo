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
} from "../types";

export class LBDatabase extends Dexie {
  areas!: Table<Area, string>;
  stats!: Table<Stat, string>;
  statHistory!: Table<StatHistory, number>;
  routineBlocks!: Table<RoutineBlock, string>;
  routineChecks!: Table<RoutineCheck, number>;
  skills!: Table<Skill, string>;
  skillResources!: Table<SkillResource, string>;
  skillActions!: Table<SkillAction, string>;
  missions!: Table<Mission, string>;
  roadmap!: Table<RoadmapCard, string>;
  laws!: Table<Law, string>;
  victories!: Table<Victory, string>;
  vision!: Table<Vision, string>;
  checkins!: Table<DailyCheckin, number>;
  settings!: Table<Settings, string>;
  people!: Table<Person, string>;
  touchpoints!: Table<Touchpoint, string>;
  challenges!: Table<Challenge, string>;
  challengeLogs!: Table<ChallengeLog, number>;

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
  }
}

export const db = new LBDatabase();
