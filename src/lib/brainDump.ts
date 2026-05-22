// ════════════════════════════════════════════════════════════════════════
// Brain Dump — orchestrazione AI per estrarre entità EVO da testo libero
// ────────────────────────────────────────────────────────────────────────
// Pipeline:
//   1) buildPrompt(rawText, context) → prompt strutturato per Qwen
//   2) LocalAI.generate(prompt) → testo JSON
//   3) parseResponse(text) → array di Extracted{} typed
//   4) UI mostra preview con checkbox
//   5) commitExtracted(selected) → scrive su Dexie (sync push automatico)
// ════════════════════════════════════════════════════════════════════════

import { db } from "../db/database";
import { uid, todayISO } from "../lib/date";
import type {
  Area,
  Skill,
  Person,
  Priority,
  TouchChannel,
  Weekday,
} from "../types";

// ── Tipi delle entità estratte ────────────────────────────────────────

export type ExtractedMission = {
  kind: "mission";
  title: string;
  priority?: Priority;
  areaName?: string;
  notes?: string;
};

export type ExtractedRoutineBlock = {
  kind: "routine_block";
  title: string;
  startTime?: string;
  endTime?: string;
  days?: Weekday[];
  description?: string;
};

export type ExtractedSkill = {
  kind: "skill";
  name: string;
  areaName?: string;
  description?: string;
};

export type ExtractedSkillResource = {
  kind: "skill_resource";
  skillName: string;
  title: string;
  type?: "book" | "video" | "course" | "person" | "link" | "other";
  url?: string;
};

export type ExtractedPerson = {
  kind: "person";
  name: string;
  role?: string;
  channel?: TouchChannel;
};

export type ExtractedTouchpoint = {
  kind: "touchpoint";
  personName: string;
  dueDate?: string;
  channel?: TouchChannel;
  message?: string;
};

export type ExtractedVictory = {
  kind: "victory";
  title: string;
  story?: string;
};

export type ExtractedArea = {
  kind: "area";
  name: string;
  color?: string;
};

export type Extracted =
  | ExtractedMission
  | ExtractedRoutineBlock
  | ExtractedSkill
  | ExtractedSkillResource
  | ExtractedPerson
  | ExtractedTouchpoint
  | ExtractedVictory
  | ExtractedArea;

export interface BrainDumpContext {
  areas: Area[];
  skills: Skill[];
  people: Person[];
}

// ── Prompt building ────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Sei un parser per EVO, un'app di produttività personale.
Da un brain dump in italiano, estrai entità strutturate.

Entità possibili (campo "type"):
- "mission": cosa da fare singola. Campi: title (obbligatorio), priority ("high"|"mid"|"low"), areaName, notes.
- "routine_block": attività ricorrente con orario. Campi: title (obbligatorio), startTime ("HH:MM"), endTime, days (array di numeri 0=Dom..6=Sab), description.
- "skill": competenza da sviluppare. Campi: name (obbligatorio), areaName, description.
- "skill_resource": libro/video/corso legato a una skill. Campi: skillName, title, type ("book"|"video"|"course"|"person"|"link"), url.
- "person": persona nella rete. Campi: name (obbligatorio), role, channel ("message"|"call"|"email"|"in-person"|"other").
- "touchpoint": follow-up da fare con una persona. Campi: personName, dueDate ("YYYY-MM-DD"), channel, message.
- "victory": momento di successo passato. Campi: title (obbligatorio), story.
- "area": nuova area di vita. Campi: name, color (hex es. "#5dd4c4").

Regole:
- Se l'utente nomina "lunedì mercoledì venerdì" → days [1,3,5]. 0=Dom, 1=Lun, ..., 6=Sab.
- Date relative ("oggi", "domani", "settimana prossima") → convertile in YYYY-MM-DD usando il context.today.
- Se ambiguo, scegli il tipo più probabile.
- Restituisci SOLO un array JSON valido, niente altro testo.
- Niente markdown, niente backticks. Solo JSON puro.`;

export function buildPrompt(rawText: string, ctx: BrainDumpContext): string {
  const today = todayISO();
  const areaNames = ctx.areas.map((a) => a.name).join(", ");
  const skillNames = ctx.skills.map((s) => s.name).join(", ") || "(nessuna)";
  const peopleNames = ctx.people.map((p) => p.name).join(", ") || "(nessuna)";

  return `${SYSTEM_PROMPT}

context.today: ${today}
context.areas: ${areaNames}
context.skills: ${skillNames}
context.people: ${peopleNames}

INPUT:
${rawText.trim()}

