import { Router, Response } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { getFxRate, HttpFxError } from "../services/fx";

export const fxRouter = Router();

const querySchema = z.object({
  base: z.string().min(3).max(3).optional(),
  quote: z.string().min(3).max(3).optional(),
});

// GET /api/fx?base=USD&quote=THB  (auth required; cached server-side)
fxRouter.get("/", requireAuth, validate(querySchema, "query"), async (req: AuthedRequest, res: Response) => {
  const { base = "USD", quote = "THB" } = (req as any).valid as z.infer<typeof querySchema>;
  try {
    const fx = await getFxRate(base, quote);
    res.json(fx);
  } catch (err) {
    if (err instanceof HttpFxError) {
      return res.status(err.status).json({ error: err.message });
    }
    throw err;
  }
});
