import type { Priority } from "../types";

export const priorityHue: Record<Priority, string> = {
  high: "#FF6B7A",
  mid: "#FFC857",
  low: "rgba(255,255,255,0.35)",
};

export const priorityLabels: Record<Priority, string> = {
  high: "Prioritaria",
  mid: "Importante",
  low: "Quando si può",
};

export default function PriorityDot({
  priority,
  size = 8,
  withLabel = false,
}: {
  priority: Priority;
  size?: number;
  withLabel?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block rounded-full"
        style={{
          width: size,
          height: size,
          background: priorityHue[priority],
          boxShadow: `0 0 ${size * 1.2}px ${priorityHue[priority]}80`,
        }}
      />
      {withLabel && (
        <span
          className="text-[10px] uppercase font-semibold tracking-[0.12em]"
          style={{ color: priorityHue[priority] }}
        >
          {priorityLabels[priority]}
        </span>
      )}
    </span>
  );
}
