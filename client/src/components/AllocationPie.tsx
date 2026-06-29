import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Position } from "../lib/types";
import { num } from "../lib/format";
import { useTheme } from "../hooks/useTheme";
import { useMoney } from "../hooks/useCurrency";

const COLORS = [
  "#0ea5e9", "#6366f1", "#f59e0b", "#10b981", "#ef4444",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#64748b",
];

const RAD = Math.PI / 180;

type LabelProps = {
  cx: number;
  cy: number;
  midAngle: number;
  outerRadius: number;
  name?: string;
  allocation?: number;
};

function renderLabel({ cx, cy, midAngle, outerRadius, name, allocation }: LabelProps) {
  // จุดบนเส้นรอบวงที่ slice ชี้ออกมา
  const sx = cx + outerRadius * Math.cos(-midAngle * RAD);
  const sy = cy + outerRadius * Math.sin(-midAngle * RAD);
  // ปลายเส้นนำสายตา ยื่นออกไปอีกนิด
  const ex = cx + (outerRadius + 16) * Math.cos(-midAngle * RAD);
  const ey = cy + (outerRadius + 16) * Math.sin(-midAngle * RAD);
  const isRight = Math.cos(-midAngle * RAD) >= 0;
  const tx = ex + (isRight ? 6 : -6);

  return (
    <g>
      <polyline
        points={`${sx},${sy} ${ex},${ey} ${tx},${ey}`}
        stroke="#cbd5e1"
        strokeWidth={1}
        fill="none"
      />
      <text
        x={tx + (isRight ? 2 : -2)}
        y={ey}
        textAnchor={isRight ? "start" : "end"}
        dominantBaseline="central"
        className="fill-slate-600 text-xs dark:fill-slate-300"
      >
        {`${name ?? ""} ${(allocation ?? 0).toFixed(1)}%`}
      </text>
    </g>
  );
}

export function AllocationPie({ positions }: { positions: Position[] }) {
  const { theme } = useTheme();
  const { money } = useMoney();
  const dark = theme === "dark";
  const data = positions
    .filter((p) => p.marketValue && num(p.marketValue) > 0)
    .map((p) => ({
      name: p.symbol,
      value: num(p.marketValue),
      allocation: num(p.allocationPct),
    }))
    .sort((a, b) => a.allocation - b.allocation);

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-400">
        No priced positions to chart
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart margin={{ top: 8, right: 80, bottom: 8, left: 80 }}>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={80}
          innerRadius={40}
          paddingAngle={2}
          label={renderLabel}
          labelLine={false}
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
        <Legend wrapperStyle={dark ? { color: "#cbd5e1" } : undefined} />
      </PieChart>
    </ResponsiveContainer>
  );
}
