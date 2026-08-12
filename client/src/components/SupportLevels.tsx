import { LevelZone, Quote } from "../lib/types";
import { money } from "../lib/format";
import { useLevels } from "../hooks/useLevels";

/**
 * Support/resistance zones clustered from ~1y of daily swing highs/lows,
 * scored by how many times price touched each zone and how recently.
 */
export function SupportLevels({ symbol, quote }: { symbol: string; quote: Quote }) {
  const price = quote.current;
  const levels = useLevels(symbol, price);

  if (levels.isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-400 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        Loading support &amp; resistance…
      </div>
    );
  }

  if (levels.isError) return null;

  const data = levels.data?.levels;
  const { support = [], resistance = [] } = data ?? {};

  if (support.length === 0 && resistance.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-900">
        Not enough price history yet to plot support/resistance for {symbol}.
      </div>
    );
  }

  const Cell = ({ zone }: { zone: LevelZone }) => {
    const distPct = ((zone.price - price) / price) * 100;
    const ring =
      zone.type === "support"
        ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/40"
        : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40";
    const bar = zone.type === "support" ? "bg-green-500" : "bg-red-500";
    return (
      <div className={`rounded-lg border p-3 ${ring}`}>
        <div className="text-xs font-medium text-slate-600 dark:text-slate-300">
          {zone.type === "support" ? "Support" : "Resistance"}
        </div>
        <div className="mt-0.5 text-lg font-bold tabular-nums dark:text-white">{money(zone.price)}</div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          {distPct >= 0 ? "+" : ""}
          {distPct.toFixed(2)}% from price
        </div>
        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div className={`h-full ${bar}`} style={{ width: `${zone.strength}%` }} />
        </div>
        <div className="mt-1 text-[11px] text-slate-400">
          {zone.touches} touch{zone.touches === 1 ? "" : "es"} · {zone.strength}% strength
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-300">Support / Resistance</h2>
        {levels.data && (
          <span className="text-xs text-slate-400">last {levels.data.barsUsed} trading days</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {[...resistance].reverse().map((z) => (
          <Cell key={`r-${z.price}`} zone={z} />
        ))}
        {support.map((z) => (
          <Cell key={`s-${z.price}`} zone={z} />
        ))}
      </div>

      <p className="mt-3 text-xs text-slate-400">
        * Clustered swing highs/lows from daily price history, ranked by how many times price touched
        each zone and how recently. Just a reference, not investment advice.
      </p>
    </div>
  );
}
