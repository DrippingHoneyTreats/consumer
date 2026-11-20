"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { BadgeCheck, KeyRound, Mail, Phone, UserRound } from "lucide-react";
import { ApiRequestError, apiClient } from "@/lib/api";
import type { User } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { OtpInput } from "@/components/auth/OtpInput";
import { toast } from "@/components/ui/Toast";
import { checkCode, checkEmail, checkName, checkPhone, checkPin, checkPinConfirm, normalizeNgPhone, useFieldErrors } from "@/lib/validate";
import { VerifyingInline } from "@/components/ui/Verifying";

const errMsg = (e: unknown, fallback: string) => (e instanceof ApiRequestError ? e.message : fallback);

/** Show a +234 number as 0803 123 4567 for editing. */
function localPhone(phone?: string | null) {
  if (!phone) return "";
  const d = phone.replace(/\D/g, "");
  return d.startsWith("234") ? `0${d.slice(3)}` : phone;
}

/**
 * Account settings: name, WhatsApp number, email (with verification) and
 * the sign-in PIN. Everything saved here also shows on the admin Users page.
 */
export function ProfileEditor({ user, onDone }: { user: User; onDone: () => void }) {
  const setUser = useAuthStore((s) => s.setUser);
  const [fullName, setFullName] = useState(user.fullName ?? "");
  const [phone, setPhone] = useState(localPhone(user.phone));
  const [email, setEmail] = useState(user.email ?? "");
  const [saving, setSaving] = useState(false);
  const f = useFieldErrors();

  async function saveDetails() {
    const name = fullName.trim();
    const ok = f.validate({
      name: checkName(fullName),
      // A number is needed to sign in with a PIN, so keep it once it's set.
      phone: checkPhone(phone, { required: Boolean(user.phone || user.hasPin) }),
      email: checkEmail(email, { required: false }),
    });
    if (!ok) {
      toast.error("Please fix the highlighted fields.");
      return;
    }
    setSaving(true);
    try {
      const updated = await apiClient.patch<User>("/me", {
        fullName: name,
        phone: phone.replace(/\D/g, "") ? normalizeNgPhone(phone) : undefined,
        email: email.trim() || undefined,
      });
      setUser(updated);
      toast.success("Profile updated.");
      if (updated.email && !updated.emailVerified && updated.email !== user.email) {
        toast.info("Verify your new email below so we can send receipts and PIN resets.");
      } else {
        onDone();
      }
    } catch (e) {
      const msg = errMsg(e, "Couldn't save your profile. Try again.");
      toast.error(msg);
      // Put the server's message under the field it's about.
      if (/email/i.test(msg)) f.setError("email", msg);
      else if (/phone|number|whatsapp/i.test(msg)) f.setError("phone", msg);
      else if (/name/i.test(msg)) f.setError("name", msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[24px] bg-[#fbf9f6] p-4 ring-1 ring-deep/5 md:p-6"
    >
      <h2 className="font-display text-2xl text-deep">Account settings</h2>
      <p className="mt-1 text-sm text-deep/50">Keep your details up to date so we can reach you about orders.</p>

      <div className="mt-5 space-y-4">
        <Input
          label="Full name"
          value={fullName}
          onChange={(e) => {
            setFullName(e.target.value);
            f.clear("name");
          }}
          error={f.errors.name ?? undefined}
          placeholder="Your name"
          autoComplete="name"
          leftAddon={<UserRound size={18} className="text-tea" />}
        />
        <Input
          label="WhatsApp number"
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            f.clear("phone");
          }}
          error={f.errors.phone ?? undefined}
          placeholder="0803 123 4567"
          autoComplete="tel"
          hint="Used to sign in with your PIN and for order updates."
          leftAddon={<Phone size={18} className="text-tea" />}
        />
        <Input
          label="Email (optional)"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            f.clear("email");
          }}
          error={f.errors.email ?? undefined}
          placeholder="you@example.com"
          autoComplete="email"
          hint="For receipts and to reset your PIN if you forget it."
          leftAddon={<Mail size={18} className="text-tea" />}
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="dark" loading={saving} onClick={() => saveDetails()}>
            Save changes
          </Button>
          <Button variant="ghost" disabled={saving} onClick={onDone}>
            Close
          </Button>
        </div>
      </div>

      {user.email && !user.emailVerified ? <VerifyEmail key={user.email} email={user.email} /> : null}
      <PinSettings hasPin={Boolean(user.hasPin)} />
    </motion.section>
  );
}

