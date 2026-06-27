import { Router, Response } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { getProfile, HttpQuoteError } from "../services/finnhub";

export const profileRouter = Router();

const querySchema = z.object({
  symbol: z.string().min(1).max(12),
});

// GET /api/profile?symbol=PLTR  -> company name + logo (cached 24h)
profileRouter.get(
  "/",
  requireAuth,
  validate(querySchema, "query"),
  async (req: AuthedRequest, res: Response) => {
    const { symbol } = (req as any).valid as z.infer<typeof querySchema>;
    try {
      const profile = await getProfile(symbol);
      res.json({ profile });
    } catch (err) {
      if (err instanceof HttpQuoteError) {
        return res.status(err.status).json({ error: err.message });
      }
      throw err;
    }
  }
);
