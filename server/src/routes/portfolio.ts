import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { computePortfolioSummary } from "../services/portfolioService";

export const portfolioRouter = Router();

portfolioRouter.use(requireAuth);

/**
 * GET /api/portfolio
 * Returns each position valued at the latest (cached) Finnhub price plus an
 * overall summary and allocation %. Positions whose quote can't be fetched are
 * returned with a `priceError` and excluded from value-based totals.
 */
portfolioRouter.get("/", async (req: AuthedRequest, res: Response) => {
  const result = await computePortfolioSummary(req.userId!);
  res.json(result);
});

/**
 * GET /api/portfolio/history?days=90
 * Daily portfolio-value snapshots written by the cron in routes/cron.ts, for
 * the returns-over-time chart. History only exists from whenever the cron
 * started running — there's nothing to backfill from.
 */
portfolioRouter.get("/history", async (req: AuthedRequest, res: Response) => {
  const userId = req.userId!;
  const days = Math.min(365, Math.max(1, Number(req.query.days) || 90));
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days);
  since.setUTCHours(0, 0, 0, 0);

  const rows = await prisma.portfolioSnapshot.findMany({
    where: { userId, date: { gte: since } },
    orderBy: { date: "asc" },
  });

  res.json({
    snapshots: rows.map((r) => ({
      date: r.date.toISOString().slice(0, 10),
      totalValue: r.totalValue.toString(),
      totalCost: r.totalCost.toString(),
      totalUnrealized: r.totalUnrealized.toString(),
      totalRealized: r.totalRealized.toString(),
    })),
  });
});
