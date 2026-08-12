import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { env } from "../lib/env";
import { computePortfolioSummary } from "../services/portfolioService";

export const cronRouter = Router();

/**
 * GET /api/cron/snapshot
 * Invoked once a day by Vercel Cron (see the `crons` entry in vercel.json).
 * Writes one PortfolioSnapshot per verified user for "today" (UTC), upserting
 * so a re-run on the same day overwrites rather than duplicates. Not tied to
 * a logged-in user — authenticated instead via the CRON_SECRET bearer token
 * Vercel attaches automatically when that env var is set.
 */
cronRouter.get("/snapshot", async (req: Request, res: Response) => {
  if (env.cronSecret) {
    if (req.headers.authorization !== `Bearer ${env.cronSecret}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  const users = await prisma.user.findMany({
    where: { emailVerified: true },
    select: { id: true },
  });

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  let ok = 0;
  let failed = 0;

  for (const user of users) {
    try {
      const { summary } = await computePortfolioSummary(user.id);
      await prisma.portfolioSnapshot.upsert({
        where: { userId_date: { userId: user.id, date: today } },
        create: {
          userId: user.id,
          date: today,
          totalValue: summary.totalValue,
          totalCost: summary.totalCost,
          totalUnrealized: summary.totalUnrealized,
          totalRealized: summary.totalRealized,
        },
        update: {
          totalValue: summary.totalValue,
          totalCost: summary.totalCost,
          totalUnrealized: summary.totalUnrealized,
          totalRealized: summary.totalRealized,
        },
      });
      ok++;
    } catch (err) {
      failed++;
      console.error(`Snapshot failed for user ${user.id}:`, err);
    }
  }

  res.json({ date: today.toISOString().slice(0, 10), usersTotal: users.length, ok, failed });
});
