import Decimal from "decimal.js";
import { prisma } from "../lib/prisma";
import { getQuote } from "./finnhub";
import { valuePosition, allocationPct } from "./portfolioCalc";

/**
 * Values every holding for a user at the latest (cached) Finnhub price and
 * rolls up the portfolio summary. Shared by the /api/portfolio route and the
 * daily snapshot cron so both use the exact same numbers.
 */
export async function computePortfolioSummary(userId: string) {
  const holdings = await prisma.holding.findMany({
    where: { userId },
    orderBy: { symbol: "asc" },
  });

  // Only value open positions (quantity > 0).
  const open = holdings.filter((h) => new Decimal(h.quantity).gt(0));

  const quoted = await Promise.all(
    open.map(async (h) => {
      try {
        const q = await getQuote(h.symbol);
        return { holding: h, price: new Decimal(q.current), quote: q, error: null as string | null };
      } catch (err) {
        return {
          holding: h,
          price: null as Decimal | null,
          quote: null,
          error: err instanceof Error ? err.message : "quote failed",
        };
      }
    })
  );

  // Total portfolio value uses only successfully priced positions.
  let totalValue = new Decimal(0);
  for (const item of quoted) {
    if (item.price) totalValue = totalValue.plus(new Decimal(item.holding.quantity).times(item.price));
  }

  let totalCost = new Decimal(0);
  let totalRealized = new Decimal(0);

  // realizedPnl spans all holdings (including closed positions).
  for (const h of holdings) {
    totalRealized = totalRealized.plus(new Decimal(h.realizedPnl));
  }

  const positions = quoted.map((item) => {
    const qty = new Decimal(item.holding.quantity);
    // avgCost is the ledger-computed truth; avgCostOverride, when set, is what
    // gets used everywhere cost basis matters (here, and in the buy-preview
    // math on the client) — but it never touches the underlying ledger math,
    // so clearing it always falls back cleanly to the real computed value.
    const computedAvg = new Decimal(item.holding.avgCost);
    const avgCostOverridden = item.holding.avgCostOverride !== null;
    const avg = avgCostOverridden ? new Decimal(item.holding.avgCostOverride!) : computedAvg;
    const costBasis = qty.times(avg);
    totalCost = totalCost.plus(costBasis);

    if (!item.price) {
      return {
        symbol: item.holding.symbol,
        quantity: qty.toString(),
        avgCost: avg.toString(),
        computedAvgCost: computedAvg.toString(),
        avgCostOverridden,
        currentPrice: null,
        marketValue: null,
        costBasis: costBasis.toString(),
        unrealizedPnl: null,
        unrealizedPnlPct: null,
        realizedPnl: new Decimal(item.holding.realizedPnl).toString(),
        allocationPct: null,
        targetPct: item.holding.targetPct ? item.holding.targetPct.toString() : null,
        overTarget: false,
        priceError: item.error,
        change: null,
        percentChange: null,
      };
    }

    const val = valuePosition(qty, avg, item.price);
    const alloc = allocationPct(val.marketValue, totalValue);
    const targetPct = item.holding.targetPct ? new Decimal(item.holding.targetPct) : null;
    const overTarget = targetPct ? alloc.gt(targetPct) : false;

    return {
      symbol: item.holding.symbol,
      quantity: qty.toString(),
      avgCost: avg.toString(),
      computedAvgCost: computedAvg.toString(),
      avgCostOverridden,
      currentPrice: item.price.toString(),
      marketValue: val.marketValue.toString(),
      costBasis: val.costBasis.toString(),
      unrealizedPnl: val.unrealizedPnl.toString(),
      unrealizedPnlPct: val.unrealizedPnlPct.toString(),
      realizedPnl: new Decimal(item.holding.realizedPnl).toString(),
      allocationPct: alloc.toString(),
      targetPct: targetPct ? targetPct.toString() : null,
      overTarget,
      priceError: null,
      change: item.quote ? item.quote.change : null,
      percentChange: item.quote ? item.quote.percentChange : null,
    };
  });

  const totalUnrealized = totalValue.minus(totalCost);
  const totalReturnPct = totalCost.isZero()
    ? new Decimal(0)
    : totalUnrealized.div(totalCost).times(100);

  return {
    summary: {
      totalCost: totalCost.toString(),
      totalValue: totalValue.toString(),
      totalUnrealized: totalUnrealized.toString(),
      totalRealized: totalRealized.toString(),
      totalReturnPct: totalReturnPct.toString(),
      positionCount: positions.length,
    },
    positions,
  };
}
