import Decimal from "decimal.js";

// High precision to safely handle fractional shares and money math.
Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

export type TxType = "BUY" | "SELL";

export interface LedgerTx {
  type: TxType;
  quantity: Decimal.Value;
  price: Decimal.Value;
  fee?: Decimal.Value;
  executedAt: Date | string;
}

export interface HoldingState {
  quantity: Decimal;
  avgCost: Decimal;
  realizedPnl: Decimal;
}

/**
 * Recompute a holding from scratch by replaying the full transaction ledger.
 * Idempotent: same set of transactions always yields the same holding state.
 * Throws if a SELL would exceed the quantity currently held.
 *
 * Formulas (per spec):
 *  BUY:
 *    newQty   = oldQty + buyQty
 *    avgCost  = (oldQty*oldAvg + buyQty*buyPrice + fee) / newQty
 *  SELL:
 *    realized += (sellPrice - avgCost) * sellQty - fee
 *    newQty    = oldQty - sellQty   (avgCost unchanged)
 */
export function recomputeHolding(transactions: LedgerTx[]): HoldingState {
  // Replay in chronological order; ties broken by stable input order.
  const ordered = [...transactions].sort(
    (a, b) => new Date(a.executedAt).getTime() - new Date(b.executedAt).getTime()
  );

  let quantity = new Decimal(0);
  let avgCost = new Decimal(0);
  let realizedPnl = new Decimal(0);

  for (const tx of ordered) {
    const qty = new Decimal(tx.quantity);
    const price = new Decimal(tx.price);
    const fee = new Decimal(tx.fee ?? 0);

    if (qty.lte(0)) {
      throw new Error("Transaction quantity must be greater than 0");
    }
    if (price.lte(0)) {
      throw new Error("Transaction price must be greater than 0");
    }

    if (tx.type === "BUY") {
      const oldCostBasis = quantity.times(avgCost);
      const buyCost = qty.times(price).plus(fee); // fees rolled into cost basis
      const newQty = quantity.plus(qty);
      avgCost = oldCostBasis.plus(buyCost).div(newQty);
      quantity = newQty;
    } else if (tx.type === "SELL") {
      if (qty.gt(quantity)) {
        throw new Error(
          `Cannot sell ${qty.toString()} shares; only ${quantity.toString()} held`
        );
      }
      const proceeds = price.minus(avgCost).times(qty).minus(fee);
      realizedPnl = realizedPnl.plus(proceeds);
      quantity = quantity.minus(qty);
      // avgCost stays the same on a sell.
      if (quantity.isZero()) {
        avgCost = new Decimal(0); // position closed; reset basis (realized kept)
      }
    } else {
      throw new Error(`Unknown transaction type: ${String(tx.type)}`);
    }
  }

  return { quantity, avgCost, realizedPnl };
}

export interface PositionValuation {
  marketValue: Decimal;
  costBasis: Decimal;
  unrealizedPnl: Decimal;
  unrealizedPnlPct: Decimal; // 0 if no cost basis
}

/** Valuation of one position given a current market price. */
export function valuePosition(
  quantity: Decimal.Value,
  avgCost: Decimal.Value,
  currentPrice: Decimal.Value
): PositionValuation {
  const qty = new Decimal(quantity);
  const avg = new Decimal(avgCost);
  const price = new Decimal(currentPrice);

  const marketValue = qty.times(price);
  const costBasis = qty.times(avg);
  const unrealizedPnl = marketValue.minus(costBasis);
  const unrealizedPnlPct = costBasis.isZero()
    ? new Decimal(0)
    : unrealizedPnl.div(costBasis).times(100);

  return { marketValue, costBasis, unrealizedPnl, unrealizedPnlPct };
}

/** Allocation percent of a position within the whole portfolio. */
export function allocationPct(
  marketValue: Decimal.Value,
  totalPortfolioValue: Decimal.Value
): Decimal {
  const total = new Decimal(totalPortfolioValue);
  if (total.isZero()) return new Decimal(0);
  return new Decimal(marketValue).div(total).times(100);
}
