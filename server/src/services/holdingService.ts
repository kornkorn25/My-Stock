import { prisma } from "../lib/prisma";
import { recomputeHolding, LedgerTx } from "./portfolioCalc";

/**
 * Recompute the Holding row for (userId, symbol) entirely from its transactions.
 * Call this after every transaction write. Idempotent.
 * If there are no transactions left, the Holding row is removed.
 */
export async function recomputeAndPersistHolding(userId: string, symbol: string) {
  const sym = symbol.toUpperCase();
  // executedAt only has day precision (the UI is a date picker, no time), so
  // same-day trades tie on it — Postgres doesn't guarantee a stable order for
  // ties. createdAt breaks the tie deterministically, in the order the
  // transactions were actually entered.
  const txs = await prisma.transaction.findMany({
    where: { userId, symbol: sym },
    orderBy: [{ executedAt: "asc" }, { createdAt: "asc" }],
  });

  if (txs.length === 0) {
    await prisma.holding.deleteMany({ where: { userId, symbol: sym } });
    return null;
  }

  const ledger: LedgerTx[] = txs.map((t) => ({
    type: t.type as "BUY" | "SELL",
    quantity: t.quantity.toString(),
    price: t.price.toString(),
    fee: t.fee.toString(),
    executedAt: t.executedAt,
  }));

  const state = recomputeHolding(ledger);

  // Preserve a previously set targetPct across recomputes.
  const existing = await prisma.holding.findUnique({
    where: { userId_symbol: { userId, symbol: sym } },
  });

  const holding = await prisma.holding.upsert({
    where: { userId_symbol: { userId, symbol: sym } },
    create: {
      userId,
      symbol: sym,
      quantity: state.quantity.toString(),
      avgCost: state.avgCost.toString(),
      realizedPnl: state.realizedPnl.toString(),
      targetPct: existing?.targetPct ?? null,
    },
    update: {
      quantity: state.quantity.toString(),
      avgCost: state.avgCost.toString(),
      realizedPnl: state.realizedPnl.toString(),
    },
  });

  return holding;
}
