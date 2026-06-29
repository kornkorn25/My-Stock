import { useNavigate } from "react-router-dom";
import { Position } from "../lib/types";
import { pct, shares, gainLossClass, num } from "../lib/format";
import { useDeleteHolding } from "../hooks/usePortfolio";
import { useMoney } from "../hooks/useCurrency";
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
  const { money, signed } = useMoney();

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
    (a, b) => num(a.allocationPct) - num(b.allocationPct)
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
                    aria-label={`Remove ${p.symbol} from portfolio`}
                    className="rounded border border-slate-300 px-2 py-1 text-slate-400 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:border-slate-700 dark:text-slate-500 dark:hover:border-red-900 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4"
                    >
                      <path d="M3 6h18" />
                      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                      <line x1="10" y1="11" x2="10" y2="17" />
                      <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
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
