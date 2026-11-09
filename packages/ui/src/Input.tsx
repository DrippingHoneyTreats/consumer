"use client";

import { cn } from "./cn";
import type { InputHTMLAttributes, ReactNode } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
  leftAddon?: ReactNode;
};

export function Input({ label, hint, error, leftAddon, className, id, ...props }: Props) {
  const inputId = id || props.name;
  return (
    <label className="flex w-full flex-col gap-1.5 text-sm">
      {label ? <span className="pl-1 font-semibold text-deep">{label}</span> : null}
      <span
        className={cn(
          "flex min-h-13 items-center gap-2 rounded-2xl border bg-white px-4 shadow-[0_1px_2px_rgba(63,95,70,0.04)] transition",
          error
            ? "border-danger"
            : "border-deep/10 focus-within:border-tea focus-within:ring-4 focus-within:ring-sage/25",
        )}
      >
        {leftAddon}
        <input
          id={inputId}
          className={cn(
            "w-full bg-transparent py-3.5 text-deep outline-none placeholder:text-deep/35",
            className,
          )}
          {...props}
        />
      </span>
      {error ? <span className="pl-1 text-xs text-danger">{error}</span> : null}
      {!error && hint ? <span className="pl-1 text-xs text-deep/55">{hint}</span> : null}
    </label>
  );
}

export const textareaClass =
  "w-full rounded-2xl border border-deep/10 bg-white px-4 py-3 text-deep outline-none transition placeholder:text-deep/35 focus:border-tea focus:ring-4 focus:ring-sage/25";
