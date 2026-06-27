import { Router, Response } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { getQuote, HttpQuoteError } from "../services/finnhub";

export const quoteRouter = Router();

const querySchema = z.object({
  symbol: z.string().min(1).max(12),
});

// GET /api/quote?symbol=PLTR  (auth required; key stays server-side)
quoteRouter.get("/", requireAuth, validate(querySchema, "query"), async (req: AuthedRequest, res: Response) => {
  const { symbol } = (req as any).valid as z.infer<typeof querySchema>;
  try {
    const quote = await getQuote(symbol);
    res.json({ quote });
  } catch (err) {
    if (err instanceof HttpQuoteError) {
      return res.status(err.status).json({ error: err.message });
    }
    throw err;
  }
});
