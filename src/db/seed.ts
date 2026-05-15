import { db } from "./database";
import type {
  Area,
  Stat,
  RoutineBlock,
  Skill,
  Law,
  Vision,
  Settings,
} from "../types";

/**
 * Popola il database con valori iniziali sensati per Lorenzo.
 * Lanciato solo se il DB è vuoto — l'utente può modificare tutto da UI.
 */
let seedRunning: Promise<void> | null = null;

export async function seedIfEmpty(): Promise<void> {
  if (seedRunning) return seedRunning;
  seedRunning = (async () => {
    const areaCount = await db.areas.count();
    if (areaCount > 0) return;
    await doSeed();
  })();
  return seedRunning;
}

async function doSeed() {
  const now = Date.now();

  // ─── AREE ────────────────────────────────────────────────────────────
  const areas: Area[] = [
    { id: "work", name: "Work", color: "#e8c56d", order: 0 },
    { id: "nime", name: "NIME", color: "#5dd4c4", order: 1 },
    { id: "fisico", name: "Fisico", color: "#e85d7a", order: 2 },
    { id: "mentale", name: "Mentale", color: "#a987e8", order: 3 },
    { id: "identita", name: "Identità", color: "#e89a5d", order: 4 },
    { id: "finanze", name: "Finanze", color: "#7ad48b", order: 5 },
    { id: "tech", name: "Tech", color: "#5d9ae8", order: 6 },
  ];
  await db.areas.bulkAdd(areas);

  // ─── STATS ───────────────────────────────────────────────────────────
  const stats: Stat[] = [
    {
      id: "ambizione",
      name: "Ambizione",
      value: 90,
      description: "Visione fuori dal comune.",
      color: "#e8c56d",
      order: 0,
      updatedAt: now,
    },
    {
      id: "intelligenza",
      name: "Intelligenza",
      value: 82,
      description: "Commerciale, analitica, creativa.",
      color: "#5d9ae8",
      order: 1,
      updatedAt: now,
    },
    {
      id: "persuasione",
      name: "Persuasione",
      value: 55,
      description: "In sviluppo — skill primaria 2026.",
      color: "#5dd4c4",
      order: 2,
      updatedAt: now,
    },
    {
      id: "disciplina",
      name: "Disciplina",
      value: 38,
      description: "Gap principale da colmare.",
      color: "#e85d7a",
      order: 3,
      updatedAt: now,
    },
    {
      id: "coraggio",
      name: "Coraggio esecutivo",
      value: 42,
      description: "Agire prima di essere pronto.",
      color: "#e89a5d",
      order: 4,
      updatedAt: now,
    },
    {
      id: "resilienza",
      name: "Resilienza",
      value: 71,
      description: "Costruita con esperienze difficili.",
      color: "#7ad48b",
      order: 5,
      updatedAt: now,
    },
    {
      id: "fiducia",
      name: "Fiducia in sé",
      value: 46,
      description: "In ricostruzione.",
      color: "#a987e8",
      order: 6,
      updatedAt: now,
    },
  ];
  await db.stats.bulkAdd(stats);

  // ─── ROUTINE BLOCKS (template, modificabili) ─────────────────────────
  const blocks: RoutineBlock[] = [
    {
      id: "morning",
      title: "Morning Protocol",
      startTime: "07:00",
      endTime: "07:45",
      description: "Acqua, meditazione, doccia, 3 task del giorno.",
      days: [0, 1, 2, 3, 4, 5, 6],
      order: 0,
    },
    {
      id: "training",
      title: "Training",
      startTime: "07:45",
      endTime: "09:30",
      description: "Movimento — adatta in base al giorno.",
      days: [1, 2, 3, 4, 5],
      order: 1,
    },
    {
      id: "deep1",
      title: "Deep Work 1",
      startTime: "09:30",
      endTime: "12:30",
      description: "Lavoro intenso senza distrazioni.",
      days: [1, 2, 3, 4, 5],
      order: 2,
    },
    {
      id: "lunch",
      title: "Pranzo & stacco",
      startTime: "12:30",
      endTime: "13:30",
      days: [1, 2, 3, 4, 5],
      order: 3,
    },
    {
      id: "deep2",
      title: "Deep Work 2",
      startTime: "13:30",
      endTime: "16:30",
      description: "Secondo blocco di lavoro.",
      days: [1, 2, 3, 4, 5],
      order: 4,
    },
    {
      id: "learn",
      title: "Learning Block",
      startTime: "16:30",
      endTime: "17:00",
      description: "Vendita / persuasione / nuova skill.",
      days: [1, 2, 3, 4, 5],
      order: 5,
    },
    {
      id: "shutdown",
      title: "Evening Shutdown",
      startTime: "23:00",
      endTime: "23:30",
      description: "Revisione giornata, prepara domani, telefono fuori.",
      days: [0, 1, 2, 3, 4, 5, 6],
      order: 6,
    },
  ];
  await db.routineBlocks.bulkAdd(blocks);

  // ─── SKILLS ──────────────────────────────────────────────────────────
  const skills: Skill[] = [
    { id: "s-vendita", name: "Vendita & Persuasione", areaId: "mentale", level: 0, order: 0, description: "Skill primaria 2026." },
    { id: "s-nime-launch", name: "Lancio NIME", areaId: "nime", level: 0, order: 0, description: "Portarlo da idea a sistema." },
    { id: "s-disciplina", name: "Disciplina quotidiana", areaId: "mentale", level: 0, order: 1, description: "Trasformare visione in esecuzione." },
    { id: "s-training", name: "Allenamento", areaId: "fisico", level: 0, order: 0 },
    { id: "s-network", name: "Network", areaId: "identita", level: 0, order: 0, description: "Costruire la rete giusta." },
  ];
  await db.skills.bulkAdd(skills);

  // ─── LEGGI ───────────────────────────────────────────────────────────
  const laws: Law[] = [
    { id: "l1", title: "Legge della Difficoltà", body: "Per te non esiste la via facile. Accetta la salita: è la tua leva.", order: 0 },
    { id: "l2", title: "Legge dell'Azione", body: "Agisci prima di essere pronto. La preparazione perfetta è la trappola.", order: 1 },
    { id: "l3", title: "Legge della Visione", body: "Crea il tuo sistema, non vivere in quello di altri.", order: 2 },
    { id: "l4", title: "Legge della Disciplina", body: "L'ambizione senza disciplina è solo desiderio. La disciplina la rende realtà.", order: 3 },
    { id: "l5", title: "Legge della Fiducia", body: "La fiducia si ricostruisce con piccole azioni mantenute, non con grandi promesse.", order: 4 },
    { id: "l6", title: "Legge del Pattern", body: "Ottimismo + bisogno di credere = vulnerabilità. Riconoscilo e dirigilo.", order: 5 },
    { id: "l7", title: "Legge del Level Up", body: "Non stai cambiando vita: stai facendo level up. È un processo, non un salto.", order: 6 },
    { id: "l8", title: "Legge del Rischio Reale", body: "Il rischio non è il rifiuto. Il rischio è la stasi.", order: 7 },
  ];
  await db.laws.bulkAdd(laws);

  // ─── VISIONE ─────────────────────────────────────────────────────────
  const vision: Vision = {
    id: "main",
    text:
      "Fare quello che voglio quando voglio. Reddito autonomo 3-5k+/mese. " +
      "NIME come sistema. Corpo di cui essere fiero. Rete giusta. Compagna di valore.",
    updatedAt: now,
  };
  await db.vision.put(vision);

  // ─── SETTINGS ────────────────────────────────────────────────────────
  const settings: Settings = {
    id: "main",
    streakCount: 0,
    lastSeenLawIndex: 0,
    morningCutoffHour: 12,
    eveningStartHour: 21,
  };
  await db.settings.put(settings);
}
