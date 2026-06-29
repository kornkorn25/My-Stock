import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { TradingViewChart } from "../components/TradingViewChart";
import { SupportLevels } from "../components/SupportLevels";
import { StockLogo } from "../components/StockLogo";
import { usePortfolio, useDeleteHolding } from "../hooks/usePortfolio";
import { useQuote } from "../hooks/useQuote";
import { useProfile } from "../hooks/useProfile";
import { AddTransactionModal } from "../components/AddTransactionModal";
import { money, pct, signed, shares, gainLossClass } from "../lib/format";
import { TxType } from "../lib/types";

function Stat({ label, value, valueClass = "" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
      <div className={`mt-0.5 text-lg font-semibold ${valueClass || "text-slate-900 dark:text-white"}`}>{value}</div>
    </div>
  );
}

export function StockDetail() {
  const { symbol = "" } = useParams();
  const sym = symbol.toUpperCase();
  const navigate = useNavigate();
  const { data } = usePortfolio();
  const quote = useQuote(sym);
  const profile = useProfile(sym);
  const deleteHolding = useDeleteHolding();
  const [modalOpen, setModalOpen] = useState(false);
  const [initialType, setInitialType] = useState<TxType>("BUY");

  const position = data?.positions.find((p) => p.symbol === sym);

  function open(type: TxType) {
    setInitialType(type);
    setModalOpen(true);
  }

  function removeStock() {
    if (
      !confirm(
        `Remove ${sym} from your portfolio?\n\nThis permanently deletes ALL ${sym} transactions and its holding. This cannot be undone.`
      )
    )
      return;
    deleteHolding.mutate(sym, { onSuccess: () => navigate("/") });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/" className="text-sm text-slate-500 hover:underline dark:text-slate-400">
            ← Back to dashboard
          </Link>
          <div className="mt-1 flex items-center gap-3">
            <StockLogo symbol={sym} size={40} />
            <div>
              <h1 className="text-2xl font-bold leading-tight dark:text-white">{sym}</h1>
              {profile.data?.profile.name && (
                <div className="text-sm text-slate-500 dark:text-slate-400">{profile.data.profile.name}</div>
              )}
            </div>
          </div>
          {quote.data && (
            <div className={`mt-1 text-sm font-medium ${gainLossClass(quote.data.quote.change)}`}>
              {money(quote.data.quote.current)}{" "}
              <span>
                ({signed(quote.data.quote.change)}, {pct(quote.data.quote.percentChange)})
              </span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => open("BUY")}
            className="rounded-lg bg-gain px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Buy
          </button>
          <button
            onClick={() => open("SELL")}
            className="rounded-lg bg-loss px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Sell
          </button>
          {position && (
            <button
              onClick={removeStock}
              disabled={deleteHolding.isPending}
              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/50"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {position ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Shares" value={shares(position.quantity)} />
          <Stat label="Avg Cost" value={money(position.avgCost)} />
          <Stat label="Total Value" value={position.marketValue ? money(position.marketValue) : "—"} />
          <Stat
            label="Unreal. P/L"
            value={position.unrealizedPnl ? signed(position.unrealizedPnl) : "—"}
            valueClass={gainLossClass(position.unrealizedPnl)}
          />
          <Stat
            label="Unreal. %"
            value={position.unrealizedPnlPct ? pct(position.unrealizedPnlPct) : "—"}
            valueClass={gainLossClass(position.unrealizedPnl)}
          />
          <Stat
            label="Realized P/L"
            value={signed(position.realizedPnl)}
            valueClass={gainLossClass(position.realizedPnl)}
          />
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
          You don't own any {sym} yet. Hit Buy to start a position.
        </div>
      )}

      {quote.data && <SupportLevels quote={quote.data.quote} />}

      <TradingViewChart symbol={sym} />

      <AddTransactionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        positions={data?.positions ?? []}
        initialSymbol={sym}
        initialType={initialType}
      />
    </div>
  );
}
