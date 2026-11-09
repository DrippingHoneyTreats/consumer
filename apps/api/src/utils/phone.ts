/** Normalize Nigerian-style phone input to E.164-ish +234… when possible. */
export function normalizePhone(raw: string): string {
  const trimmed = raw.trim().replace(/[\s-]/g, "");
  if (trimmed.startsWith("+")) return trimmed;
  if (trimmed.startsWith("234")) return `+${trimmed}`;
  if (trimmed.startsWith("0") && trimmed.length >= 10) {
    return `+234${trimmed.slice(1)}`;
  }
  return trimmed;
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function detectContactKind(contact: string): "email" | "phone" {
  return isEmail(contact) ? "email" : "phone";
}
