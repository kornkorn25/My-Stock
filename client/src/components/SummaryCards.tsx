import { PortfolioSummary } from "../lib/types";
import { money, pct, signed, gainLossClass } from "../lib/format";

function Card({
  label,
  value,
  valueClass = "",
  sub,
}: {
  label: string;
  value: string;
  valueClass?: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${valueClass || "text-slate-900 dark:text-white"}`}>{value}</div>
      {sub && <div className={`mt-0.5 text-sm font-medium ${valueClass}`}>{sub}</div>}
    </div>
  );
}

export function SummaryCards({ summary }: { summary: PortfolioSummary }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <Card label="Total Value" value={money(summary.totalValue)} />
      <Card label="Total Cost" value={money(summary.totalCost)} />
      <Card
        label="Unrealized P/L"
        value={signed(summary.totalUnrealized)}
        valueClass={gainLossClass(summary.totalUnrealized)}
        sub={pct(summary.totalReturnPct)}
      />
      <Card
        label="Realized P/L"
        value={signed(summary.totalRealized)}
        valueClass={gainLossClass(summary.totalRealized)}
      />
      <Card label="Positions" value={String(summary.positionCount)} />
    </div>
  );
}
