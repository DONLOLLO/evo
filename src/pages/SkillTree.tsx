import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../db/database";
import Layout from "../components/Layout";
import { Sheet } from "./Missions";
import { uid } from "../lib/date";
import {
  Plus,
  BookOpen,
  Video,
  Link as LinkIcon,
  User,
  GraduationCap,
  Trash2,
  Check,
  X,
  Play,
  ExternalLink,
} from "lucide-react";
import type { Skill, SkillResource, SkillAction, Priority } from "../types";

const resourceIcons = {
  book: BookOpen,
  video: Video,
  course: GraduationCap,
  person: User,
  link: LinkIcon,
  other: LinkIcon,
} as const;

export default function SkillTree() {
  const areas = useLiveQuery(() => db.areas.toArray(), []);
  const skills = useLiveQuery(() => db.skills.toArray(), []);
  const resources = useLiveQuery(() => db.skillResources.toArray(), []);
  const actions = useLiveQuery(() => db.skillActions.toArray(), []);
  const [openSkillId, setOpenSkillId] = useState<string | null>(null);
  const [showNewSkill, setShowNewSkill] = useState<string | null>(null);

  const openSkill = useMemo(
    () => (skills ?? []).find((s) => s.id === openSkillId),
    [skills, openSkillId],
  );

  async function deleteSkill(id: string) {
    if (!confirm("Cancellare questa skill? Si perderanno anche risorse e azioni associate."))
      return;
    // Cascade soft-delete su risorse/azioni della skill
    const res = await db.skillResources.where("skillId").equals(id).toArray();
    const acts = await db.skillActions.where("skillId").equals(id).toArray();
    await Promise.all([
      ...res.map((r) => db.skillResources.delete(r.id)),
      ...acts.map((a) => db.skillActions.delete(a.id)),
    ]);
    await db.skills.delete(id);
    setOpenSkillId(null);
  }

  return (
    <Layout title="Skill">
      <div className="mb-5 mt-1">
        <h1 className="display text-[36px] leading-none text-ink">Skill</h1>
        <p className="text-ink-muted text-[13px] mt-1.5">
          {(skills ?? []).length} skill in {(areas ?? []).length} aree
        </p>
      </div>

      <div className="space-y-6">
        {(areas ?? [])
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((area) => {
            const areaSkills = (skills ?? []).filter((s) => s.areaId === area.id);
            return (
              <section key={area.id}>
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{
                        background: area.color,
                        boxShadow: `0 0 10px ${area.color}`,
                      }}
                    />
                    <h3
                      className="text-[12px] uppercase font-semibold tracking-[0.14em]"
                      style={{ color: area.color }}
                    >
                      {area.name}
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowNewSkill(area.id)}
                    className="p-1.5 text-ink-quiet active:scale-90 transition-transform"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                {areaSkills.length === 0 ? (
                  <div className="card text-center text-ink-muted text-[13px] py-5">
                    Nessuna skill in {area.name}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {areaSkills.map((s) => {
                      const skillRes = (resources ?? []).filter((r) => r.skillId === s.id);
                      const skillAct = (actions ?? []).filter((a) => a.skillId === s.id);
                      return (
                        <button
                          key={s.id}
                          onClick={() => setOpenSkillId(s.id)}
                          className="card !p-4 text-left active:scale-[0.97] transition-transform relative overflow-hidden"
                          style={{ borderColor: `${area.color}30` }}
                        >
                          <div
                            className="absolute -top-10 -right-10 w-24 h-24 rounded-full opacity-25 blur-2xl pointer-events-none"
                            style={{ background: area.color }}
                          />
                          <p className="text-[14px] font-semibold text-ink leading-tight mb-2 relative">
                            {s.name}
                          </p>
                          <div className="flex items-center gap-1.5 text-[10.5px] text-ink-muted num relative">
                            <span className="font-semibold" style={{ color: area.color }}>
                              Lv {s.level}
                            </span>
                            <span>·</span>
                            <span>{skillRes.length} ris.</span>
                            <span>·</span>
                            <span>{skillAct.length} az.</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
      </div>

      {openSkill && (
        <SkillDetail
          skill={openSkill}
          areas={areas ?? []}
          areaColor={areas?.find((a) => a.id === openSkill.areaId)?.color ?? "#b9a4ff"}
          resources={(resources ?? []).filter((r) => r.skillId === openSkill.id)}
          actions={(actions ?? []).filter((a) => a.skillId === openSkill.id)}
          onClose={() => setOpenSkillId(null)}
          onDelete={() => deleteSkill(openSkill.id)}
        />
      )}

      {showNewSkill && (
        <NewSkillSheet
          areaId={showNewSkill}
          onClose={() => setShowNewSkill(null)}
        />
      )}
    </Layout>
  );
}

function SkillDetail({
  skill,
  areas,
  areaColor,
  resources,
  actions,
  onClose,
  onDelete,
}: {
  skill: Skill;
  areas: import("../types").Area[];
  areaColor: string;
  resources: SkillResource[];
  actions: SkillAction[];
  onClose: () => void;
  onDelete: () => void;
}) {
  const [tab, setTab] = useState<"info" | "resources" | "actions">("info");
  const [newResTitle, setNewResTitle] = useState("");
  const [newResType, setNewResType] = useState<SkillResource["type"]>("book");
  const [newResUrl, setNewResUrl] = useState("");
  const [newActTitle, setNewActTitle] = useState("");
  const [newActRecurring, setNewActRecurring] = useState(false);
  const [desc, setDesc] = useState(skill.description ?? "");
  const [name, setName] = useState(skill.name);
  const [editingName, setEditingName] = useState(false);

  async function addResource() {
    if (!newResTitle.trim()) return;
    await db.skillResources.add({
      id: uid("r-"),
      skillId: skill.id,
      title: newResTitle.trim(),
      type: newResType,
      url: newResUrl.trim() || undefined,
      done: false,
      createdAt: Date.now(),
    });
    setNewResTitle("");
    setNewResUrl("");
  }
  async function toggleResource(r: SkillResource) {
    await db.skillResources.update(r.id, { done: !r.done });
  }
  async function deleteResource(id: string) {
    await db.skillResources.delete(id);
  }
  async function addAction() {
    if (!newActTitle.trim()) return;
    await db.skillActions.add({
      id: uid("a-"),
      skillId: skill.id,
      title: newActTitle.trim(),
      recurring: newActRecurring,
      createdAt: Date.now(),
    });
    setNewActTitle("");
    setNewActRecurring(false);
  }
  async function deleteAction(id: string) {
    await db.skillActions.delete(id);
  }
  async function promoteActionToMission(action: SkillAction) {
    await db.missions.add({
      id: uid("m-"),
      title: action.title,
      skillId: skill.id,
      areaId: skill.areaId,
      priority: "mid" as Priority,
      done: false,
      createdAt: Date.now(),
      order: Date.now(),
    });
  }
  async function saveDesc() {
    await db.skills.update(skill.id, { description: desc.trim() || undefined });
  }
  async function saveName() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === skill.name) {
      setName(skill.name);
      setEditingName(false);
      return;
    }
    await db.skills.update(skill.id, { name: trimmed });
    setEditingName(false);
  }
  async function changeArea(areaId: string) {
    await db.skills.update(skill.id, { areaId });
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 280, damping: 30 }}
        className="glass-thick absolute inset-x-0 bottom-0 top-16 rounded-t-3xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 6rem)" }}
      >
        <div
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full opacity-30 blur-3xl pointer-events-none"
          style={{ background: areaColor }}
        />

        <div className="sticky top-0 z-10 px-5 pt-5 pb-3 glass-thick border-b-[0.5px] border-white/10">
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <p
                className="text-[10px] uppercase font-semibold tracking-[0.14em]"
                style={{ color: areaColor }}
              >
                Lv {skill.level}
              </p>
              {editingName ? (
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={saveName}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    if (e.key === "Escape") {
                      setName(skill.name);
                      setEditingName(false);
                    }
                  }}
                  className="display text-[26px] leading-tight mt-0.5 bg-transparent border-b border-white/30 focus:border-white/70 outline-none w-full"
                />
              ) : (
                <button
                  onClick={() => setEditingName(true)}
                  className="display text-[26px] leading-tight mt-0.5 text-left w-full active:opacity-70"
                >
                  {skill.name}
                </button>
              )}
            </div>
            <button onClick={onClose} className="text-ink-muted p-1">
              <X size={22} />
            </button>
          </div>
          <div className="glass-thin rounded-2xl p-1 flex gap-0.5">
            {(["info", "resources", "actions"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2 rounded-xl text-[12.5px] font-medium transition-all ${
                  tab === t ? "bg-white/15 text-ink" : "text-ink-muted active:scale-95"
                }`}
              >
                {t === "info"
                  ? "Info"
                  : t === "resources"
                    ? `Risorse (${resources.length})`
                    : `Azioni (${actions.length})`}
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 pt-4 relative">
          {tab === "info" && (
            <div className="space-y-5">
              <div>
                <p className="eyebrow mb-2">Descrizione · Perché</p>
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  onBlur={saveDesc}
                  rows={6}
                  placeholder="Cosa significa questa skill per te? Perché vuoi svilupparla?"
                  className="input w-full resize-none text-[14.5px] leading-relaxed"
                />
              </div>

              <div>
                <p className="eyebrow mb-2">Area</p>
                <div className="flex flex-wrap gap-1.5">
                  {areas.map((a) => {
                    const active = skill.areaId === a.id;
                    return (
                      <button
                        key={a.id}
                        onClick={() => changeArea(a.id)}
                        className="chip"
                        style={{
                          color: active ? a.color : "rgba(255,255,255,0.7)",
                          background: active ? `${a.color}1a` : undefined,
                          borderColor: active ? `${a.color}55` : undefined,
                        }}
                      >
                        {a.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={onDelete}
                  className="btn-ghost w-full inline-flex items-center justify-center gap-2 text-sys-red"
                  style={{
                    borderColor: "rgba(255,107,122,0.35)",
                  }}
                >
                  <Trash2 size={14} />
                  Cancella skill
                </button>
              </div>
            </div>
          )}

          {tab === "resources" && (
            <div>
              <div className="card mb-3 space-y-2">
                <input
                  value={newResTitle}
                  onChange={(e) => setNewResTitle(e.target.value)}
                  placeholder="Titolo (es. Influence — Cialdini)"
                  className="input w-full"
                />
                <input
                  value={newResUrl}
                  onChange={(e) => setNewResUrl(e.target.value)}
                  placeholder="URL (opzionale)"
                  className="input w-full"
                />
                <div className="flex gap-1.5 flex-wrap">
                  {(["book", "video", "course", "person", "link"] as const).map((t) => {
                    const Icon = resourceIcons[t];
                    const active = newResType === t;
                    return (
                      <button
                        key={t}
                        onClick={() => setNewResType(t)}
                        className={`chip ${active ? "chip-active" : ""} inline-flex items-center gap-1`}
                      >
                        <Icon size={11} /> {t}
                      </button>
                    );
                  })}
                </div>
                <button onClick={addResource} className="btn-accent w-full">
                  Aggiungi risorsa
                </button>
              </div>

              <ul className="space-y-1.5">
                {resources.map((r) => {
                  const Icon = resourceIcons[r.type];
                  return (
                    <li
                      key={r.id}
                      className={`card !p-3.5 flex items-center gap-3 ${r.done ? "opacity-50" : ""}`}
                    >
                      <button
                        onClick={() => toggleResource(r)}
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                          r.done ? "bg-sys-green" : "border-[1.5px] border-white/25"
                        }`}
                      >
                        {r.done && (
                          <Check size={13} strokeWidth={3} className="text-bg-deep" />
                        )}
                      </button>
                      <Icon size={14} className="text-ink-muted flex-shrink-0" />
                      <span className={`text-[14px] flex-1 min-w-0 truncate ${r.done ? "line-through" : ""}`}>
                        {r.title}
                      </span>
                      {r.url && (
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-ink-muted p-1 active:scale-90"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                      <button
                        onClick={() => deleteResource(r.id)}
                        className="text-ink-quiet p-1 active:scale-90"
                      >
                        <Trash2 size={14} />
                      </button>
                    </li>
                  );
                })}
                {resources.length === 0 && (
                  <div className="text-center text-ink-muted text-[13px] py-6">
                    Nessuna risorsa.
                  </div>
                )}
              </ul>
            </div>
          )}

          {tab === "actions" && (
            <div>
              <div className="card mb-3 space-y-2">
                <input
                  value={newActTitle}
                  onChange={(e) => setNewActTitle(e.target.value)}
                  placeholder="Azione (es. Leggi 1 capitolo)"
                  className="input w-full"
                />
                <label className="flex items-center gap-2 text-[13px] text-ink-dim cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newActRecurring}
                    onChange={(e) => setNewActRecurring(e.target.checked)}
                  />
                  Azione ricorrente
                </label>
                <button onClick={addAction} className="btn-accent w-full">
                  Aggiungi azione
                </button>
              </div>

              <ul className="space-y-1.5">
                {actions.map((a) => (
                  <li key={a.id} className="card !p-3.5 flex items-center gap-2">
                    <span className="text-[14px] flex-1 min-w-0">{a.title}</span>
                    {a.recurring && (
                      <span
                        className="chip"
                        style={{
                          color: "#7EE8D7",
                          borderColor: "rgba(126,232,215,0.5)",
                          background: "rgba(126,232,215,0.10)",
                        }}
                      >
                        ricorrente
                      </span>
                    )}
                    <button
                      onClick={() => promoteActionToMission(a)}
                      className="p-1.5 text-accent active:scale-90"
                      aria-label="A Missioni"
                    >
                      <Play size={15} />
                    </button>
                    <button
                      onClick={() => deleteAction(a.id)}
                      className="p-1.5 text-ink-quiet active:scale-90"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
                {actions.length === 0 && (
                  <div className="text-center text-ink-muted text-[13px] py-6">
                    Nessuna azione.
                  </div>
                )}
              </ul>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function NewSkillSheet({
  areaId,
  onClose,
}: {
  areaId: string;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  async function save() {
    if (!name.trim()) return;
    await db.skills.add({
      id: uid("s-"),
      name: name.trim(),
      areaId,
      level: 0,
      description: description.trim() || undefined,
      order: Date.now(),
    });
    onClose();
  }

  return (
    <Sheet onClose={onClose} title="Nuova skill">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome skill"
        className="input w-full mb-3"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Descrizione (opzionale)"
        rows={3}
        className="input w-full mb-5 resize-none"
      />
      <div className="grid grid-cols-2 gap-2">
        <button onClick={onClose} className="btn-ghost">Annulla</button>
        <button onClick={save} className="btn-primary">Salva</button>
      </div>
    </Sheet>
  );
}

// AnimatePresence unused warning fix
void AnimatePresence;
