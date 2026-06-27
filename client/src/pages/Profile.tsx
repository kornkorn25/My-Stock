import { useState, FormEvent, ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";
import { api, ApiError } from "../lib/api";

function Card({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
      <p className="mb-4 mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>
      {children}
    </section>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-300";
const labelClass = "mb-1 block text-sm font-medium dark:text-slate-300";

function Notice({ kind, children }: { kind: "ok" | "error"; children: ReactNode }) {
  const cls =
    kind === "ok"
      ? "bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-300"
      : "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300";
  return <div className={`rounded-lg px-3 py-2 text-sm ${cls}`}>{children}</div>;
}

export function Profile() {
  const { user, updateProfile } = useAuth();

  // --- Display name ---
  const [name, setName] = useState(user?.displayName ?? "");
  const [nameMsg, setNameMsg] = useState<string | null>(null);
  const [nameBusy, setNameBusy] = useState(false);

  async function saveName(e: FormEvent) {
    e.preventDefault();
    setNameMsg(null);
    setNameBusy(true);
    try {
      await updateProfile(name.trim());
      setNameMsg("Display name updated.");
    } catch (err) {
      setNameMsg(err instanceof ApiError ? err.message : "Failed to update");
    } finally {
      setNameBusy(false);
    }
  }

  // --- Email ---
  const [emailPw, setEmailPw] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [emailNotice, setEmailNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [emailBusy, setEmailBusy] = useState(false);

  async function submitEmail(e: FormEvent) {
    e.preventDefault();
    setEmailNotice(null);
    setEmailBusy(true);
    try {
      const res = await api.post<{ message: string }>("/api/auth/change-email", {
        currentPassword: emailPw,
        newEmail: newEmail.trim().toLowerCase(),
      });
      setEmailNotice({ kind: "ok", text: res.message });
      setEmailPw("");
      setNewEmail("");
    } catch (err) {
      setEmailNotice({ kind: "error", text: err instanceof ApiError ? err.message : "Failed" });
    } finally {
      setEmailBusy(false);
    }
  }

  // --- Password ---
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwNotice, setPwNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pwBusy, setPwBusy] = useState(false);

  async function submitPassword(e: FormEvent) {
    e.preventDefault();
    setPwNotice(null);
    if (newPw !== confirmPw) {
      setPwNotice({ kind: "error", text: "New passwords do not match" });
      return;
    }
    setPwBusy(true);
    try {
      const res = await api.post<{ message: string }>("/api/auth/change-password", {
        currentPassword: curPw,
        newPassword: newPw,
      });
      setPwNotice({ kind: "ok", text: res.message });
      setCurPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (err) {
      setPwNotice({ kind: "error", text: err instanceof ApiError ? err.message : "Failed" });
    } finally {
      setPwBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div>
        <h1 className="text-xl font-bold dark:text-white">Profile</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Signed in as <span className="font-medium text-slate-700 dark:text-slate-200">{user?.email}</span>
        </p>
      </div>

      <Card title="Display name" description="This is what shows up in the top bar.">
        <form onSubmit={saveName} className="space-y-3">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} />
          {nameMsg && <Notice kind={nameMsg.includes("updated") ? "ok" : "error"}>{nameMsg}</Notice>}
          <button
            type="submit"
            disabled={nameBusy || name.trim() === ""}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            {nameBusy ? "Saving…" : "Save name"}
          </button>
        </form>
      </Card>

      <Card
        title="Email address"
        description="Type your current password and the new email. We'll send a link to the new address, and nothing changes until you click it."
      >
        <form onSubmit={submitEmail} className="space-y-3">
          <div>
            <label className={labelClass}>Current password</label>
            <input type="password" className={inputClass} value={emailPw} onChange={(e) => setEmailPw(e.target.value)} required />
          </div>
          <div>
            <label className={labelClass}>New email</label>
            <input type="email" className={inputClass} value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required placeholder="new@example.com" />
          </div>
          {emailNotice && <Notice kind={emailNotice.kind}>{emailNotice.text}</Notice>}
          <button
            type="submit"
            disabled={emailBusy}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            {emailBusy ? "Sending…" : "Send confirmation"}
          </button>
        </form>
      </Card>

      <Card
        title="Password"
        description="Type your current password and pick a new one. We'll email you a link, and the new password only kicks in once you click it."
      >
        <form onSubmit={submitPassword} className="space-y-3">
          <div>
            <label className={labelClass}>Current password</label>
            <input type="password" className={inputClass} value={curPw} onChange={(e) => setCurPw(e.target.value)} required />
          </div>
          <div>
            <label className={labelClass}>New password</label>
            <input type="password" className={inputClass} value={newPw} onChange={(e) => setNewPw(e.target.value)} required minLength={8} placeholder="At least 8 characters" />
          </div>
          <div>
            <label className={labelClass}>Confirm new password</label>
            <input type="password" className={inputClass} value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required minLength={8} />
          </div>
          {pwNotice && <Notice kind={pwNotice.kind}>{pwNotice.text}</Notice>}
          <button
            type="submit"
            disabled={pwBusy}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            {pwBusy ? "Sending…" : "Send confirmation"}
          </button>
        </form>
      </Card>
    </div>
  );
}
