import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Position } from "../lib/types";
import { num, money } from "../lib/format";
import { useTheme } from "../hooks/useTheme";

const COLORS = [
  "#0ea5e9", "#6366f1", "#f59e0b", "#10b981", "#ef4444",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#64748b",
];

export function AllocationPie({ positions }: { positions: Position[] }) {
  const { theme } = useTheme();
  const dark = theme === "dark";
  const data = positions
    .filter((p) => p.marketValue && num(p.marketValue) > 0)
    .map((p) => ({
      name: p.symbol,
      value: num(p.marketValue),
      allocation: num(p.allocationPct),
    }))
    .sort((a, b) => b.allocation - a.allocation);

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-400">
        No priced positions to chart
      </div>
    );
  }

  return (
    <div>
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
    </div>
  );
}
