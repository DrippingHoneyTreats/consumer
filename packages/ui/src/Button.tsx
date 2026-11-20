"use client";

import { cn } from "./cn";
import { useEffect, useRef, useState, type ButtonHTMLAttributes, type MouseEvent, type ReactNode } from "react";

type Variant = "primary" | "secondary" | "tertiary" | "ghost" | "danger" | "dark";

const styles: Record<Variant, string> = {
  primary:
    "bg-blush text-deep hover:bg-blush-deep shadow-[0_10px_24px_-10px_rgba(239,176,185,0.9)]",
  secondary: "bg-sage text-deep hover:brightness-95",
  tertiary: "border border-deep/15 bg-white text-deep hover:border-deep/35",
  ghost: "bg-transparent text-deep hover:bg-deep/5",
  danger: "bg-danger/10 text-danger hover:bg-danger/15",
  dark: "bg-deep text-white hover:bg-deep-soft shadow-[0_10px_24px_-10px_rgba(63,95,70,0.7)]",
};

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> & {
  /**
   * Return a promise (e.g. `onClick={() => save()}`) and the button shows its
   * spinner and blocks double taps until it settles. No extra state needed.
   */
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void | Promise<unknown>;
  variant?: Variant;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
};

export function Button({
  variant = "primary",
  loading,
  leftIcon,
  rightIcon,
  fullWidth,
  className,
  children,
  disabled,
  onClick,
  ...props
}: Props) {
  const [pending, setPending] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    // Set on every mount: React (dev/StrictMode) mounts, unmounts and re-mounts,
    // and a stale `false` would leave the spinner on forever.
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const busy = Boolean(loading || pending);

  function handleClick(e: MouseEvent<HTMLButtonElement>) {
    if (busy) return;
    const result = onClick?.(e);
    if (result && typeof (result as Promise<unknown>).then === "function") {
      setPending(true);
      (result as Promise<unknown>)
        .catch(() => {
          /* the caller shows its own error */
        })
        .finally(() => {
          if (mounted.current) setPending(false);
        });
    }
  }

  return (
    <button
      className={cn(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100",
        styles[variant],
        fullWidth && "w-full",
        busy && "cursor-progress disabled:opacity-80",
        className,
      )}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      onClick={handleClick}
      {...props}
    >
      {busy ? (
        <span
          className={cn(
            "h-4 w-4 animate-spin rounded-full border-2",
            variant === "dark" ? "border-white/30 border-t-white" : "border-deep/30 border-t-deep",
          )}
        />
      ) : (
        leftIcon
      )}
      {children}
      {!busy ? rightIcon : null}
    </button>
  );
}
