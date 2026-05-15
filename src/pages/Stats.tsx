import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../db/database";
import Layout from "../components/Layout";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Plus, Minus, ChevronDown } from "lucide-react";
import type { Stat } from "../types";

export default function StatsPage() {
  const stats = useLiveQuery(() => db.stats.toArray(), []);
  const history = useLiveQuery(() => db.statHistory.toArray(), []);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const radarData = useMemo(
    () =>
      (stats ?? [])
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((s) => ({ stat: s.name, value: s.value, fullMark: 100 })),
    [stats],
  );

  const avg = useMemo(() => {
    if (!stats || stats.length === 0) return 0;
    return Math.round(stats.reduce((s, x) => s + x.value, 0) / stats.length);
  }, [stats]);

  async function adjust(stat: Stat, delta: number) {
    const next = Math.max(0, Math.min(100, stat.value + delta));
    if (next === stat.value) return;
    await db.stats.update(stat.id, { value: next, updatedAt: Date.now() });
    await db.statHistory.add({
      statId: stat.id,
      value: next,
      at: Date.now(),
    });
  }

  return (
    <Layout title="Stats">
      <div className="mb-5 mt-1">
        <h1 className="display text-[36px] leading-none text-ink">Stats</h1>
        <p className="text-ink-muted text-[13px] mt-1.5 num">
          Media · <span className="text-ink">{avg}</span> / 100
        </p>
      </div>

      {/* ── Radar ─────────────────────────────────────────────────────── */}
      <div className="card mb-5 relative overflow-hidden flex justify-center">
        <div
          className="absolute inset-0 opacity-20 blur-3xl pointer-events-none"
          style={{
            background: "radial-gradient(circle at 50% 50%, #b9a4ff 0%, transparent 60%)",
          }}
        />
        <RadarChart
          width={320}
          height={280}
          data={radarData}
          outerRadius={100}
        >
          <PolarGrid stroke="rgba(255,255,255,0.10)" gridType="polygon" />
          <PolarAngleAxis
            dataKey="stat"
            tick={{ fill: "rgba(255,255,255,0.65)", fontSize: 11, fontWeight: 500 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={false}
            axisLine={false}
          />
          <Radar
            name="Valore"
            dataKey="value"
            stroke="#b9a4ff"
            strokeWidth={2}
            fill="#b9a4ff"
            fillOpacity={0.30}
            isAnimationActive={false}
          />
        </RadarChart>
      </div>

      {/* ── Lista stats ─────────────────────────────────────────────── */}
      <ul className="space-y-2">
        {(stats ?? [])
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((s) => {
            const expanded = expandedId === s.id;
            const hist = (history ?? [])
              .filter((h) => h.statId === s.id)
              .sort((a, b) => a.at - b.at)
              .map((h) => ({ at: h.at, value: h.value }));
            const chartData = hist.length > 0 ? hist.slice(-12) : [];
            return (
              <li key={s.id} className="card overflow-hidden">
                <button
                  onClick={() => setExpandedId(expanded ? null : s.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-baseline justify-between mb-3">
                    <span className="text-[12px] uppercase font-semibold tracking-[0.14em] text-ink-dim">
                      {s.name}
                    </span>
                    <span className="text-ink-quiet">
                      <ChevronDown
                        size={16}
                        style={{
                          transform: expanded ? "rotate(180deg)" : "none",
                          transition: "transform 0.3s",
                        }}
                      />
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span
                      className="display-num text-[44px] leading-none"
                      style={{ color: s.color }}
                    >
                      {s.value}
                    </span>
                    <span className="text-[15px] text-ink-quiet">/ 100</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${s.value}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{
                        background: s.color,
                        boxShadow: `0 0 12px ${s.color}80`,
                      }}
                    />
                  </div>
                </button>

                <AnimatePresence>
                  {expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-4 mt-4 border-t-[0.5px] border-white/10 space-y-3">
                        {s.description && (
                          <p className="text-[13px] text-ink-dim leading-relaxed">
                            {s.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="flex gap-2">
                            <button
                              onClick={() => adjust(s, -1)}
                              className="w-11 h-11 rounded-full glass-thin flex items-center justify-center active:scale-90 transition-transform"
                            >
                              <Minus size={16} />
                            </button>
                            <button
                              onClick={() => adjust(s, +1)}
                              className="w-11 h-11 rounded-full glass-thin flex items-center justify-center active:scale-90 transition-transform"
                              style={{
                                background: `${s.color}22`,
                                borderColor: `${s.color}55`,
                                color: s.color,
                              }}
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                          <span className="text-[11px] text-ink-muted num">
                            {hist.length} aggiornamenti
                          </span>
                        </div>

                        {chartData.length > 1 && (
                          <div className="h-24 -mx-1">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={chartData}>
                                <XAxis dataKey="at" hide />
                                <YAxis domain={[0, 100]} hide />
                                <Tooltip
                                  contentStyle={{
                                    background: "rgba(20,20,28,0.9)",
                                    backdropFilter: "blur(20px)",
                                    border: "0.5px solid rgba(255,255,255,0.15)",
                                    borderRadius: 12,
                                    fontSize: 11,
                                    color: "#fff",
                                  }}
                                  labelFormatter={(t) =>
                                    new Date(t as number).toLocaleDateString("it-IT")
                                  }
                                  formatter={(v) => [v, s.name]}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="value"
                                  stroke={s.color}
                                  strokeWidth={2.5}
                                  dot={{ r: 3, fill: s.color, stroke: "none" }}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
      </ul>
    </Layout>
  );
}
