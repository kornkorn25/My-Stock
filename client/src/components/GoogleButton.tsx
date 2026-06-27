import { useEffect, useRef } from "react";
import { useTheme } from "../hooks/useTheme";

const GSI_SRC = "https://accounts.google.com/gsi/client";

// Minimal shape of the Google Identity Services API we use.
interface GoogleId {
  accounts: {
    id: {
      initialize: (cfg: {
        client_id: string;
        callback: (resp: { credential: string }) => void;
      }) => void;
      renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
    };
  };
}
declare global {
  interface Window {
    google?: GoogleId;
  }
}

let scriptPromise: Promise<void> | null = null;
function loadGsi(): Promise<void> {
  if (window.google) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = GSI_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google Identity Services"));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

/**
 * Renders the official "Sign in with Google" button. No-op (renders nothing)
 * unless a client ID is provided — keeps the feature gated behind config.
 */
export function GoogleButton({
  clientId,
  onCredential,
}: {
  clientId: string;
  onCredential: (credential: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  // Keep latest callback without re-initializing GIS.
  const cbRef = useRef(onCredential);
  cbRef.current = onCredential;

  useEffect(() => {
    if (!clientId || !ref.current) return;
    let cancelled = false;

    loadGsi()
      .then(() => {
        if (cancelled || !ref.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (resp) => cbRef.current(resp.credential),
        });
        ref.current.innerHTML = "";
        window.google.accounts.id.renderButton(ref.current, {
          theme: theme === "dark" ? "filled_black" : "outline",
          size: "large",
          width: 320,
          shape: "pill",
          text: "continue_with",
          logo_alignment: "center",
        });
      })
      .catch(() => {
        /* network blocked — silently hide */
      });

    return () => {
      cancelled = true;
    };
  }, [clientId, theme]);

  if (!clientId) return null;
  return <div ref={ref} className="flex justify-center" />;
}
