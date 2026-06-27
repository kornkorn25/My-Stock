import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

type Source = "body" | "query" | "params";

/** Validates a request part against a zod schema and replaces it with parsed data. */
export function validate(schema: ZodSchema, source: Source = "body") {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: result.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      });
    }
    // Store parsed/coerced data on a dedicated field to avoid mutating
    // read-only getters (req.query is a getter in Express 5-style setups).
    (req as Request & { valid?: unknown }).valid = result.data;
    next();
  };
}
