import { useState, FormEvent } from "react";
import { useAuth } from "../hooks/useAuth";
import { useAuthConfig } from "../hooks/useAuthConfig";
import { api, ApiError } from "../lib/api";
import { GoogleButton } from "../components/GoogleButton";
import { ThemeToggle } from "../components/ThemeToggle";
import { Logo } from "../components/Logo";

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-slate-300 dark:focus:ring-white/10";

export function Login() {
  const { login, register, loginWithGoogle } = useAuth();
  const { data: cfg } = useAuthConfig();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // When set, we show a "check your inbox" panel instead of the form.
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [resendMsg, setResendMsg] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        const res = await register(email, password, displayName);
        if (res.needsVerification) setPendingEmail(email);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        // Login blocked because the email isn't verified yet.
        if (err.status === 403) setPendingEmail(email);
      } else {
        setError("Something went wrong");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function onGoogle(credential: string) {
    setError(null);
    try {
      await loginWithGoogle(credential);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Google sign-in failed");
    }
  }

  async function resend() {
    if (!pendingEmail) return;
    setResendMsg(null);
    try {
      const res = await api.post<{ message: string }>("/api/auth/resend-verification", {
        email: pendingEmail,
      });
      setResendMsg(res.message);
    } catch {
      setResendMsg("Could not resend right now. Try again later.");
    }
  }

  return (
    <div className="relative flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <ThemeToggle className="absolute right-4 top-4 z-20 bg-white/70 backdrop-blur dark:bg-slate-900/60" />

      {/* Branding panel (animated aurora) */}
      <div className="auth-aurora animate-gradient-pan relative hidden w-1/2 overflow-hidden lg:block">
        <div className="absolute -left-16 top-24 h-64 w-64 animate-float rounded-full bg-white/20 blur-2xl" />
        <div
          className="absolute bottom-20 right-10 h-72 w-72 animate-float rounded-full bg-white/10 blur-2xl"
          style={{ animationDelay: "1.5s" }}
        />
        <div className="relative z-10 flex h-full flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <Logo size={26} />
            MyStock
          </div>
          <div>
            <h1 className="max-w-sm text-4xl font-bold leading-tight drop-shadow-sm">
              Know what your portfolio is actually worth.
            </h1>
            <p className="mt-4 max-w-sm text-white/80">
              Punch in your buys and sells. It does the math: cost, profit, and what
              you're holding right now at live prices.
            </p>
          </div>
          <div className="text-sm text-white/70">Fractional shares are fine here.</div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex w-full items-center justify-center px-5 py-12 lg:w-1/2">
        <div className="w-full max-w-sm animate-fade-in-scale">
          {pendingEmail ? (
            <VerifyNotice
              email={pendingEmail}
              resendMsg={resendMsg}
              onResend={resend}
              onBack={() => {
                setPendingEmail(null);
                setResendMsg(null);
                setError(null);
                setMode("login");
              }}
            />
          ) : (
            <>
              <div className="mb-7 text-center">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {mode === "login" ? "Welcome back" : "Create your account"}
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {mode === "login"
                    ? "Sign in to your portfolio"
                    : "Takes about a minute to set up"}
                </p>
              </div>

              {cfg?.googleClientId && (
                <>
                  <div className="mb-5 flex justify-center">
                    <GoogleButton clientId={cfg.googleClientId} onCredential={onGoogle} />
                  </div>
                  <div className="mb-5 flex items-center gap-3 text-xs text-slate-400">
                    <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                    or continue with email
                    <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                  </div>
                </>
              )}

              <form onSubmit={onSubmit} className="space-y-4">
                {mode === "register" && (
                  <Field label="Display name">
                    <input
                      className={inputClass}
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      required
                      placeholder="Jane Doe"
                    />
                  </Field>
                )}
                <Field label="Email">
                  <input
                    type="email"
                    className={inputClass}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                  />
                </Field>
                <Field label="Password">
                  <input
                    type="password"
                    className={inputClass}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={mode === "register" ? 8 : undefined}
                    placeholder={mode === "register" ? "At least 8 characters" : "••••••••"}
                  />
                </Field>

                {error && (
                  <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-[.99] disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  {submitting ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
                </button>
              </form>

              <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
                {mode === "login" ? "No account yet?" : "Already have an account?"}{" "}
                <button
                  onClick={() => {
                    setMode(mode === "login" ? "register" : "login");
                    setError(null);
                  }}
                  className="font-semibold text-slate-900 underline-offset-2 hover:underline dark:text-white"
                >
                  {mode === "login" ? "Create one" : "Sign in"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>
      {children}
    </div>
  );
}

function VerifyNotice({
  email,
  resendMsg,
  onResend,
  onBack,
}: {
  email: string;
  resendMsg: string | null;
  onResend: () => void;
  onBack: () => void;
}) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-400">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 7 9 6 9-6" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Check your inbox</h2>
      <p className="mx-auto mt-2 max-w-xs text-sm text-slate-500 dark:text-slate-400">
        We just sent a link to <span className="font-medium text-slate-700 dark:text-slate-200">{email}</span>.
        Open it to switch your account on, then come back and sign in.
      </p>

      {resendMsg && (
        <div className="mt-4 rounded-xl bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950/50 dark:text-green-300">
          {resendMsg}
        </div>
      )}

      <button
        onClick={onResend}
        className="mt-5 w-full rounded-xl border border-slate-300 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        Resend verification email
      </button>
      <button
        onClick={onBack}
        className="mt-3 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
      >
        Back to sign in
      </button>
    </div>
  );
}
