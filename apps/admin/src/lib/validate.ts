"use client";

import { useCallback, useState } from "react";

/** Admin form validation: per-field messages, same pattern as the customer app. */

export function checkEmail(v: string, { required = true } = {}): string | null {
  const t = v.trim();
  if (!t) return required ? "Please enter an email address." : null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t)) return "That email doesn't look right. Check for typos.";
  return null;
}

export function checkRequired(v: string, message: string): string | null {
  return v.trim() ? null : message;
}

/** Accepts full links (https://…) and in-app paths (/pastries/cakes). */
export function checkLink(v: string): string | null {
  const t = v.trim();
  if (!t) return null;
  if (t.startsWith("/")) return null;
  try {
    const u = new URL(t);
    return u.protocol === "http:" || u.protocol === "https:" ? null : "Links must start with https:// or /";
  } catch {
    return "Enter a full link (https://…) or a page path like /pastries.";
  }
}

export type FieldErrors = Record<string, string | null | undefined>;

/**
 * Per-field error state for a form.
 *
 *   const f = useFieldErrors();
 *   if (!f.validate({ name: checkName(name), phone: checkPhone(phone) })) return;
 *   <Input error={f.errors.name ?? undefined} onChange={…; f.clear("name")} />
 *
 * `validate` shows every message at once, then scrolls to and focuses the
 * first invalid field. Returns true when everything is valid.
 */
export function useFieldErrors() {
  const [errors, setErrors] = useState<FieldErrors>({});

  const validate = useCallback((next: FieldErrors) => {
    const clean: FieldErrors = {};
    for (const [k, v] of Object.entries(next)) if (v) clean[k] = v;
    setErrors(clean);
    const ok = Object.keys(clean).length === 0;
    if (!ok) focusFirstInvalid();
    return ok;
  }, []);

  const clear = useCallback((key: string) => {
    setErrors((e) => (e[key] ? { ...e, [key]: null } : e));
  }, []);

  /** Show a single message (e.g. from the server) on one field. */
  const setError = useCallback((key: string, message: string) => {
    setErrors((e) => ({ ...e, [key]: message }));
    focusFirstInvalid();
  }, []);

  const reset = useCallback(() => setErrors({}), []);

  const first = Object.values(errors).find(Boolean) ?? null;

  return { errors, validate, clear, setError, reset, first };
}

function focusFirstInvalid() {
  // After React paints the error states.
  requestAnimationFrame(() => {
    const el = document.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalid="true"]');
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    const input = el.matches("input, textarea, select") ? el : el.querySelector<HTMLElement>("input, textarea, select");
    input?.focus({ preventScroll: true });
  });
}
