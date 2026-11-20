/** Normalise Nigerian-style phone input to +234… (E.164). */
export function normalizePhone(raw: string): string {
  const t = raw.trim().replace(/[\s()-]/g, "");
  if (t.startsWith("+")) return `+${t.slice(1).replace(/\D/g, "")}`;
  if (t.startsWith("234")) return `+${t.replace(/\D/g, "")}`;
  if (t.startsWith("0") && t.length >= 10) return `+234${t.slice(1).replace(/\D/g, "")}`;
  return `+${t.replace(/\D/g, "")}`;
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isPhone(value: string): boolean {
  const digits = normalizePhone(value).replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

/** Canonical form used as the lookup key: lower-case email or +234… phone. */
export function normalizeContact(raw: string): { kind: "email" | "phone"; value: string } {
  const v = raw.trim();
  if (isEmail(v)) return { kind: "email", value: v.toLowerCase() };
  return { kind: "phone", value: normalizePhone(v) };
}

/** WhatsApp Cloud API wants digits only, no plus. */
export function waDigits(phone: string): string {
  return normalizePhone(phone).replace(/\D/g, "");
}

/**
 * Nigerian mobile number (+234 then 70x/71x/80x/81x/90x/91x…). Format check
 * only: there is no free, legitimate way to confirm a number exists or is on WhatsApp.
 */
export function isNigerianMobile(phone: string): boolean {
  return /^\+234(70|71|80|81|90|91)\d{8}$/.test(normalizePhone(phone));
}
