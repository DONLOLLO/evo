import { NavLink } from "react-router-dom";
import { Home, ListChecks, Calendar, Network, Map } from "lucide-react";

const tabs = [
  { to: "/", label: "Oggi", icon: Home, end: true },
  { to: "/missioni", label: "Missioni", icon: ListChecks },
  { to: "/routine", label: "Routine", icon: Calendar },
  { to: "/rete", label: "Rete", icon: Network },
  { to: "/roadmap", label: "Rotta", icon: Map },
];

export default function BottomNav() {
  return (
    <nav
      className="fixed left-1/2 -translate-x-1/2 z-40 px-2"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
    >
      <ul className="glass-pill flex items-center gap-0.5 rounded-full p-1.5">
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                "flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-full min-w-[58px] transition-all " +
                (isActive
                  ? "bg-white/15 text-white"
                  : "text-ink-muted active:scale-95")
              }
            >
              <Icon size={20} strokeWidth={1.8} />
              <span className="text-[9.5px] font-semibold tracking-wide">
                {label}
              </span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
