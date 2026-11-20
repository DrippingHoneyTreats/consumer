"use client";

import { useEffect, useState } from "react";
import { apiClient, apiUrl } from "@/lib/api";
import { cn } from "@/lib/cn";

/** Official multi-colour Google "G". */
export function GoogleIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden focusable="false">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

let providersPromise: Promise<{ google: boolean }> | null = null;

function loadProviders() {
  providersPromise ??= apiClient.get<{ google: boolean }>("/auth/providers").catch(() => ({ google: false }));
  return providersPromise;
}

/**
 * "Continue with Google" — full-page redirect through the backend's OAuth
 * flow, then back to `returnTo`. Hidden until Google keys are configured.
 */
export function GoogleButton({
  returnTo = "/",
  label = "Continue with Google",
  className,
  withDivider = false,
}: {
  returnTo?: string;
  label?: string;
  className?: string;
  /** Adds an "or" divider underneath, for placing above another sign-in method. */
  withDivider?: boolean;
}) {
  const [enabled, setEnabled] = useState(false);
  const [going, setGoing] = useState(false);

  useEffect(() => {
    let alive = true;
    void loadProviders().then((p) => alive && setEnabled(p.google));
    return () => {
      alive = false;
    };
  }, []);

  if (!enabled) return null;

  const href = apiUrl(`/auth/google/start?returnTo=${encodeURIComponent(returnTo)}`);

  return (
    <div className={className}>
      <a
        href={href}
        onClick={() => setGoing(true)}
        aria-busy={going}
        className={cn(
          "flex h-12 w-full items-center justify-center gap-3 rounded-full border border-deep/15 bg-white px-5 text-sm font-semibold text-deep shadow-[var(--shadow-card)] transition active:scale-[0.98]",
          going && "pointer-events-none opacity-60",
        )}
      >
        <GoogleIcon />
        <span>{going ? "Opening Google…" : label}</span>
      </a>
      {withDivider ? (
        <div className="my-5 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-deep/35">
          <span className="h-px flex-1 bg-deep/10" />
          or
          <span className="h-px flex-1 bg-deep/10" />
        </div>
      ) : null}
    </div>
  );
}
