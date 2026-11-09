"use client";

import { cn } from "./cn";
import type { ButtonHTMLAttributes, ReactNode } from "react";

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

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
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
  ...props
}: Props) {
  return (
    <button
      className={cn(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100",
        styles[variant],
        fullWidth && "w-full",
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
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
      {!loading ? rightIcon : null}
    </button>
  );
}
