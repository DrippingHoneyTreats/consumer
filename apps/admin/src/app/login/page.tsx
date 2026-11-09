"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";
import { isStaffRole } from "@/lib/admin-nav";
import { LOGO } from "@/lib/placeholders";
import type { User } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";

export default function AdminLoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const refreshMe = useAuthStore((s) => s.refreshMe);
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const sendCode = async () => {
    const contact = email.trim().toLowerCase();
    if (!contact.includes("@")) {
      toast("Enter a valid staff email");
      return;
    }
    setLoading(true);
    try {
      await apiClient.post("/auth/otp/send", { contact, channel: "email", purpose: "login" });
      setStep("code");
      toast("Check your inbox for the code");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not send code");
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    setLoading(true);
    try {
      const user = await apiClient.post<User>("/auth/otp/verify", {
        contact: email.trim().toLowerCase(),
        code: code.trim(),
      });
      setUser(user);
      const me = (await refreshMe()) ?? user;
      if (!isStaffRole(me.role)) {
        toast("This account is not authorised for admin");
        return;
      }
      router.replace("/orders");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Invalid code");
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
      <p className="font-display text-2xl font-semibold text-deep">Staff sign in</p>
      <p className="mt-1 text-sm text-deep/60">Email OTP for kitchen and ops.</p>

      <div className="mt-6 space-y-4">
        {step === "email" ? (
          <>
            <Input
              label="Work email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button fullWidth loading={loading} onClick={() => void sendCode()}>
              Send code
            </Button>
          </>
        ) : (
          <>
            <Input
              label="Verification code"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <Button fullWidth loading={loading} onClick={() => void verify()}>
              Sign in
            </Button>
            <Button variant="ghost" fullWidth onClick={() => setStep("email")}>
              Use a different email
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
