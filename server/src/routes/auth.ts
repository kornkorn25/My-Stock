import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "../lib/prisma";
import { validate } from "../middleware/validate";
import { requireAuth, signToken, AuthedRequest } from "../middleware/auth";
import { sendMail, verificationLink } from "../services/email";
import { env } from "../lib/env";

export const authRouter = Router();

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const EMAIL_CHANGE = "EMAIL_CHANGE";
const PASSWORD_CHANGE = "PASSWORD_CHANGE";
const EMAIL_VERIFY = "EMAIL_VERIFY";

const googleClient = env.googleClientId ? new OAuth2Client(env.googleClientId) : null;

/** Sends a fresh "verify your email" link to an unverified account. */
async function sendVerifyEmail(userId: string, email: string): Promise<void> {
  const token = await createToken(userId, EMAIL_VERIFY, email);
  const link = verificationLink(token);
  await sendMail({
    to: email,
    subject: "Verify your email for MyStock",
    text: `Thanks for signing up. Click the link below to switch your account on:\n\n${link}\n\nThe link works for the next hour.`,
    html: `<p>Thanks for signing up. Click the link below to switch your account on:</p>
<p><a href="${link}">Verify my email</a></p>
<p style="color:#64748b;font-size:13px">The link works for the next hour.</p>`,
  });
}

const registerSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  displayName: z.string().min(1).max(60),
});

const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(60),
});

