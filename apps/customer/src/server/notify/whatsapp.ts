import "server-only";
import { env } from "../env";
import { waDigits } from "../contact";

/**
 * WhatsApp Cloud API (Meta). Business-initiated messages MUST use an
 * approved template — free text only reaches people who messaged the
 * business number in the last 24 h. So every send here prefers a
 * template and only falls back to text when no template is configured
 * (handy for testing with your own number).
 */

type Component = Record<string, unknown>;

async function post(body: Record<string, unknown>): Promise<void> {
  const { token, phoneNumberId, apiVersion } = env.whatsapp;
  if (!token || !phoneNumberId) throw new Error("WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID not set");
  const res = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", ...body }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    throw new Error(`WhatsApp ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
}

function textParams(values: string[]) {
  // WhatsApp rejects params with newlines/tabs or 4+ spaces.
  return values.map((v) => ({ type: "text", text: v.replace(/\s+/g, " ").trim().slice(0, 900) || "-" }));
}

async function sendTemplate(to: string, name: string, components: Component[]) {
  await post({
    to: waDigits(to),
    type: "template",
    template: { name, language: { code: env.whatsapp.lang }, components },
  });
}

export async function sendWhatsappText(to: string, text: string) {
  await post({ to: waDigits(to), type: "text", text: { preview_url: true, body: text } });
}

/** Authentication template with a copy-code button. */
export async function sendWhatsappOtp(to: string, code: string) {
  const name = env.whatsapp.otpTemplate;
  if (!name) {
    await sendWhatsappText(to, `${code} is your Dripping Honey Treats code. It expires in 10 minutes.`);
    return;
  }
  await sendTemplate(to, name, [
    { type: "body", parameters: textParams([code]) },
    { type: "button", sub_type: "url", index: "0", parameters: textParams([code]) },
  ]);
}

/** Utility template (body): "Hi {{1}}, here's an update on your {{2}}: {{3}} …" — see docs/temp-backend.md */
export async function sendWhatsappUpdate(to: string, name: string, subject: string, message: string) {
  const tpl = env.whatsapp.updateTemplate;
  if (!tpl) {
    await sendWhatsappText(to, `Hi ${name}, update on ${subject}: ${message}`);
    return;
  }
  await sendTemplate(to, tpl, [{ type: "body", parameters: textParams([name, subject, message]) }]);
}

/** Utility template for staff (body): "Dripping Honey Treats alert: {{1}} …" — see docs/temp-backend.md */
export async function sendWhatsappAdmin(to: string, message: string) {
  const tpl = env.whatsapp.adminTemplate;
  if (!tpl) {
    await sendWhatsappText(to, message);
    return;
  }
  await sendTemplate(to, tpl, [{ type: "body", parameters: textParams([message]) }]);
}
