// Display helpers. All money values come from the API as decimal strings.

export function num(v: string | number | null | undefined): number {
  if (v === null || v === undefined || v === "") return 0;
  return typeof v === "number" ? v : Number(v);
}

export type Currency = "USD" | "THB";

/**
 * Format a USD-denominated amount in the chosen display currency. All values
 * from the API are in USD; `rate` is USD->quote (e.g. USD->THB). Prefer the
 * `useMoney()` hook in components so the currency/rate come from context.
 */
export function formatMoney(
  v: string | number | null | undefined,
  currency: Currency = "USD",
  rate = 1,
  opts?: { dp?: number }
): string {
  const dp = opts?.dp ?? 2;
  const value = currency === "USD" ? num(v) : num(v) * rate;
  return value.toLocaleString(currency === "THB" ? "th-TH" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  });
}

export function formatSigned(
  v: string | number | null | undefined,
  currency: Currency = "USD",
  rate = 1
): string {
  const sign = num(v) > 0 ? "+" : "";
  return `${sign}${formatMoney(v, currency, rate)}`;
}

/**
 * USD formatters — the canonical currency for every stored value (prices, avg
 * cost, P/L). Use these everywhere except the top portfolio summary cards,
 * which convert to the user's chosen display currency via `useMoney()`.
 */
export function money(v: string | number | null | undefined, opts?: { dp?: number }): string {
  return formatMoney(v, "USD", 1, opts);
}

export function signed(v: string | number | null | undefined): string {
  return formatSigned(v, "USD", 1);
}

export function pct(v: string | number | null | undefined, dp = 2): string {
  const n = num(v);
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(dp)}%`;
}

/** Shares can be fractional; trim trailing zeros but keep meaningful precision. */
export function shares(v: string | number | null | undefined): string {
  const n = num(v);
  return n.toLocaleString("en-US", { maximumFractionDigits: 8 });
}

export function gainLossClass(v: string | number | null | undefined): string {
  const n = num(v);
  if (n > 0) return "text-gain";
  if (n < 0) return "text-loss";
  return "text-slate-500";
}

export function formatDate(d: string | Date): string {
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Map a plain symbol to a TradingView symbol. US tickers default to NASDAQ. */
const NYSE_HINTS = new Set(["BRK.B", "JPM", "KO", "DIS", "BAC", "XOM", "CVX", "WMT", "PFE", "T"]);
export function tradingViewSymbol(symbol: string): string {
  const s = symbol.toUpperCase();
  if (s.includes(":")) return s;
  return NYSE_HINTS.has(s) ? `NYSE:${s}` : `NASDAQ:${s}`;
}
