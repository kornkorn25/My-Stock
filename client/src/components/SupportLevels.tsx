import { Quote } from "../lib/types";
import { computePivots } from "../lib/indicators";
import { useMoney } from "../hooks/useCurrency";

/**
 * Shows pivot-based support and resistance levels to help decide entries.
 * Computed from the day's high/low and the previous close.
 */
export function SupportLevels({ quote }: { quote: Quote }) {
  const { money } = useMoney();
  const levels = computePivots(quote.high, quote.low, quote.previousClose || quote.current);
  if (!levels) return null;

  const price = quote.current;

  // Supports ordered nearest-to-price first (S1, S2, S3 going lower).
  const supports = [
    { label: "Support 1 (S1)", value: levels.s1 },
    { label: "Support 2 (S2)", value: levels.s2 },
    { label: "Support 3 (S3)", value: levels.s3 },
  ];
  const resistances = [
    { label: "Resistance 1 (R1)", value: levels.r1 },
    { label: "Resistance 2 (R2)", value: levels.r2 },
    { label: "Resistance 3 (R3)", value: levels.r3 },
  ];

  const Cell = ({
    label,
    value,
    tone,
  }: {
    label: string;
    value: number;
    tone: "support" | "resist" | "pivot";
  }) => {
    const distPct = ((value - price) / price) * 100;
    const ring =
      tone === "support"
        ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/40"
        : tone === "resist"
        ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40"
        : "border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-slate-800";
    return (
      <div className={`rounded-lg border p-3 ${ring}`}>
        <div className="text-xs font-medium text-slate-600 dark:text-slate-300">{label}</div>
        <div className="mt-0.5 text-lg font-bold tabular-nums dark:text-white">{money(value)}</div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          {distPct >= 0 ? "+" : ""}
          {distPct.toFixed(2)}% from price
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-300">
          Support / Resistance (Pivot Points)
        </h2>
        <span className="text-xs text-slate-400">
          อ้างอิง High {money(quote.high)} · Low {money(quote.low)} · Prev Close{" "}
          {money(quote.previousClose)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-7">
        {resistances
          .slice()
          .reverse()
          .map((r) => (
            <Cell key={r.label} label={r.label} value={r.value} tone="resist" />
          ))}
        <Cell label="Pivot" value={levels.pivot} tone="pivot" />
        {supports.map((s) => (
          <Cell key={s.label} label={s.label} value={s.value} tone="support" />
        ))}
      </div>

      <p className="mt-3 text-xs text-slate-400">
        * Floor-trader pivots from the day's range. Just a reference, not investment advice.
      </p>
    </div>
  );
}
