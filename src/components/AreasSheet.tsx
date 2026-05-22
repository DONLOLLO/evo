import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/database";
import { Sheet } from "../pages/Missions";
import { uid } from "../lib/date";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import type { Area } from "../types";

const PALETTE = [
  "#e8c56d",
  "#5dd4c4",
  "#e85d7a",
  "#a987e8",
  "#e89a5d",
  "#7ad48b",
  "#5d9ae8",
  "#b9a4ff",
  "#ffd479",
  "#ff6b7a",
];

export default function AreasSheet({ onClose }: { onClose: () => void }) {
  const areas = useLiveQuery(() => db.areas.toArray(), []);
  const missions = useLiveQuery(() => db.missions.toArray(), []);
  const skills = useLiveQuery(() => db.skills.toArray(), []);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  const sorted = (areas ?? []).slice().sort((a, b) => a.order - b.order);

  async function remove(a: Area) {
    const inUse =
      (missions ?? []).some((m) => m.areaId === a.id) ||
      (skills ?? []).some((s) => s.areaId === a.id);
    if (inUse) {
      if (
        !confirm(
          `"${a.name}" è usata da missioni o skill. Cancellandola, quelle perderanno il riferimento all'area. Procedo?`,
        )
      )
        return;
    } else if (!confirm(`Cancellare "${a.name}"?`)) {
      return;
    }
    await db.areas.delete(a.id);
  }

  return (
    <Sheet onClose={onClose} title="Aree" orb="#b9a4ff">
      <p className="text-ink-muted text-[12.5px] mb-4">
        Le aree categorizzano missioni, skill e roadmap. Crea le tue.
      </p>

      <ul className="space-y-1.5 max-h-[55vh] overflow-y-auto -mx-1 px-1 mb-3">
        {sorted.map((a) => {
          if (editingId === a.id) {
            return (
              <AreaEditRow
                key={a.id}
                area={a}
                onDone={() => setEditingId(null)}
              />
            );
          }
          return (
            <li
              key={a.id}
              className="card !p-3 flex items-center gap-3"
            >
              <div
                className="w-5 h-5 rounded-full flex-shrink-0"
                style={{
                  background: a.color,
                  boxShadow: `0 0 12px ${a.color}80`,
                }}
              />
              <p className="flex-1 text-[14.5px] text-ink">{a.name}</p>
              <button
                onClick={() => setEditingId(a.id)}
                className="p-1.5 text-ink-quiet active:scale-90"
                aria-label="Modifica area"
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={() => remove(a)}
                className="p-1.5 text-ink-quiet active:scale-90"
                aria-label="Cancella area"
              >
                <Trash2 size={13} />
              </button>
            </li>
          );
        })}

        {showNew && (
          <AreaNewRow
            nextOrder={sorted.length}
            onDone={() => setShowNew(false)}
          />
        )}
      </ul>

      {!showNew && (
        <button
          onClick={() => setShowNew(true)}
          className="btn-ghost w-full inline-flex items-center justify-center gap-2"
        >
          <Plus size={16} />
          Nuova area
        </button>
      )}
    </Sheet>
  );
}

function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {PALETTE.map((c) => {
        const active = c === value;
        return (
          <button
            key={c}
            onClick={() => onChange(c)}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-transform active:scale-90"
            style={{
              background: c,
              boxShadow: active
                ? `0 0 0 2px white, 0 0 14px ${c}aa`
                : `0 0 8px ${c}55`,
            }}
            aria-label={`Colore ${c}`}
          >
            {active && <Check size={12} strokeWidth={3} className="text-bg-deep" />}
          </button>
        );
      })}
    </div>
  );
}

function AreaEditRow({
  area,
  onDone,
}: {
  area: Area;
  onDone: () => void;
}) {
  const [name, setName] = useState(area.name);
  const [color, setColor] = useState(area.color);

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) return;
    await db.areas.update(area.id, { name: trimmed, color });
    onDone();
  }

  return (
    <li className="card !p-3.5 space-y-2.5">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome area"
        className="input w-full"
      />
      <ColorPicker value={color} onChange={setColor} />
      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          onClick={onDone}
          className="btn-ghost text-[13px] py-2 inline-flex items-center justify-center gap-1"
        >
          <X size={14} /> Annulla
        </button>
        <button
          onClick={save}
          className="btn-primary text-[13px] py-2 inline-flex items-center justify-center gap-1"
        >
          <Check size={14} /> Salva
        </button>
      </div>
    </li>
  );
}

function AreaNewRow({
  nextOrder,
  onDone,
}: {
  nextOrder: number;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(PALETTE[0]);

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) return;
    await db.areas.add({
      id: uid("a-"),
      name: trimmed,
      color,
      order: nextOrder,
    });
    onDone();
  }

  return (
    <li className="card !p-3.5 space-y-2.5">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome nuova area"
        className="input w-full"
      />
      <ColorPicker value={color} onChange={setColor} />
      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          onClick={onDone}
          className="btn-ghost text-[13px] py-2 inline-flex items-center justify-center gap-1"
        >
          <X size={14} /> Annulla
        </button>
        <button
          onClick={save}
          className="btn-primary text-[13px] py-2 inline-flex items-center justify-center gap-1"
          disabled={!name.trim()}
        >
          <Check size={14} /> Crea
        </button>
      </div>
    </li>
  );
}
