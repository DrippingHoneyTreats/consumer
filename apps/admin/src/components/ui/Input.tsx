"use client";

import { cn } from "@/lib/cn";
import type { InputHTMLAttributes, ReactNode } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
  leftAddon?: ReactNode;
};

/** Admin form fields — compact, closer to standard HTML inputs. */
export function Input({ label, hint, error, leftAddon, className, id, ...props }: Props) {
  const inputId = id || props.name;
  return (
    <label className="flex w-full flex-col gap-1 text-sm">
      {label ? <span className="font-medium text-deep">{label}</span> : null}
      <span
        className={cn(
          "flex min-h-10 items-center gap-2 rounded-lg border bg-white px-3 transition",
          error
            ? "border-danger"
            : "border-deep/20 focus-within:border-tea focus-within:ring-2 focus-within:ring-sage/30",
        )}
      >
        {leftAddon}
        <input
          id={inputId}
          className={cn(
            "w-full bg-transparent py-2 text-sm text-deep outline-none placeholder:text-deep/40",
            className,
          )}
          {...props}
        />
      </span>
      {error ? <span className="text-xs text-danger">{error}</span> : null}
      {!error && hint ? <span className="text-xs text-deep/55">{hint}</span> : null}
    </label>
  );
}

export const textareaClass =
  "w-full min-h-[88px] rounded-lg border border-deep/20 bg-white px-3 py-2 text-sm text-deep outline-none transition placeholder:text-deep/40 focus:border-tea focus:ring-2 focus:ring-sage/30";

export const selectClass =
  "min-h-10 w-full rounded-lg border border-deep/20 bg-white px-3 text-sm text-deep outline-none transition focus:border-tea focus:ring-2 focus:ring-sage/30";
