import { useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  Heart,
  GitBranch,
  Flame,
  Cloud,
  CloudOff,
} from "lucide-react";
import { useAppStore } from "../stores/useAppStore";
import { useAuthStore } from "../stores/useAuthStore";
import AccountSheet from "./AccountSheet";

export default function TopBar({ title }: { title: string }) {
  const streak = useAppStore((s) => s.settings?.streakCount ?? 0);
  const cloudConfigured = useAuthStore((s) => s.configured);
  const session = useAuthStore((s) => s.session);
  const syncing = useAuthStore((s) => s.syncing);
  const [showAccount, setShowAccount] = useState(false);

  const cloudOn = !!session;

  return (
    <>
      <header className="sticky top-0 z-30 glass-medium border-b-0">
        <div className="flex items-center justify-between px-5 h-14">
          <h1 className="eyebrow text-ink">{title}</h1>
          <div className="flex items-center gap-1">
            <div className="chip num text-sys-orange inline-flex items-center gap-1 mr-1">
              <Flame size={12} strokeWidth={2.2} />
              <span>{streak}</span>
            </div>
            {cloudConfigured && (
              <button
                onClick={() => setShowAccount(true)}
                className={`p-2 active:scale-90 transition-transform ${
                  cloudOn ? "text-accent" : "text-ink-quiet"
                }`}
                aria-label={cloudOn ? "Account" : "Login"}
              >
                {cloudOn ? (
                  <Cloud
                    size={19}
                    strokeWidth={1.8}
                    className={syncing ? "animate-pulse" : ""}
                  />
                ) : (
                  <CloudOff size={19} strokeWidth={1.8} />
                )}
              </button>
            )}
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
      {showAccount && <AccountSheet onClose={() => setShowAccount(false)} />}
    </>
  );
}
