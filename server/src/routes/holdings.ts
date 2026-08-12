import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { validate } from "../middleware/validate";
import { requireAuth, AuthedRequest } from "../middleware/auth";

export const holdingsRouter = Router();

holdingsRouter.use(requireAuth);

// GET /api/holdings
holdingsRouter.get("/", async (req: AuthedRequest, res: Response) => {
  const holdings = await prisma.holding.findMany({
    where: { userId: req.userId },
    orderBy: { symbol: "asc" },
  });
  res.json({ holdings: holdings.map(serializeHolding) });
});

const targetSchema = z.object({
  targetPct: z
    .union([z.number(), z.string(), z.null()])
    .transform((v) => (v === null || v === "" ? null : String(v)))
    .refine(
      (v) => v === null || (/^\d+(\.\d+)?$/.test(v) && Number(v) >= 0 && Number(v) <= 100),
      "targetPct must be between 0 and 100, or null"
    ),
});

// PUT /api/holdings/:symbol/target
holdingsRouter.put(
  "/:symbol/target",
  validate(targetSchema),
  async (req: AuthedRequest, res: Response) => {
    const userId = req.userId!;
    const symbol = req.params.symbol.toUpperCase();
    const { targetPct } = (req as any).valid as { targetPct: string | null };

    const holding = await prisma.holding.findUnique({
      where: { userId_symbol: { userId, symbol } },
    });
    if (!holding) return res.status(404).json({ error: "Holding not found" });

    const updated = await prisma.holding.update({
      where: { userId_symbol: { userId, symbol } },
      data: { targetPct },
    });
    res.json({ holding: serializeHolding(updated) });
  }
);

const avgCostSchema = z.object({
  avgCost: z
    .union([z.number(), z.string(), z.null()])
    .transform((v) => (v === null || v === "" ? null : String(v)))
    .refine(
      (v) => v === null || (/^\d+(\.\d+)?$/.test(v) && Number(v) > 0),
      "avgCost must be a positive number, or null to clear the override"
    ),
});

// PUT /api/holdings/:symbol/avg-cost
// Sets (or clears, with avgCost: null) a manual average-cost override. The
// ledger-computed avgCost is never touched — this just sits on top of it, so
// clearing the override always falls back to the true ledger math.
holdingsRouter.put(
  "/:symbol/avg-cost",
  validate(avgCostSchema),
  async (req: AuthedRequest, res: Response) => {
    const userId = req.userId!;
    const symbol = req.params.symbol.toUpperCase();
    const { avgCost } = (req as any).valid as { avgCost: string | null };

    const holding = await prisma.holding.findUnique({
      where: { userId_symbol: { userId, symbol } },
    });
    if (!holding) return res.status(404).json({ error: "Holding not found" });

    const updated = await prisma.holding.update({
      where: { userId_symbol: { userId, symbol } },
      data: { avgCostOverride: avgCost },
    });
    res.json({ holding: serializeHolding(updated) });
  }
);

// DELETE /api/holdings/:symbol
// Removes the stock from the portfolio entirely: deletes all of its
// transactions and the derived holding row.
holdingsRouter.delete("/:symbol", async (req: AuthedRequest, res: Response) => {
  const userId = req.userId!;
  const symbol = req.params.symbol.toUpperCase();

  const holding = await prisma.holding.findUnique({
    where: { userId_symbol: { userId, symbol } },
  });
  if (!holding) return res.status(404).json({ error: "Holding not found" });

  await prisma.transaction.deleteMany({ where: { userId, symbol } });
  await prisma.holding.deleteMany({ where: { userId, symbol } });

  res.json({ ok: true });
});

export function serializeHolding(h: {
  id: string;
  symbol: string;
  quantity: { toString(): string };
  avgCost: { toString(): string };
  avgCostOverride: { toString(): string } | null;
  realizedPnl: { toString(): string };
  targetPct: { toString(): string } | null;
  updatedAt: Date;
}) {
  return {
    id: h.id,
    symbol: h.symbol,
    quantity: h.quantity.toString(),
    avgCost: h.avgCost.toString(),
    avgCostOverride: h.avgCostOverride ? h.avgCostOverride.toString() : null,
    realizedPnl: h.realizedPnl.toString(),
    targetPct: h.targetPct ? h.targetPct.toString() : null,
    updatedAt: h.updatedAt,
  };
}
