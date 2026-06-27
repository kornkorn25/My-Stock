import nodemailer, { Transporter } from "nodemailer";
import { env } from "../lib/env";

let transporter: Transporter | null = null;
let initialized = false;

/**
 * Lazily build the SMTP transport from env. If SMTP_HOST is not configured,
 * returns null and callers fall back to logging (dev-friendly, degrade
 * gracefully like the Finnhub key does).
 */
function getTransport(): Transporter | null {
  if (initialized) return transporter;
  initialized = true;
  if (!env.smtp.host) {
    transporter = null;
    return null;
  }
  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
  });
  return transporter;
}

export interface MailInput {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Sends an email if SMTP is configured; otherwise logs the message (and any
 * links it contains) to the server console so local development still works.
 */
export async function sendMail({ to, subject, text, html }: MailInput): Promise<void> {
  const tx = getTransport();
  if (!tx) {
    console.log(
      `\n[email:console] SMTP not configured — would send to ${to}\n` +
        `  Subject: ${subject}\n` +
        `  ${text.replace(/\n/g, "\n  ")}\n`
    );
    return;
  }
  await tx.sendMail({ from: env.smtp.from, to, subject, text, html });
}

/** Builds a verification link that points back at this API server. */
export function verificationLink(token: string): string {
  return `${env.serverPublicUrl}/api/auth/verify/${token}`;
}
