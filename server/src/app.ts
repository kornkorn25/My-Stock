import "express-async-errors";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import path from "path";
import fs from "fs";
import { env } from "./lib/env";
import { authRouter } from "./routes/auth";
import { transactionsRouter } from "./routes/transactions";
import { holdingsRouter } from "./routes/holdings";
import { portfolioRouter } from "./routes/portfolio";
import { quoteRouter } from "./routes/quote";
import { profileRouter } from "./routes/profile";
import { errorHandler } from "./middleware/errorHandler";

const app = express();

app.use(cors({ origin: env.clientOrigin }));
app.use(express.json());

// Rate limit the Finnhub proxy to protect our upstream quota.
const quoteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60, // 60 requests/min/IP; cache absorbs the rest
  standardHeaders: true,
  legacyHeaders: false,
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/transactions", transactionsRouter);
app.use("/api/holdings", holdingsRouter);
app.use("/api/portfolio", portfolioRouter);
app.use("/api/quote", quoteLimiter, quoteRouter);
app.use("/api/profile", quoteLimiter, profileRouter);

// In production we serve the built frontend from the same origin, so the
// React app's relative `/api` calls just work (no CORS, no API base URL).
// Resolves to <repo>/client/dist from both dist (../../) and tsx (../../) runs.
const clientDist = path.resolve(__dirname, "../../client/dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // SPA fallback: anything that isn't an API route returns index.html.
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

// Async error forwarding for Express 4 (wrap thrown promise rejections).
app.use(errorHandler);

// Catch unhandled promise rejections from async route handlers.
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});

if (require.main === module) {
  app.listen(env.port, () => {
    console.log(`API listening on http://localhost:${env.port}`);
  });
}

export { app };
