import { Request, Response, NextFunction } from "express";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  if (err instanceof Error) {
    // Known domain errors (e.g. oversell) surface as 400.
    const msg = err.message || "Internal server error";
    const isClientError = /cannot sell|must be greater|already exists|not found/i.test(msg);
    return res.status(isClientError ? 400 : 500).json({ error: msg });
  }
  return res.status(500).json({ error: "Internal server error" });
}
