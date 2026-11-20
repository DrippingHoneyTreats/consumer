"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { User } from "@/lib/types";
import { ApiRequestError, apiClient } from "@/lib/api";
import { LOGO } from "@/lib/placeholders";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";
import { checkEmail, useFieldErrors } from "@/lib/validate";

/** Staff sign-in: email → 6-digit code (email + WhatsApp if on file). */
export default function AdminLoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const errMsg = (e: unknown, fallback: string) => (e instanceof ApiRequestError ? e.message : fallback);

  const f = useFieldErrors();

  const sendCode = async () => {
    const contact = email.trim().toLowerCase();
    if (!f.validate({ email: checkEmail(contact) })) return;
    setLoading(true);
    try {
      await apiClient.post("/auth/otp/send", { contact, channel: "email", audience: "admin" });
      setStep("code");
      toast.success("Code sent — check your email");
    } catch (e) {
      const msg = errMsg(e, "Could not send code");
      toast.error(msg);
      f.setError("email", msg);
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    if (!f.validate({ code: code.trim().length === 6 ? null : "Enter the 6-digit code from your email." })) return;
    setLoading(true);
    try {
      const user = await apiClient.post<User>("/auth/otp/verify", {
        contact: email.trim().toLowerCase(),
        code: code.trim(),
        audience: "admin",
      });
      setUser(user);
      router.replace("/");
    } catch (e) {
      const msg = errMsg(e, "Invalid code");
      toast.error(msg);
      f.setError("code", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid w-full max-w-5xl overflow-hidden rounded-[32px] border border-deep/10 bg-white shadow-[var(--shadow-soft)] md:grid-cols-[1fr_1.05fr]">
      {/* Brand panel (desktop) */}
      <div className="relative hidden flex-col justify-between bg-[linear-gradient(150deg,#fbe3e6_0%,#f7f1ea_55%,#e4ece2_100%)] p-10 md:flex">
        <span className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-blush/40 blur-3xl" aria-hidden />
        <span className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-sage/40 blur-3xl" aria-hidden />
        <Image src={LOGO} alt="Dripping Honey Treats" width={180} height={72} unoptimized priority className="relative h-16 w-auto self-start object-contain" />
        <div className="relative">
          <p className="font-display text-[32px] font-semibold leading-tight text-deep">Run the kitchen from one place.</p>
          <ul className="mt-6 space-y-3 text-sm text-deep/70">
            {["Live orders and delivery status", "Products, prices and photos", "Customers, events and unfinished orders"].map((t) => (
              <li key={t} className="flex items-center gap-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-tea" />
                {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-deep/45">Staff only. Ask a super admin to invite you.</p>
      </div>

      {/* Form */}
      <div className="p-7 sm:p-10">
        <Image src={LOGO} alt="Dripping Honey Treats" width={140} height={56} unoptimized priority className="mb-8 h-14 w-auto object-contain md:hidden" />
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-tea">
          Step {step === "email" ? "1" : "2"} of 2
        </p>
        <h1 className="mt-2 font-display text-[28px] font-semibold leading-tight text-deep">
          {step === "email" ? "Sign in to admin" : "Check your email"}
        </h1>
        <p className="mt-2 text-sm text-deep/60">
          {step === "email" ? "We'll email you a 6-digit code. No password needed." : `Enter the 6-digit code we sent to ${email.trim()}.`}
        </p>

        <form
          className="mt-8 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void (step === "email" ? sendCode() : verify());
          }}
        >
          {step === "email" ? (
            <Input
              label="Work email"
              type="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                f.clear("email");
              }}
              error={f.errors.email ?? undefined}
              placeholder="you@drippinghoneytreats.com"
            />
          ) : (
            <Input
              label="6-digit code"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              maxLength={6}
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, ""));
                f.clear("code");
              }}
              error={f.errors.code ?? undefined}
              placeholder="123456"
              className="tracking-[0.4em]"
            />
          )}
          <Button type="submit" variant="dark" fullWidth loading={loading}>
            {step === "email" ? "Email me a code" : "Sign in"}
          </Button>
          {step === "code" ? (
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                className="font-semibold text-tea hover:text-deep"
                onClick={() => {
                  setCode("");
                  setStep("email");
                }}
              >
                Use a different email
              </button>
              <button type="button" className="font-semibold text-deep/50 hover:text-deep" onClick={() => void sendCode()} disabled={loading}>
                Resend code
              </button>
            </div>
          ) : null}
        </form>
      </div>
    </div>
  );
}
