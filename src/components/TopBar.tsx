import { Link } from "react-router-dom";
import { BarChart3, Heart, GitBranch, Flame } from "lucide-react";
import { useAppStore } from "../stores/useAppStore";

export default function TopBar({ title }: { title: string }) {
  const streak = useAppStore((s) => s.settings?.streakCount ?? 0);
  return (
    <header className="sticky top-0 z-30 glass-medium border-b-0">
      <div className="flex items-center justify-between px-5 h-14">
        <h1 className="eyebrow text-ink">{title}</h1>
        <div className="flex items-center gap-1">
          <div className="chip num text-sys-orange inline-flex items-center gap-1 mr-1">
            <Flame size={12} strokeWidth={2.2} />
            <span>{streak}</span>
          </div>
          <Link
            to="/skill"
            className="p-2 text-ink-muted active:scale-90 transition-transform"
            aria-label="Skill"
          >
            <GitBranch size={19} strokeWidth={1.8} />
          </Link>
          <Link
            to="/stats"
            className="p-2 text-ink-muted active:scale-90 transition-transform"
            aria-label="Stats"
          >
            <BarChart3 size={19} strokeWidth={1.8} />
          </Link>
          <Link
            to="/motivation"
            className="p-2 text-ink-muted active:scale-90 transition-transform"
            aria-label="Motivation"
          >
            <Heart size={19} strokeWidth={1.8} />
          </Link>
        </div>
      </div>
    </header>
  );
}
