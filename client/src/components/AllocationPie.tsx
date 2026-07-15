import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Position } from "../lib/types";
import { num, money } from "../lib/format";
import { useTheme } from "../hooks/useTheme";
import { AllocationModal } from "./AllocationModal";

const COLORS = [
  "#0ea5e9", "#6366f1", "#f59e0b", "#10b981", "#ef4444",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#64748b",
];

export function AllocationPie({ positions }: { positions: Position[] }) {
  const { theme } = useTheme();
  const dark = theme === "dark";
  const [expanded, setExpanded] = useState(false);
  const data = positions
    .filter((p) => p.marketValue && num(p.marketValue) > 0)
    .map((p) => ({
      name: p.symbol,
      value: num(p.marketValue),
      allocation: num(p.allocationPct),
    }))
    .sort((a, b) => b.allocation - a.allocation);

  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-400">
        No priced positions to chart
      </div>
    );
  }

  return (
    <div>
      <div className="relative">
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={95}
              innerRadius={58}
              paddingAngle={2}
            >
            {data.map((_, i) => (
              <Cell
                key={i}
                fill={COLORS[i % COLORS.length]}
                stroke={dark ? "#0f172a" : "#ffffff"}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string) => [money(value), name]}
            contentStyle={
              dark
                ? { background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0" }
                : undefined
            }
            itemStyle={dark ? { color: "#e2e8f0" } : undefined}
            labelStyle={dark ? { color: "#e2e8f0" } : undefined}
          />
          </PieChart>
        </ResponsiveContainer>

        {/* Center button: opens the full-size allocation view. */}
        <button
          type="button"
          onClick={() => setExpanded(true)}
          aria-label="View full allocation breakdown"
          className="group absolute left-1/2 top-1/2 flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full text-center transition hover:bg-slate-100/70 dark:hover:bg-slate-800/60"
        >
          <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
            Total
          </span>
          <span className="max-w-[104px] truncate text-sm font-bold text-slate-900 dark:text-white">
            {money(total)}
          </span>
          <span className="mt-0.5 flex items-center gap-0.5 text-[10px] font-semibold text-sky-500 opacity-80 transition group-hover:opacity-100">
            Expand
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 transition-transform group-hover:scale-110">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            </svg>
          </span>
        </button>
      </div>

      {/* Custom legend: scales cleanly to many holdings, no overlapping labels. */}
      <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex min-w-0 items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ background: COLORS[i % COLORS.length] }}
              />
              <span className="truncate font-medium text-slate-700 dark:text-slate-200">
                {d.name}
              </span>
            </span>
            <span className="shrink-0 tabular-nums text-slate-500 dark:text-slate-400">
              {d.allocation.toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>

      {expanded && (
        <AllocationModal
          data={data}
          colors={COLORS}
          dark={dark}
          total={total}
          onClose={() => setExpanded(false)}
        />
      )}
    </div>
  );
}