const changeEmailSchema = z.object({
  currentPassword: z.string().min(1),
  newEmail: z.string().email().toLowerCase(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

const emailOnlySchema = z.object({ email: z.string().email().toLowerCase() });

const googleSchema = z.object({ credential: z.string().min(1) });

/** Creates a single-use verification token row and returns its random value. */
async function createToken(userId: string, type: string, payload: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  // Only one pending change of a given type per user at a time.
  await prisma.verificationToken.deleteMany({ where: { userId, type } });
  await prisma.verificationToken.create({
    data: { userId, type, token, payload, expiresAt: new Date(Date.now() + TOKEN_TTL_MS) },
  });
  return token;
}

/** Minimal self-contained HTML page shown after clicking an email link. */
function resultPage(title: string, message: string, ok: boolean): string {
  const color = ok ? "#16a34a" : "#dc2626";
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title></head>
<body style="font-family:system-ui,sans-serif;background:#f8fafc;margin:0;
display:flex;min-height:100vh;align-items:center;justify-content:center">
<div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;
padding:40px;max-width:420px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.08)">
<h1 style="color:${color};font-size:20px;margin:0 0 8px">${title}</h1>
<p style="color:#475569;font-size:14px;margin:0 0 20px">${message}</p>
<a href="${env.clientOrigin}/login" style="display:inline-block;background:#0f172a;
color:#fff;text-decoration:none;font-size:14px;font-weight:600;
padding:10px 20px;border-radius:8px">Go to login</a>
</div></body></html>`;
}

// GET /api/auth/config — public feature flags the frontend needs at load.
authRouter.get("/config", (_req, res: Response) => {
  res.json({ googleClientId: env.googleClientId });
});

authRouter.post("/register", validate(registerSchema), async (req, res: Response) => {
  const { email, password, displayName } = (req as any).valid as z.infer<typeof registerSchema>;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "Email already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, passwordHash, displayName, emailVerified: false },
  });

  // No JWT yet — the account is locked until the email is verified.
  await sendVerifyEmail(user.id, user.email);
  res.status(201).json({
    needsVerification: true,
    message: `We sent a verification link to ${user.email}. Click it to activate your account.`,
  });
});

authRouter.post("/login", validate(loginSchema), async (req, res: Response) => {
  const { email, password } = (req as any).valid as z.infer<typeof loginSchema>;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    // No password hash => Google-only account; don't reveal which.
    if (user && !user.passwordHash) {
      return res.status(401).json({ error: "This account uses Google sign-in" });
    }
    return res.status(401).json({ error: "Invalid email or password" });
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  if (!user.emailVerified) {
    return res
      .status(403)
      .json({ error: "Please verify your email first", needsVerification: true });
  }

  const token = signToken({ sub: user.id, email: user.email });
  res.json({
    token,
    user: { id: user.id, email: user.email, displayName: user.displayName },
  });
});

// POST /api/auth/resend-verification — re-send the activation email.
authRouter.post(
  "/resend-verification",
  validate(emailOnlySchema),
  async (req, res: Response) => {
    const { email } = (req as any).valid as z.infer<typeof emailOnlySchema>;
    const user = await prisma.user.findUnique({ where: { email } });
    // Always respond success to avoid leaking which emails exist.
    if (user && !user.emailVerified && user.passwordHash) {
      await sendVerifyEmail(user.id, user.email);
    }
    res.json({ ok: true, message: "If that account needs verification, a link is on its way." });
  }
);

// POST /api/auth/google — verify a Google ID token, then log in / link / create.
authRouter.post("/google", validate(googleSchema), async (req, res: Response) => {
  if (!googleClient) {
    return res.status(503).json({ error: "Google sign-in is not configured" });
  }
  const { credential } = (req as any).valid as z.infer<typeof googleSchema>;

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: env.googleClientId,
    });
    payload = ticket.getPayload();
  } catch {
    return res.status(401).json({ error: "Invalid Google credential" });
  }
  if (!payload?.email || !payload.sub) {
    return res.status(401).json({ error: "Google account missing email" });
  }

  const email = payload.email.toLowerCase();
  const googleId = payload.sub;
  const displayName = payload.name || email.split("@")[0];

  // 1) Existing Google-linked account. 2) Existing email account -> link it.
  // 3) Brand new -> create (verified, no password).
  let user = await prisma.user.findUnique({ where: { googleId } });
  if (!user) {
    const byEmail = await prisma.user.findUnique({ where: { email } });
    if (byEmail) {
      user = await prisma.user.update({
        where: { id: byEmail.id },
        data: { googleId, emailVerified: true },
      });
    } else {
      user = await prisma.user.create({
        data: { email, displayName, googleId, emailVerified: true },
      });
    }
  }

  const token = signToken({ sub: user.id, email: user.email });
  res.json({
    token,
    user: { id: user.id, email: user.email, displayName: user.displayName },
  });
});

authRouter.get("/me", requireAuth, async (req: AuthedRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, email: true, displayName: true, createdAt: true },
  });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user });
});

// PATCH /api/auth/profile — change display name (no email confirmation needed).
authRouter.patch(
  "/profile",
  requireAuth,
  validate(updateProfileSchema),
  async (req: AuthedRequest, res: Response) => {
    const { displayName } = (req as any).valid as z.infer<typeof updateProfileSchema>;
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { displayName },
      select: { id: true, email: true, displayName: true, createdAt: true },
    });
    res.json({ user });
  }
);

// POST /api/auth/change-email — verify current password, then email a
// confirmation link to the NEW address. Email only changes once clicked.
authRouter.post(
  "/change-email",
  requireAuth,
  validate(changeEmailSchema),
  async (req: AuthedRequest, res: Response) => {
    const { currentPassword, newEmail } = (req as any).valid as z.infer<typeof changeEmailSchema>;

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (!user.passwordHash) {
      return res.status(400).json({ error: "This account uses Google sign-in" });
    }

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Current password is incorrect" });

    if (newEmail === user.email) {
      return res.status(400).json({ error: "That is already your email" });
    }
    const taken = await prisma.user.findUnique({ where: { email: newEmail } });
    if (taken) return res.status(409).json({ error: "Email already in use" });

    const token = await createToken(user.id, EMAIL_CHANGE, newEmail);
    const link = verificationLink(token);
    await sendMail({
      to: newEmail,
      subject: "Confirm your new email for MyStock",
      text: `You asked to switch your account email to ${newEmail}. Click below to confirm:\n\n${link}\n\nThe link works for the next hour. Didn't ask for this? Just ignore this email.`,
      html: `<p>You asked to switch your account email to <b>${newEmail}</b>. Click below to confirm:</p>
<p><a href="${link}">Confirm new email</a></p>
<p style="color:#64748b;font-size:13px">The link works for the next hour. Didn't ask for this? Just ignore this email.</p>`,
    });

    res.json({ ok: true, message: `We sent a link to ${newEmail}. Click it to finish the change.` });
  }
);

