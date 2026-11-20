"use client";

import { useRef, type KeyboardEvent, type ClipboardEvent } from "react";
import { cn } from "@/lib/cn";

type Props = {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  /** Hide digits (PIN entry). */
  mask?: boolean;
  autoFocus?: boolean;
  label?: string;
  /** When every box is filled, move focus to the next field/button (default true). */
  focusNextOnComplete?: boolean;
};

const FOCUSABLE = 'input:not([disabled]):not([type="hidden"]), button:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href]';

export function OtpInput({
  value,
  onChange,
  length = 6,
  disabled,
  mask,
  autoFocus,
  label,
  focusNextOnComplete = true,
}: Props) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const groupRef = useRef<HTMLDivElement>(null);

  /** Focus the first focusable element after this group (e.g. "Confirm PIN", then the submit button). */
  function focusNext() {
    const group = groupRef.current;
    if (!focusNextOnComplete || !group) return;
    // Wait a frame so React has re-rendered (and enabled buttons that depend on this value).
    requestAnimationFrame(() => {
      const scope = group.closest("form") ?? document.body;
      const next = Array.from(scope.querySelectorAll<HTMLElement>(FOCUSABLE)).find(
        (el) => !group.contains(el) && group.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING,
      );
      if (next) next.focus();
      else refs.current[length - 1]?.blur();
    });
  }
  const digits = value.padEnd(length, " ").slice(0, length).split("");

  function setAt(index: number, char: string) {
    const next = digits.map((d, i) => (i === index ? char : d === " " ? "" : d)).join("");
    const clean = next.replace(/\s/g, "").slice(0, length);
    onChange(clean);
    if (char && clean.length === length) focusNext();
  }

  function onKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index]?.trim() && index > 0) {
      refs.current[index - 1]?.focus();
    }
  }

  function onPaste(e: ClipboardEvent) {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    onChange(text);
    if (text.length === length) focusNext();
    else refs.current[Math.min(text.length, length - 1)]?.focus();
  }

  return (
    <div ref={groupRef} className="flex justify-center gap-2" onPaste={onPaste} role="group" aria-label={label ?? (mask ? "PIN" : "Code")}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type={mask ? "password" : "text"}
          inputMode="numeric"
          aria-label={`${mask ? "PIN" : "Code"} digit ${i + 1}`}
          autoFocus={autoFocus && i === 0}
          autoComplete={mask ? "off" : i === 0 ? "one-time-code" : "off"}
          maxLength={length}
          disabled={disabled}
          value={digits[i]?.trim() ? digits[i] : ""}
          onChange={(e) => {
            let typed = e.target.value.replace(/\D/g, "");
            // Typing over a filled box: keep just the new digit.
            const existing = digits[i]?.trim();
            if (existing && typed.length === 2) typed = typed.replace(existing, "").slice(0, 1) || typed.slice(-1);
            // Several digits at once (iOS autofill, paste into one box): spread them out.
            if (typed.length > 1) {
              const current = value.slice(0, i);
              const next = (current + typed).slice(0, length);
              onChange(next);
              if (next.length === length) focusNext();
              else refs.current[next.length]?.focus();
              return;
            }
            setAt(i, typed);
            if (typed && i < length - 1) refs.current[i + 1]?.focus();
          }}
          onFocus={() => {
            // Always type into the first empty box, so digits can't land out of order.
            const firstEmpty = Math.min(value.length, length - 1);
            if (i > firstEmpty) refs.current[firstEmpty]?.focus();
          }}
          onKeyDown={(e) => onKeyDown(i, e)}
          className={cn(
            "h-14 w-12 rounded-2xl border bg-white text-center font-display text-2xl font-semibold text-deep shadow-[var(--shadow-card)] outline-none transition focus:-translate-y-0.5 focus:border-tea focus:ring-4 focus:ring-sage/25",
            digits[i]?.trim() ? "border-tea bg-sage-soft/50" : "border-deep/10",
            disabled && "opacity-50",
          )}
        />
      ))}
    </div>
  );
}
