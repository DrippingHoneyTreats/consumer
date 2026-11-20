"use client";

import { useCallback, useState } from "react";

/**
 * Shared form validation: the same rules (and wording) on every form,
 * matching what the server enforces. Each check returns an error message,
 * or null when the value is fine.
 */

export function checkName(v: string): string | null {
  const t = v.trim();
  if (!t) return "Please enter your name.";
  if (t.length < 2) return "Your name needs at least 2 letters.";
  if (t.length > 80) return "That name is a bit long. Please shorten it.";
  return null;
}

/** "+2348031234567" from 0803…, 234803…, +234 803… etc. */
export function normalizeNgPhone(v: string): string {
  const d = v.replace(/\D/g, "");
  if (d.startsWith("234")) return `+${d}`;
  if (d.startsWith("0")) return `+234${d.slice(1)}`;
  return `+234${d}`;
}

export function checkPhone(v: string, { required = true } = {}): string | null {
  const digits = v.replace(/\D/g, "");
  if (!digits || digits === "234") return required ? "Please enter your WhatsApp number." : null;
  if (!/^\+234(70|71|80|81|90|91)\d{8}$/.test(normalizeNgPhone(v))) {
    return "Enter a valid Nigerian mobile number, e.g. 0803 123 4567.";
  }
  return null;
}

export function checkEmail(v: string, { required = true } = {}): string | null {
  const t = v.trim();
  if (!t) return required ? "Please enter your email address." : null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t)) return "That email doesn't look right. Check for typos.";
  return null;
}

export function checkPin(v: string, label = "PIN"): string | null {
  if (!v) return `Please choose a 4-digit ${label}.`;
  if (!/^\d{4}$/.test(v)) return `Your ${label} must be exactly 4 digits.`;
  if (/^(\d)\1{3}$/.test(v) || ["1234", "4321", "0123", "9876"].includes(v)) {
    return "That PIN is too easy to guess. Please choose another one.";
  }
  return null;
}

export function checkPinConfirm(pin: string, confirm: string): string | null {
  if (!confirm) return "Please type your PIN again to confirm it.";
  if (confirm.length < 4) return "Enter all 4 digits.";
  if (confirm !== pin) return "The PINs don't match. Please re-type them.";
  return null;
}

export function checkCode(v: string, length = 6): string | null {
  if (!v) return `Enter the ${length}-digit code.`;
  if (v.length < length) return `Enter all ${length} digits.`;
  return null;
}

export function checkRequired(v: string, message: string): string | null {
  return v.trim() ? null : message;
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
