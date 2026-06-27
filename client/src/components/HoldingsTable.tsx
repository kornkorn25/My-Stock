import { useNavigate } from "react-router-dom";
import { Position } from "../lib/types";
import { money, pct, signed, shares, gainLossClass, num } from "../lib/format";
import { useDeleteHolding } from "../hooks/usePortfolio";
import { StockLogo } from "./StockLogo";

export function HoldingsTable({
  positions,
  onSell,
}: {
  positions: Position[];
  onSell: (symbol: string) => void;
}) {
  const navigate = useNavigate();
  const deleteHolding = useDeleteHolding();

  function removeStock(symbol: string) {
    if (
      !confirm(
        `Remove ${symbol} from your portfolio?\n\nThis permanently deletes ALL ${symbol} transactions and its holding. This cannot be undone.`
      )
    )
      return;
    deleteHolding.mutate(symbol);
  }

  if (positions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-400 dark:border-slate-700 dark:bg-slate-900">
        Nothing here yet. Add a transaction and your holdings show up.
      </div>
    );
  }

  const sorted = [...positions].sort(
    (a, b) => num(b.allocationPct) - num(a.allocationPct)
  );

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <table className="w-full min-w-[820px] text-sm dark:text-slate-200">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <th className="px-4 py-3">Symbol</th>
            <th className="px-4 py-3 text-right">Qty</th>
            <th className="px-4 py-3 text-right">Avg Cost</th>
            <th className="px-4 py-3 text-right">Market Price</th>
            <th className="px-4 py-3 text-right">Total Value</th>
            <th className="px-4 py-3 text-right">Unreal. P/L</th>
            <th className="px-4 py-3 text-right">Alloc %</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => (
            <tr key={p.symbol} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50">
              <td className="px-4 py-3">
                <button
                  onClick={() => navigate(`/stock/${p.symbol}`)}
                  className="flex items-center gap-2 font-semibold text-slate-900 hover:underline dark:text-white"
                >
                  <StockLogo symbol={p.symbol} size={26} />
                  {p.symbol}
                </button>
              </td>
              <td className="px-4 py-3 text-right tabular-nums">{shares(p.quantity)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{money(p.avgCost)}</td>
              <td className="px-4 py-3 text-right tabular-nums">
                {p.priceError ? (
                  <span className="text-xs text-amber-600" title={p.priceError}>
                    n/a
                  </span>
                ) : (
                  money(p.currentPrice)
                )}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {p.marketValue ? money(p.marketValue) : "—"}
              </td>
              <td className={`px-4 py-3 text-right tabular-nums ${gainLossClass(p.unrealizedPnl)}`}>
                {p.unrealizedPnl ? (
                  <div>
                    <div>{signed(p.unrealizedPnl)}</div>
                    <div className="text-xs">{pct(p.unrealizedPnlPct)}</div>
                  </div>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {p.allocationPct ? `${num(p.allocationPct).toFixed(1)}%` : "—"}
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => onSell(p.symbol)}
                    className="rounded border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Sell
                  </button>
                  <button
                    onClick={() => navigate(`/stock/${p.symbol}`)}
                    className="rounded border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Chart
                  </button>
                  <button
                    onClick={() => removeStock(p.symbol)}
                    disabled={deleteHolding.isPending}
                    title="Remove from portfolio"
                    className="rounded border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/50"
                  >
                    Remove
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
