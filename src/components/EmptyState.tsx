import type { ReactNode, CSSProperties } from "react";

interface EmptyStateProps {
  icon: React.ComponentType<{
    size?: number;
    className?: string;
    strokeWidth?: number;
    style?: CSSProperties;
  }>;
  title: string;
  subtitle?: string;
  accent?: string;
  cta?: ReactNode;
}

/**
 * Empty state riutilizzabile. Pattern: icona in un cerchio sottile + titolo
 * + sottotitolo invitante + opzionale CTA. Sostituisce il "Nessun X." bare.
 */
export default function EmptyState({
  icon: Icon,
  title,
  subtitle,
  accent = "#b9a4ff",
  cta,
}: EmptyStateProps) {
  return (
    <div className="card flex flex-col items-center text-center py-10 px-6">
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
        style={{
          background: `${accent}1f`,
          border: `0.5px solid ${accent}55`,
        }}
      >
        <Icon size={22} strokeWidth={1.8} style={{ color: accent }} />
      </div>
      <p className="text-ink text-[15.5px] mb-1.5 max-w-[260px]">{title}</p>
      {subtitle && (
        <p className="text-ink-muted text-[12.5px] leading-relaxed max-w-[280px]">
          {subtitle}
        </p>
      )}
      {cta && <div className="mt-5">{cta}</div>}
    </div>
  );
}