OUTPUT (solo JSON array):`;
}

// ── Response parsing ──────────────────────────────────────────────────

export function parseResponse(text: string): Extracted[] {
  // Tenta di trovare il primo array JSON nel testo (l'LLM a volte aggiunge prosa).
  const m = text.match(/\[[\s\S]*\]/);
  if (!m) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(m[0]);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const out: Extracted[] = [];
  for (const raw of parsed) {
    if (!raw || typeof raw !== "object") continue;
    const obj = raw as Record<string, unknown>;
    const type = obj.type;
    if (typeof type !== "string") continue;

    const normalized = normalizeOne(type, obj);
    if (normalized) out.push(normalized);
  }
  return out;
}

function normalizeOne(
  type: string,
  obj: Record<string, unknown>,
): Extracted | null {
  switch (type) {
    case "mission":
      if (!obj.title || typeof obj.title !== "string") return null;
      return {
        kind: "mission",
        title: obj.title,
        priority: validPriority(obj.priority),
        areaName: typeof obj.areaName === "string" ? obj.areaName : undefined,
        notes: typeof obj.notes === "string" ? obj.notes : undefined,
      };
    case "routine_block":
      if (!obj.title || typeof obj.title !== "string") return null;
      return {
        kind: "routine_block",
        title: obj.title,
        startTime: typeof obj.startTime === "string" ? obj.startTime : undefined,
        endTime: typeof obj.endTime === "string" ? obj.endTime : undefined,
        days: validDays(obj.days),
        description:
          typeof obj.description === "string" ? obj.description : undefined,
      };
    case "skill":
      if (!obj.name || typeof obj.name !== "string") return null;
      return {
        kind: "skill",
        name: obj.name,
        areaName: typeof obj.areaName === "string" ? obj.areaName : undefined,
        description:
          typeof obj.description === "string" ? obj.description : undefined,
      };
    case "skill_resource":
      if (
        !obj.skillName ||
        typeof obj.skillName !== "string" ||
        !obj.title ||
        typeof obj.title !== "string"
      )
        return null;
      return {
        kind: "skill_resource",
        skillName: obj.skillName,
        title: obj.title,
        type: validResourceType(obj.type),
        url: typeof obj.url === "string" ? obj.url : undefined,
      };
    case "person":
      if (!obj.name || typeof obj.name !== "string") return null;
      return {
        kind: "person",
        name: obj.name,
        role: typeof obj.role === "string" ? obj.role : undefined,
        channel: validChannel(obj.channel),
      };
    case "touchpoint":
      if (!obj.personName || typeof obj.personName !== "string") return null;
      return {
        kind: "touchpoint",
        personName: obj.personName,
        dueDate: typeof obj.dueDate === "string" ? obj.dueDate : undefined,
        channel: validChannel(obj.channel),
        message: typeof obj.message === "string" ? obj.message : undefined,
      };
    case "victory":
      if (!obj.title || typeof obj.title !== "string") return null;
      return {
        kind: "victory",
        title: obj.title,
        story: typeof obj.story === "string" ? obj.story : undefined,
      };
    case "area":
      if (!obj.name || typeof obj.name !== "string") return null;
      return {
        kind: "area",
        name: obj.name,
        color: typeof obj.color === "string" ? obj.color : undefined,
      };
    default:
      return null;
  }
}

function validPriority(v: unknown): Priority | undefined {
  if (v === "high" || v === "mid" || v === "low") return v;
  return undefined;
}
function validDays(v: unknown): Weekday[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out: Weekday[] = [];
  for (const d of v) {
    if (typeof d === "number" && d >= 0 && d <= 6) {
      out.push(d as Weekday);
    }
  }
  return out.length > 0 ? out : undefined;
}
function validResourceType(
  v: unknown,
): "book" | "video" | "course" | "person" | "link" | "other" | undefined {
  if (
    v === "book" ||
    v === "video" ||
    v === "course" ||
    v === "person" ||
    v === "link" ||
    v === "other"
  )
    return v;
  return undefined;
}
function validChannel(v: unknown): TouchChannel | undefined {
  if (
    v === "message" ||
    v === "call" ||
    v === "email" ||
    v === "in-person" ||
    v === "other"
  )
    return v;
  return undefined;
}

// ── Commit ─────────────────────────────────────────────────────────────

/**
 * Scrive le entità selezionate su Dexie. Il sync-layer le spinge su Supabase
 * via Dexie hooks (automaticamente).
 *
 * Risolve i riferimenti per-nome: areaName → areaId esistente o creazione,
 * skillName → skillId, personName → personId.
 */
export async function commitExtracted(
  items: Extracted[],
  ctx: BrainDumpContext,
): Promise<{ created: number; skipped: number }> {
  let created = 0;
  let skipped = 0;

  // Mappe rapide per lookup nome → id
  const areaByName = new Map(ctx.areas.map((a) => [a.name.toLowerCase(), a]));
  const skillByName = new Map(
    ctx.skills.map((s) => [s.name.toLowerCase(), s]),
  );
  const personByName = new Map(
    ctx.people.map((p) => [p.name.toLowerCase(), p]),
  );

  async function resolveAreaId(name?: string): Promise<string | undefined> {
    if (!name) return undefined;
    const existing = areaByName.get(name.toLowerCase());
    if (existing) return existing.id;
    // Crea area on-the-fly
    const id = uid("a-");
    const newArea: Area = {
      id,
      name,
      color: "#b9a4ff",
      order: ctx.areas.length + areaByName.size,
    };
    await db.areas.add(newArea);
    areaByName.set(name.toLowerCase(), newArea);
    return id;
  }

  async function resolveSkillId(name?: string): Promise<string | undefined> {
    if (!name) return undefined;
    const existing = skillByName.get(name.toLowerCase());
    return existing?.id;
  }

  async function resolvePersonId(name?: string): Promise<string | undefined> {
    if (!name) return undefined;
    const existing = personByName.get(name.toLowerCase());
    if (existing) return existing.id;
    const id = uid("p-");
    const newPerson: Person = {
      id,
      name,
      createdAt: Date.now(),
    };
    await db.people.add(newPerson);
    personByName.set(name.toLowerCase(), newPerson);
    return id;
  }

  for (const item of items) {
    try {
      switch (item.kind) {
        case "mission": {
          await db.missions.add({
            id: uid("m-"),
            title: item.title,
            priority: item.priority ?? "mid",
            areaId: await resolveAreaId(item.areaName),
            notes: item.notes,
            done: false,
            createdAt: Date.now(),
            order: Date.now(),
          });
          created++;
          break;
        }
        case "routine_block": {
          await db.routineBlocks.add({
            id: uid("rb-"),
            title: item.title,
            startTime: item.startTime,
            endTime: item.endTime,
            description: item.description,
            days: item.days ?? [],
            order: Date.now(),
          });
          created++;
          break;
        }
        case "skill": {
          const areaId = await resolveAreaId(item.areaName);
          await db.skills.add({
            id: uid("s-"),
            name: item.name,
            areaId: areaId ?? ctx.areas[0]?.id ?? "",
            description: item.description,
            level: 0,
            order: Date.now(),
          });
          created++;
          break;
        }
        case "skill_resource": {
          const skillId = await resolveSkillId(item.skillName);
          if (!skillId) {
            skipped++;
            break;
          }
          await db.skillResources.add({
            id: uid("r-"),
            skillId,
            title: item.title,
            type: item.type ?? "other",
            url: item.url,
            done: false,
            createdAt: Date.now(),
          });
          created++;
          break;
        }
        case "person": {
          await db.people.add({
            id: uid("p-"),
            name: item.name,
            role: item.role,
            channel: item.channel,
            createdAt: Date.now(),
          });
          created++;
          break;
        }
        case "touchpoint": {
          const personId = await resolvePersonId(item.personName);
          if (!personId) {
            skipped++;
            break;
          }
          await db.touchpoints.add({
            id: uid("tp-"),
            personId,
            dueDate: item.dueDate ?? todayISO(),
            channel: item.channel ?? "message",
            message: item.message,
            done: false,
            createdAt: Date.now(),
          });
          created++;
          break;
        }
        case "victory": {
          await db.victories.add({
            id: uid("v-"),
            title: item.title,
            story: item.story ?? "",
            at: Date.now(),
          });
          created++;
          break;
        }
        case "area": {
          await db.areas.add({
            id: uid("a-"),
            name: item.name,
            color: item.color ?? "#b9a4ff",
            order: ctx.areas.length + 1,
          });
          created++;
          break;
        }
      }
    } catch (e) {
      console.warn("[brainDump] failed to commit item:", item, e);
      skipped++;
    }
  }

  return { created, skipped };
}

// ── Label helper per UI ────────────────────────────────────────────────
export function entityLabel(item: Extracted): string {
  switch (item.kind) {
    case "mission":
      return item.title;
    case "routine_block":
      return `${item.title}${item.startTime ? ` · ${item.startTime}` : ""}`;
    case "skill":
      return item.name;
    case "skill_resource":
      return `${item.title} (${item.type ?? "link"})`;
    case "person":
      return item.name;
    case "touchpoint":
      return `${item.personName}${item.dueDate ? ` · ${item.dueDate}` : ""}`;
    case "victory":
      return item.title;
    case "area":
      return item.name;
  }
}

export function entityKindLabel(kind: Extracted["kind"]): string {
  switch (kind) {
    case "mission":
      return "Missione";
    case "routine_block":
      return "Routine";
    case "skill":
      return "Skill";
    case "skill_resource":
      return "Risorsa";
    case "person":
      return "Persona";
    case "touchpoint":
      return "Follow-up";
    case "victory":
      return "Vittoria";
    case "area":
      return "Area";
  }
}
