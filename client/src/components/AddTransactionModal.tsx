import { useState, useMemo, FormEvent, ChangeEvent, useEffect } from "react";
import { TxType, Position } from "../lib/types";
import { useCreateTransaction } from "../hooks/usePortfolio";
import { useQuote } from "../hooks/useQuote";
import { useProfile } from "../hooks/useProfile";
import { StockLogo } from "./StockLogo";
import { ApiError } from "../lib/api";
import { money, num, shares } from "../lib/format";
import { useCurrency } from "../hooks/useCurrency";

interface Props {
  open: boolean;
  onClose: () => void;
  positions: Position[];
  initialSymbol?: string;
  initialType?: TxType;
}

const todayLocal = () => new Date().toISOString().slice(0, 10);

export function AddTransactionModal({
  open,
  onClose,
  positions,
  initialSymbol = "",
  initialType = "BUY",
}: Props) {
  const create = useCreateTransaction();
  // Budget can be entered in the user's display currency; everything else
  // (avg cost, price, realized P/L) stays in USD.
  const { currency, rate } = useCurrency();
  const displayCur = currency === "THB" && rate > 0 ? "THB" : "USD";
  const [symbol, setSymbol] = useState(initialSymbol);
  const [type, setType] = useState<TxType>(initialType);
  // Two ways to size the trade: by share count, or by a money budget.
  const [sizeMode, setSizeMode] = useState<"shares" | "amount">("shares");
  const [quantity, setQuantity] = useState("");
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");
  const [fee, setFee] = useState("");
  const [note, setNote] = useState("");
  const [executedAt, setExecutedAt] = useState(todayLocal());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSymbol(initialSymbol);
      setType(initialType);
      setSizeMode("shares");
      setQuantity("");
      setAmount("");
      setPrice("");
      setFee("");
      setNote("");
      setExecutedAt(todayLocal());
      setError(null);
    }
  }, [open, initialSymbol, initialType]);

  // Accept only a valid decimal-in-progress: digits with at most one dot.
  // Rejects letters, spaces, signs, and extra dots so numeric fields stay clean.
  const decimalOnly =
    (setter: (v: string) => void) => (e: ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      if (v === "" || /^\d*\.?\d*$/.test(v)) setter(v);
    };

  const symbolUpper = symbol.toUpperCase().trim();

  const current = useMemo(
    () => positions.find((p) => p.symbol === symbolUpper),
    [positions, symbolUpper]
  );

  // Debounce the symbol so we don't hit the quote endpoint on every keystroke.
  const [debouncedSymbol, setDebouncedSymbol] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSymbol(symbolUpper), 400);
    return () => clearTimeout(t);
  }, [symbolUpper]);

  // Validate that the symbol exists by fetching a live quote for it.
  const check = useQuote(debouncedSymbol || undefined);
  const profile = useProfile(debouncedSymbol || undefined);

  const synced = debouncedSymbol === symbolUpper && symbolUpper !== "";
  const symbolStatus: "empty" | "checking" | "valid" | "invalid" =
    symbolUpper === ""
      ? "empty"
      : !synced || check.isLoading
      ? "checking"
      : check.isError
      ? "invalid"
      : "valid";

  // Resolve the share count from whichever sizing mode is active. In "amount"
  // mode the budget is entered in the display currency, so convert to USD
  // (prices are USD) before dividing by price → shares = budget / price.
  const priceNum = num(price);
  const amountUSD =
    displayCur === "THB" && rate > 0 ? num(amount) / rate : num(amount);
  const sharesFromAmount = priceNum > 0 ? amountUSD / priceNum : 0;
  const effQty = sizeMode === "amount" ? sharesFromAmount : num(quantity);

  const canSubmit =
    symbolStatus === "valid" && !create.isPending && effQty > 0 && priceNum > 0;

  // Live preview of avg cost / remaining qty (display only).
  const preview = useMemo(() => {
    const q = effQty;
    const pr = priceNum;
    const f = num(fee);
    const oldQty = current ? num(current.quantity) : 0;
    const oldAvg = current ? num(current.avgCost) : 0;

    if (q <= 0 || pr <= 0) return null;

    if (type === "BUY") {
      const newQty = oldQty + q;
      const newAvg = (oldQty * oldAvg + q * pr + f) / newQty;
      return { label: "New avg cost", value: money(newAvg), qty: newQty, txQty: q };
    } else {
      if (q > oldQty) return { error: `Only ${shares(oldQty)} shares held` };
      const realized = (pr - oldAvg) * q - f;
      return {
        label: "Realized P/L",
        value: money(realized),
        qty: oldQty - q,
        txQty: q,
        realized,
      };
    }
  }, [effQty, priceNum, fee, type, current, money]);

  if (!open) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (symbolStatus !== "valid") {
      setError(`"${symbolUpper}" is not a valid stock symbol`);
      return;
    }
    try {
      await create.mutateAsync({
        symbol: symbol.toUpperCase().trim(),
        type,
        // When sizing by budget, persist the derived share count (fractional ok).
        quantity:
          sizeMode === "amount" ? String(Number(effQty.toFixed(8))) : quantity,
        price,
        fee: fee || undefined,
        note: note || undefined,
        executedAt: new Date(executedAt).toISOString(),
      });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md animate-fade-in-scale rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 dark:text-slate-100 dark:ring-1 dark:ring-slate-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold dark:text-white">Add Transaction</h2>
          <button onClick={onClose} className="text-sm font-medium text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
            Close
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Symbol</label>
              <div className="relative">
                <input
                  value={symbol}
                  onChange={(e) =>
                    setSymbol(e.target.value.toUpperCase().replace(/[^A-Z0-9.-]/g, ""))
                  }
                  required
                  placeholder="PLTR"
                  className={`w-full rounded-lg border px-3 py-2 pr-8 text-sm uppercase focus:outline-none dark:bg-slate-800 dark:text-slate-100 ${
                    symbolStatus === "invalid"
                      ? "border-red-400 focus:border-red-500"
                      : symbolStatus === "valid"
                      ? "border-green-400 focus:border-green-500"
                      : "border-slate-300 focus:border-slate-900 dark:border-slate-700 dark:focus:border-slate-300"
                  }`}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm">
                  {symbolStatus === "checking" && <span className="text-slate-400">…</span>}
                  {symbolStatus === "valid" && <span className="text-xs font-semibold text-green-600">OK</span>}
                  {symbolStatus === "invalid" && <span className="text-xs font-semibold text-red-500">Invalid</span>}
                </span>
              </div>
              <div className="mt-1 h-4 text-xs">
                {symbolStatus === "valid" && (
                  <span className="flex items-center gap-1 text-slate-500">
                    <StockLogo symbol={symbolUpper} size={14} />
                    {profile.data?.profile.name ?? "Valid"} ·{" "}
                    {check.data && money(check.data.quote.current)}
                  </span>
                )}
                {symbolStatus === "invalid" && (
                  <span className="text-red-500">Symbol not found</span>
                )}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Type</label>
              <div className="flex overflow-hidden rounded-lg border border-slate-300 dark:border-slate-700">
                {(["BUY", "SELL"] as TxType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`flex-1 py-2 text-sm font-semibold transition ${
                      type === t
                        ? t === "BUY"
                          ? "bg-gain text-white"
                          : "bg-loss text-white"
                        : "bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="mb-1 flex items-center justify-between gap-2">
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">
                  {sizeMode === "shares" ? "Quantity" : `Budget (${displayCur})`}
                </label>
                <div className="flex overflow-hidden rounded-md border border-slate-200 text-[10px] font-semibold dark:border-slate-700">
                  {(["shares", "amount"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSizeMode(m)}
                      className={`px-1.5 py-0.5 transition ${
                        sizeMode === m
                          ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                          : "bg-white text-slate-500 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                      }`}
                    >
                      {m === "shares" ? "Shares" : "Amount"}
                    </button>
                  ))}
                </div>
              </div>
              {sizeMode === "shares" ? (
                <input
                  value={quantity}
                  onChange={decimalOnly(setQuantity)}
                  required
                  inputMode="decimal"
                  placeholder="0.1234"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-300"
                />
              ) : (
                <input
                  value={amount}
                  onChange={decimalOnly(setAmount)}
                  required
                  inputMode="decimal"
                  placeholder={displayCur === "THB" ? "10000" : "1000"}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-300"
                />
              )}
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between gap-2">
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">
                  Price / share (USD)
                </label>
                {symbolStatus === "valid" && check.data && (
                  <button
                    type="button"
                    onClick={() => setPrice(String(check.data!.quote.current))}
                    className="text-[10px] font-semibold text-sky-600 hover:underline dark:text-sky-400"
                  >
                    Use ${check.data.quote.current.toFixed(2)}
                  </button>
                )}
              </div>
              <input
                value={price}
                onChange={decimalOnly(setPrice)}
                required
                inputMode="decimal"
                placeholder="120.00"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Fee (optional)</label>
              <input
                value={fee}
                onChange={decimalOnly(setFee)}
                inputMode="decimal"
                placeholder="0.00"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-300"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Date</label>
              <input
                type="date"
                value={executedAt}
                onChange={(e) => setExecutedAt(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-300"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Note (optional)</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. DCA buy"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-300"
            />
          </div>

          {preview && (
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800">
              {"error" in preview ? (
                <span className="text-loss">{preview.error}</span>
              ) : (
                <div className="space-y-1">
                  {sizeMode === "amount" && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Est. shares</span>
                      <span className="font-semibold dark:text-slate-100">
                        ≈ {shares(preview.txQty)}
                        <span className="ml-2 text-xs text-slate-400">
                          @ ${priceNum.toFixed(2)}
                        </span>
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">{preview.label}</span>
                    <span className="font-semibold dark:text-slate-100">
                      {preview.value}
                      <span className="ml-2 text-xs text-slate-400">
                        {type === "BUY"
                          ? `total ${shares(preview.qty)} sh`
                          : `${shares(preview.qty)} sh left`}
                      </span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">{error}</div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            {create.isPending ? "Saving…" : "Save Transaction"}
          </button>
        </form>
      </div>
    </div>
  );
}
