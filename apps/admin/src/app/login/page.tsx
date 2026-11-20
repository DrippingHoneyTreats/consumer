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

/** Staff sign-in: email → 6-digit code (email + WhatsApp if on file). */
export default function AdminLoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const errMsg = (e: unknown, fallback: string) => (e instanceof ApiRequestError ? e.message : fallback);

  const sendCode = async () => {
    const contact = email.trim().toLowerCase();
    if (!contact.includes("@")) {
      toast.error("Enter your staff email");
      return;
    }
    setLoading(true);
    try {
      await apiClient.post("/auth/otp/send", { contact, channel: "email", audience: "admin" });
      setStep("code");
      toast.success("Code sent — check your email");
    } catch (e) {
      toast.error(errMsg(e, "Could not send code"));
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    if (code.trim().length < 6) return;
    setLoading(true);
    try {
      const user = await apiClient.post<User>("/auth/otp/verify", {
        contact: email.trim().toLowerCase(),
        code: code.trim(),
        audience: "admin",
      });
      setUser(user);
      router.replace("/orders");
    } catch (e) {
      toast.error(errMsg(e, "Invalid code"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-3xl border border-deep/10 bg-white p-8 shadow-[var(--shadow-soft)]">
      <div className="mb-6 overflow-hidden rounded-2xl bg-deep px-4 py-5">
        <Image
          src={LOGO}
          alt="Dripping Honey Treats"
          width={220}
          height={88}
          unoptimized
          priority
          className="mx-auto h-14 w-auto object-contain"
        />
      </div>
      <p className="font-display text-2xl font-semibold text-deep">Admin dashboard</p>
      <p className="mt-1 text-sm text-deep/60">
        {step === "email" ? "Sign in with your staff email." : `Enter the 6-digit code sent to ${email.trim()}.`}
      </p>

      <form
        className="mt-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void (step === "email" ? sendCode() : verify());
        }}
      >
        {step === "email" ? (
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@drippinghoneytreats.com"
          />
        ) : (
          <Input
            label="Code"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="123456"
          />
        )}
        <Button type="submit" fullWidth loading={loading} disabled={step === "code" && code.length < 6}>
          {step === "email" ? "Send code" : "Sign in"}
        </Button>
        {step === "code" ? (
          <button
            type="button"
            className="w-full text-center text-sm font-semibold text-deep/50"
            onClick={() => {
              setCode("");
              setStep("email");
            }}
          >
            Use a different email
          </button>
        ) : null}
      </form>
    </div>
  );
}
