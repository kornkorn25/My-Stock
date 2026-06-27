import dotenv from "dotenv";
import path from "path";

// Load .env from the server root regardless of cwd.
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === "") {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  finnhubApiKey: process.env.FINNHUB_API_KEY ?? "",
  quoteCacheTtl: Number(process.env.QUOTE_CACHE_TTL ?? 45),
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",

  // Public base URL of THIS server, used to build verification links sent by
  // email. The link is opened directly in a browser, so it must reach the API.
  serverPublicUrl:
    process.env.SERVER_PUBLIC_URL ?? `http://localhost:${process.env.PORT ?? 4000}`,

  // Google OAuth (Sign in with Google). Empty = feature disabled; the button
  // is hidden and the /google endpoint returns 503.
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",

  // SMTP for outbound email. If host is empty, the email service falls back to
  // logging the verification link to the server console (dev-friendly).
  smtp: {
    host: process.env.SMTP_HOST ?? "",
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: (process.env.SMTP_SECURE ?? "false") === "true",
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
    from: process.env.SMTP_FROM ?? "MyStock <no-reply@localhost>",
  },
};
