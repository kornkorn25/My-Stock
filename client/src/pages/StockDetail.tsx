import { useState, ChangeEvent } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { TradingViewChart } from "../components/TradingViewChart";
import { SupportLevels } from "../components/SupportLevels";
import { StockLogo } from "../components/StockLogo";
import { usePortfolio, useDeleteHolding, useSetAvgCostOverride } from "../hooks/usePortfolio";
import { useQuote } from "../hooks/useQuote";
import { useProfile } from "../hooks/useProfile";
import { AddTransactionModal } from "../components/AddTransactionModal";
import { money, pct, signed, shares, gainLossClass } from "../lib/format";
import { ApiError } from "../lib/api";
import { Position, TxType } from "../lib/types";

function Stat({ label, value, valueClass = "" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
      <div className={`mt-0.5 text-lg font-semibold ${valueClass || "text-slate-900 dark:text-white"}`}>{value}</div>
    </div>
  );
}

/**
 * The Avg Cost stat, editable in place. Doesn't touch the transaction ledger —
 * it sets a correction that the backend layers on top of the ledger-computed
 * value (see server/src/services/portfolioService.ts), so it survives future
 * buys/sells and can always be reset back to what the ledger actually says.
 */
function AvgCostStat({ symbol, position }: { symbol: string; position: Position }) {
  const setOverride = useSetAvgCostOverride();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const decimalOnly = (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (v === "" || /^\d*\.?\d*$/.test(v)) setDraft(v);
  };

  function startEdit() {
    setDraft(position.avgCost);
    setError(null);
    setEditing(true);
  }

  async function save() {
    if (Number(draft) <= 0) {
      setError("Must be greater than 0");
      return;
    }
    try {
      await setOverride.mutateAsync({ symbol, avgCost: draft });
      setEditing(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save");
    }
  }

  async function reset() {
    await setOverride.mutateAsync({ symbol, avgCost: null });
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="rounded-lg border border-slate-300 bg-white p-3 dark:border-slate-600 dark:bg-slate-900">
        <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Avg Cost</div>
        <input
          autoFocus
          value={draft}
          onChange={decimalOnly}
          inputMode="decimal"
          className="mt-0.5 w-full rounded border border-slate-300 px-1.5 py-0.5 text-lg font-semibold focus:border-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-300"
        />
        {error && <div className="mt-1 text-xs text-loss">{error}</div>}
        <div className="mt-1 text-[11px] text-slate-400">
          Clears automatically if you add or edit a {symbol} transaction.
        </div>
        <div className="mt-1.5 flex gap-1.5 text-xs">
          <button
            onClick={save}
            disabled={setOverride.isPending}
            className="rounded bg-slate-900 px-2 py-0.5 font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-slate-900"
          >
            Save
          </button>
          <button
            onClick={() => setEditing(false)}
            className="rounded border border-slate-300 px-2 py-0.5 dark:border-slate-700 dark:text-slate-100"
          >
            Cancel
          </button>
          {position.avgCostOverridden && (
            <button
              onClick={reset}
              disabled={setOverride.isPending}
              className="ml-auto text-slate-400 hover:text-slate-600 hover:underline dark:hover:text-slate-200"
              title={`Use calculated: ${money(position.computedAvgCost)}`}
            >
              Use calculated ({money(position.computedAvgCost)})
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={startEdit}
      title="Click to correct the avg cost"
      className="group rounded-lg border border-slate-200 bg-white p-3 text-left hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-600"
    >
      <div className="flex items-center gap-1 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Avg Cost
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100"
        >
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
        </svg>
      </div>
      <div className="mt-0.5 text-lg font-semibold text-slate-900 dark:text-white">{money(position.avgCost)}</div>
      {position.avgCostOverridden && (
        <div className="text-[11px] text-slate-400">manually set</div>
      )}
    </button>
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
          <AvgCostStat symbol={sym} position={position} />
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

      {quote.data && <SupportLevels symbol={sym} quote={quote.data.quote} />}

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
