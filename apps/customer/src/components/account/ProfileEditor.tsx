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

  async function saveDetails() {
    const name = fullName.trim();
    if (name.length < 2) return void toast.error("Enter your name (at least 2 characters).");
    setSaving(true);
    try {
      const updated = await apiClient.patch<User>("/me", {
        fullName: name,
        phone: phone.trim() || undefined,
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
      toast.error(errMsg(e, "Couldn't save your profile. Try again."));
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
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Your name"
          autoComplete="name"
          leftAddon={<UserRound size={18} className="text-tea" />}
        />
        <Input
          label="WhatsApp number"
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="0803 123 4567"
          autoComplete="tel"
          hint="Used to sign in with your PIN and for order updates."
          leftAddon={<Phone size={18} className="text-tea" />}
        />
        <Input
          label="Email (optional)"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          hint="For receipts and to reset your PIN if you forget it."
          leftAddon={<Mail size={18} className="text-tea" />}
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="dark" loading={saving} onClick={() => void saveDetails()}>
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

  async function send() {
    setBusy(true);
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
    }
  }

  async function verify(value = code) {
    if (value.length !== 6) return;
    setBusy(true);
    try {
      const updated = await apiClient.post<User>("/me/email/verify", { code: value });
      setUser(updated);
      toast.success("Email verified.");
    } catch (e) {
      toast.error(errMsg(e, "That code didn't work. Try again."));
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
              if (v.length === 6) void verify(v);
            }}
            disabled={busy}
            autoFocus
          />
          <VerifyingInline show={busy} text="Verifying your code…" />
          <button type="button" onClick={() => void send()} disabled={busy} className="text-xs font-semibold text-tea">
            Send a new code
          </button>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <p className="flex-1 text-xs text-deep/60">We&apos;ll email you a code to confirm it&apos;s yours.</p>
          <Button variant="dark" className="h-10 px-4 text-sm" loading={busy} onClick={() => void send()}>
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
  const [busy, setBusy] = useState(false);

  function reset() {
    setCurrentPin("");
    setPin("");
    setConfirm("");
  }

  async function save() {
    if (hasPin && currentPin.length !== 4) return void toast.error("Enter your current PIN.");
    if (pin.length !== 4) return void toast.error("Choose a 4-digit PIN.");
    if (pin !== confirm) return void toast.error("The PINs don't match.");
    setBusy(true);
    try {
      const updated = await apiClient.post<User>("/me/pin", { pin, currentPin: hasPin ? currentPin : undefined });
      setUser(updated);
      toast.success(hasPin ? "PIN changed." : "PIN set. You can now sign in with your number and PIN.");
      reset();
      setOpen(false);
    } catch (e) {
      toast.error(errMsg(e, "Couldn't save your PIN. Try again."));
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
          {hasPin ? <PinField label="Current PIN" value={currentPin} onChange={setCurrentPin} /> : null}
          <PinField label="New PIN" value={pin} onChange={setPin} />
          <PinField label="Confirm new PIN" value={confirm} onChange={setConfirm} />
          <VerifyingInline show={busy} text="Saving your PIN…" />
          <div className="flex flex-wrap gap-2">
            <Button variant="dark" loading={busy} onClick={() => void save()}>
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

function PinField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <p className="mb-2 text-center text-xs font-semibold text-deep/60">{label}</p>
      <OtpInput value={value} onChange={onChange} length={4} mask label={label} />
    </div>
  );
}
