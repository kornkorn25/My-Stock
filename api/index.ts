// Vercel serverless entry point. The Express app is itself a (req, res)
// handler, so we just re-export it. Vercel routes /api/* here via vercel.json;
// the static frontend is served from the CDN, not from Express.
import { app } from "../server/src/app";

export default app;
