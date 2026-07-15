import { useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { money } from "../lib/format";

export interface AllocSlice {
  name: string;
  value: number;
  allocation: number;
}

const RAD = Math.PI / 180;

type LabelProps = {
  cx: number;
  cy: number;
  midAngle: number;
  outerRadius: number;
  name: string;
  allocation: number;
};

/** Leader-line label around a big pie — room to breathe, unlike the inline card. */
function makeLabel(dark: boolean) {
  return function renderLabel({ cx, cy, midAngle, outerRadius, name, allocation }: LabelProps) {
    const sx = cx + outerRadius * Math.cos(-midAngle * RAD);
    const sy = cy + outerRadius * Math.sin(-midAngle * RAD);
    const ex = cx + (outerRadius + 24) * Math.cos(-midAngle * RAD);
    const ey = cy + (outerRadius + 24) * Math.sin(-midAngle * RAD);
    const isRight = Math.cos(-midAngle * RAD) >= 0;
    const tx = ex + (isRight ? 8 : -8);
    return (
      <g>
        <polyline
          points={`${sx},${sy} ${ex},${ey} ${tx},${ey}`}
          stroke={dark ? "#475569" : "#cbd5e1"}
          strokeWidth={1}
          fill="none"
        />
        <text
          x={tx + (isRight ? 3 : -3)}
          y={ey}
          textAnchor={isRight ? "start" : "end"}
          dominantBaseline="central"
          className="fill-slate-700 text-xs font-semibold dark:fill-slate-200"
        >
          {`${name} ${allocation.toFixed(1)}%`}
        </text>
      </g>
    );
  };
}

export function AllocationModal({
  data,
  colors,
  dark,
  total,
  onClose,
}: {
  data: AllocSlice[];
  colors: string[];
  dark: boolean;
  total: number;
  onClose: () => void;
}) {
  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl animate-fade-in-scale rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 dark:ring-1 dark:ring-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold dark:text-white">Allocation</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Total {money(total)} · {data.length} holdings
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-sm font-medium text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            Close
          </button>
        </div>

        <ResponsiveContainer width="100%" height={440}>
          <PieChart margin={{ top: 16, right: 104, bottom: 16, left: 104 }}>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={130}
              innerRadius={78}
              paddingAngle={2}
              label={makeLabel(dark)}
              labelLine={false}
              isAnimationActive
              animationBegin={120}
              animationDuration={900}
            >
              {data.map((_, i) => (
                <Cell
                  key={i}
                  fill={colors[i % colors.length]}
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
      </div>
    </div>
  );
}
