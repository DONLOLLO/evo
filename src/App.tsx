import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAppStore } from "./stores/useAppStore";
import Home from "./pages/Home";
import Missions from "./pages/Missions";
import Routine from "./pages/Routine";
import SkillTree from "./pages/SkillTree";
import Roadmap from "./pages/Roadmap";
import Stats from "./pages/Stats";
import Motivation from "./pages/Motivation";
import Rete from "./pages/Rete";

export default function App() {
  const ready = useAppStore((s) => s.ready);
  const init = useAppStore((s) => s.init);

  useEffect(() => {
    init();
  }, [init]);

  if (!ready) {
    return (
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="aurora">
          <div className="aurora-orb aurora-1" />
          <div className="aurora-orb aurora-2" />
          <div className="aurora-veil" />
        </div>
        <div className="relative flex flex-col items-center gap-5 animate-fade-in">
          <svg viewBox="0 0 64 64" className="w-16 h-16">
            <circle cx="32" cy="32" r="20" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="32" cy="32" r="3" fill="white" />
          </svg>
          <span className="display text-[28px] tracking-tight-4 text-ink">EVO</span>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/missioni" element={<Missions />} />
      <Route path="/routine" element={<Routine />} />
      <Route path="/skill" element={<SkillTree />} />
      <Route path="/roadmap" element={<Roadmap />} />
      <Route path="/rete" element={<Rete />} />
      <Route path="/stats" element={<Stats />} />
      <Route path="/motivation" element={<Motivation />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