function VerifyEmail({ email }: { email: string }) {
  const setUser = useAuthStore((s) => s.setUser);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const [sending, setSending] = useState(false);

  async function send() {
    setBusy(true);
    setSending(true);
    try {
      const res = await apiClient.post<{ sentTo?: string; alreadyVerified?: boolean }>("/me/email/send-code", {});
      if (res.alreadyVerified) {
        void useAuthStore.getState().refreshMe();
        return;
      }
      setSentTo(res.sentTo ?? email);
      toast.success(`Code sent to ${res.sentTo ?? email}.`);
    } catch (e) {
      toast.error(errMsg(e, "We couldn't send the code. Try again."));
    } finally {
      setBusy(false);
      setSending(false);
    }
  }

  const [codeError, setCodeError] = useState<string | null>(null);

  async function verify(value = code) {
    const problem = checkCode(value);
    if (problem) {
      setCodeError(problem);
      return;
    }
    setBusy(true);
    try {
      const updated = await apiClient.post<User>("/me/email/verify", { code: value });
      setUser(updated);
      toast.success("Email verified.");
    } catch (e) {
      const msg = errMsg(e, "That code didn't work. Try again.");
      toast.error(msg);
      setCodeError(msg);
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 rounded-[22px] border border-honey/60 bg-honey-soft p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-deep">
        <Mail size={16} className="text-tea" /> Verify {email}
      </p>
      {sentTo ? (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-deep/60">Enter the 6-digit code we emailed to {sentTo}.</p>
          <OtpInput
            value={code}
            onChange={(v) => {
              setCode(v);
              setCodeError(null);
              if (v.length === 6) void verify(v);
            }}
            error={codeError}
            disabled={busy}
            autoFocus
          />
          <VerifyingInline show={busy} text={sending ? "Sending a new code…" : "Verifying your code…"} />
          <button type="button" onClick={() => void send()} disabled={busy} className="text-xs font-semibold text-tea disabled:opacity-60">
            {sending ? "Sending…" : "Send a new code"}
          </button>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <p className="flex-1 text-xs text-deep/60">We&apos;ll email you a code to confirm it&apos;s yours.</p>
          <Button variant="dark" className="h-10 px-4 text-sm" loading={busy} onClick={() => send()}>
            Send code
          </Button>
        </div>
      )}
    </div>
  );
}

function PinSettings({ hasPin }: { hasPin: boolean }) {
  const setUser = useAuthStore((s) => s.setUser);
  const [open, setOpen] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const f = useFieldErrors();
  const [busy, setBusy] = useState(false);

  function reset() {
    setCurrentPin("");
    setPin("");
    setConfirm("");
  }

  async function save() {
    const ok = f.validate({
      currentPin: hasPin ? (currentPin.length === 4 ? null : "Enter your current 4-digit PIN.") : null,
      pin: checkPin(pin, "new PIN"),
      confirm: checkPinConfirm(pin, confirm),
    });
    if (!ok) {
      toast.error("Please fix the highlighted fields.");
      return;
    }
    setBusy(true);
    try {
      const updated = await apiClient.post<User>("/me/pin", { pin, currentPin: hasPin ? currentPin : undefined });
      setUser(updated);
      toast.success(hasPin ? "PIN changed." : "PIN set. You can now sign in with your number and PIN.");
      reset();
      setOpen(false);
    } catch (e) {
      const msg = errMsg(e, "Couldn't save your PIN. Try again.");
      toast.error(msg);
      f.setError(/current/i.test(msg) ? "currentPin" : "pin", msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 rounded-[22px] bg-[#f6f4f1] p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-tea shadow-sm">
          <KeyRound size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-deep">
            Sign-in PIN {hasPin ? <BadgeCheck size={15} className="text-tea" /> : null}
          </span>
          <span className="block text-xs text-deep/55">
            {hasPin ? "Use it with your WhatsApp number to sign in." : "Set a 4-digit PIN to sign in with your number."}
          </span>
        </span>
        {!open ? (
          <Button variant="tertiary" className="h-10 px-4 text-sm" onClick={() => setOpen(true)}>
            {hasPin ? "Change PIN" : "Set PIN"}
          </Button>
        ) : null}
      </div>
      {open ? (
        <div className="mt-4 space-y-4">
          {hasPin ? (
            <PinField label="Current PIN" value={currentPin} error={f.errors.currentPin} onChange={(v) => { setCurrentPin(v); f.clear("currentPin"); }} />
          ) : null}
          <PinField label="New PIN" value={pin} error={f.errors.pin} onChange={(v) => { setPin(v); f.clear("pin"); }} />
          <PinField label="Confirm new PIN" value={confirm} error={f.errors.confirm} onChange={(v) => { setConfirm(v); f.clear("confirm"); }} />
          <VerifyingInline show={busy} text="Saving your PIN…" />
          <div className="flex flex-wrap gap-2">
            <Button variant="dark" loading={busy} onClick={() => save()}>
              Save PIN
            </Button>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => {
                reset();
                setOpen(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PinField({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | null;
}) {
  return (
    <div>
      <p className="mb-2 text-center text-xs font-semibold text-deep/60">{label}</p>
      <OtpInput value={value} onChange={onChange} length={4} mask label={label} error={error} />
    </div>
  );
}
