import { useState } from "react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from "recharts";
import { usePortfolioHistory } from "../hooks/usePortfolio";
import { useTheme } from "../hooks/useTheme";
import { money, num } from "../lib/format";

const RANGES = [
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
  { label: "1Y", days: 365 },
] as const;

function shortDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const compactUSD = (v: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(v);

function ChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const value = payload.find((p) => p.dataKey === "value")?.value as number | undefined;
  const cost = payload.find((p) => p.dataKey === "cost")?.value as number | undefined;
  if (value === undefined || cost === undefined) return null;
  const diff = value - cost;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-1.5 font-semibold text-slate-700 dark:text-slate-200">
        {new Date(String(label)).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
          <span className="h-2 w-2 rounded-full bg-sky-500" /> Value
        </span>
        <span className="font-semibold tabular-nums dark:text-slate-100">{money(value)}</span>
      </div>
      <div className="mt-0.5 flex items-center justify-between gap-4">
        <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
          <span className="h-0.5 w-2.5 rounded-full bg-slate-400" /> Cost basis
        </span>
        <span className="font-semibold tabular-nums dark:text-slate-100">{money(cost)}</span>
      </div>
      <div
        className={`mt-1 border-t border-slate-100 pt-1 text-right font-semibold tabular-nums dark:border-slate-700 ${
          diff >= 0 ? "text-gain" : "text-loss"
        }`}
      >
        {diff >= 0 ? "+" : ""}
        {money(diff)}
      </div>
    </div>
  );
}

/**
 * Portfolio value vs. cost basis over time, from the daily snapshots the
 * cron writes (server/src/routes/cron.ts). USD only, matching every other
 * per-symbol/portfolio number in the app — see lib/format.ts.
 */
export function ReturnsChart() {
  const [days, setDays] = useState<number>(90);
  const { theme } = useTheme();
  const dark = theme === "dark";
  const history = usePortfolioHistory(days);

  const points = (history.data?.snapshots ?? []).map((s) => ({
    date: s.date,
    value: num(s.totalValue),
    cost: num(s.totalCost),
  }));

  const axisColor = dark ? "#64748b" : "#94a3b8";
  const gridColor = dark ? "#1e293b" : "#f1f5f9";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-300">Value Over Time</h2>
        <div className="flex overflow-hidden rounded-md border border-slate-200 text-[11px] font-semibold dark:border-slate-700">
          {RANGES.map((r) => (
            <button
              key={r.label}
              type="button"
              onClick={() => setDays(r.days)}
              className={`px-2 py-1 transition ${
                days === r.days
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "bg-white text-slate-500 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {history.isLoading && (
        <div className="flex h-64 items-center justify-center text-sm text-slate-400">Loading history…</div>
      )}

      {history.isError && (
        <div className="flex h-64 items-center justify-center text-sm text-slate-400">
          Couldn't load portfolio history.
        </div>
      )}

      {history.data && points.length < 2 && (
        <div className="flex h-64 flex-col items-center justify-center gap-1 text-center text-sm text-slate-400">
          <span>Not enough history yet to chart.</span>
          <span className="text-xs">A snapshot is taken once a day — check back tomorrow.</span>
        </div>
      )}

      {points.length >= 2 && (
        <>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="returnsValueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={shortDate}
                tick={{ fontSize: 11, fill: axisColor }}
                axisLine={false}
                tickLine={false}
                minTickGap={32}
              />
              <YAxis
                tickFormatter={compactUSD}
                tick={{ fontSize: 11, fill: axisColor }}
                axisLine={false}
                tickLine={false}
                width={52}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: dark ? "#475569" : "#cbd5e1", strokeWidth: 1 }} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#0ea5e9"
                strokeWidth={2}
                fill="url(#returnsValueFill)"
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="cost"
                stroke={axisColor}
                strokeWidth={1.5}
                strokeDasharray="4 3"
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>

          <div className="mt-2 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-sky-500" /> Value
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-3 rounded-full bg-slate-400" /> Cost basis
            </span>
          </div>
        </>
      )}
    </div>
  );
}