// POST /api/auth/change-password — verify current password, then email a
// confirmation link to the CURRENT address. Password only changes once clicked.
authRouter.post(
  "/change-password",
  requireAuth,
  validate(changePasswordSchema),
  async (req: AuthedRequest, res: Response) => {
    const { currentPassword, newPassword } = (req as any).valid as z.infer<
      typeof changePasswordSchema
    >;

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (!user.passwordHash) {
      return res.status(400).json({ error: "This account uses Google sign-in" });
    }

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Current password is incorrect" });

    // Store the already-hashed new password as the token payload (never plaintext).
    const newHash = await bcrypt.hash(newPassword, 12);
    const token = await createToken(user.id, PASSWORD_CHANGE, newHash);
    const link = verificationLink(token);
    await sendMail({
      to: user.email,
      subject: "Confirm your password change for MyStock",
      text: `You asked to change your password. Click below to confirm:\n\n${link}\n\nThe link works for the next hour. Didn't ask for this? Ignore this email and your password stays the same.`,
      html: `<p>You asked to change your password. Click below to confirm:</p>
<p><a href="${link}">Confirm password change</a></p>
<p style="color:#64748b;font-size:13px">The link works for the next hour. Didn't ask for this? Ignore this email and your password stays the same.</p>`,
    });

    res.json({ ok: true, message: `We sent a link to ${user.email}. Click it to finish the change.` });
  }
);

// GET /api/auth/verify/:token — public landing for email links. Applies the
// pending change (email or password) and returns a small HTML result page.
authRouter.get("/verify/:token", async (req, res: Response) => {
  const { token } = req.params;
  const record = await prisma.verificationToken.findUnique({ where: { token } });

  if (!record || record.expiresAt < new Date()) {
    if (record) await prisma.verificationToken.delete({ where: { id: record.id } });
    return res
      .status(400)
      .send(resultPage("Link expired", "This link has expired or was already used. Request a new one.", false));
  }

  try {
    if (record.type === EMAIL_CHANGE) {
      // Re-check uniqueness at apply time in case the email was taken meanwhile.
      const taken = await prisma.user.findUnique({ where: { email: record.payload } });
      if (taken && taken.id !== record.userId) {
        await prisma.verificationToken.delete({ where: { id: record.id } });
        return res
          .status(409)
          .send(resultPage("Email unavailable", "That email was taken in the meantime.", false));
      }
      await prisma.user.update({ where: { id: record.userId }, data: { email: record.payload } });
    } else if (record.type === PASSWORD_CHANGE) {
      await prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash: record.payload },
      });
    } else if (record.type === EMAIL_VERIFY) {
      await prisma.user.update({
        where: { id: record.userId },
        data: { emailVerified: true },
      });
    }
  } finally {
    await prisma.verificationToken.delete({ where: { id: record.id } });
  }

  const messages: Record<string, string> = {
    [EMAIL_CHANGE]: "Your email is changed. Use it next time you log in.",
    [PASSWORD_CHANGE]: "Your password is changed. Use it next time you log in.",
    [EMAIL_VERIFY]: "Your email is verified and your account is ready. Go ahead and log in.",
  };
  res.send(resultPage("All set", messages[record.type] ?? "Done.", true));
});
