import { useCurrency } from "../hooks/useCurrency";

/** USD / THB switch. Shows the live rate on hover; disabled while it loads. */
export function CurrencyToggle({ className = "" }: { className?: string }) {
  const { currency, toggle, rate, rateLoading, rateError } = useCurrency();
  const noRate = rate <= 0;

  const title = rateError
    ? "Exchange rate unavailable — showing USD"
    : rateLoading
    ? "Loading exchange rate…"
    : `1 USD = ${rate.toFixed(2)} THB`;

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={noRate}
      title={title}
      aria-label={`Switch currency (currently ${currency})`}
      className={`inline-flex h-9 items-center gap-1 rounded-lg border border-slate-300 px-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 ${className}`}
    >
      <span className={currency === "USD" ? "text-slate-900 dark:text-white" : "text-slate-400"}>
        $ USD
      </span>
      <span className="text-slate-300 dark:text-slate-600">/</span>
      <span className={currency === "THB" ? "text-slate-900 dark:text-white" : "text-slate-400"}>
        ฿ THB
      </span>
    </button>
  );
}
