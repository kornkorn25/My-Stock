import { Router, Response } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { getDailyHistory, HttpHistoryError } from "../services/history";
import { computeSupportResistance } from "../services/levels";

export const levelsRouter = Router();

const querySchema = z.object({
  symbol: z.string().min(1).max(12),
  // Live quote price from the client, so support/resistance is classified
  // against the same price shown elsewhere in the UI. Falls back to the
  // most recent daily close if omitted.
  price: z.coerce.number().positive().optional(),
});

// GET /api/levels?symbol=PLTR&price=123.45  (auth required; key stays server-side)
levelsRouter.get("/", requireAuth, validate(querySchema, "query"), async (req: AuthedRequest, res: Response) => {
  const { symbol, price } = (req as any).valid as z.infer<typeof querySchema>;
  try {
    const bars = await getDailyHistory(symbol);
    const currentPrice = price ?? bars[bars.length - 1].close;
    const levels = computeSupportResistance(bars, currentPrice);
    res.json({
      symbol: symbol.toUpperCase(),
      asOf: new Date(bars[bars.length - 1].time * 1000).toISOString(),
      barsUsed: bars.length,
      levels,
    });
  } catch (err) {
    if (err instanceof HttpHistoryError) {
      return res.status(err.status).json({ error: err.message });
    }
    throw err;
  }
});
