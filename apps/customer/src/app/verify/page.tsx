"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api";
import type { User } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { OtpInput } from "@/components/auth/OtpInput";
import { toast } from "@/components/ui/Toast";
import { PageHeader } from "@/components/layout/PageHeader";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Mail, MessageSquareText, Phone, UserRound } from "lucide-react";

type Channel = "sms" | "email";

function VerifyForm() {
  const router = useRouter();
  const params = useSearchParams();
  const returnTo = params.get("returnTo") || "/";
  const setUser = useAuthStore((s) => s.setUser);

  const [step, setStep] = useState<"contact" | "otp">("contact");
  const [fullName, setFullName] = useState("");
  const [useEmail, setUseEmail] = useState(false);
  const [phone, setPhone] = useState("+234");
  const [email, setEmail] = useState("");
  const [otpChannel, setOtpChannel] = useState<Channel>("sms");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  const contact = useEmail ? email.trim() : phone.trim();

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const sendOtp = useCallback(
    async (channel?: Channel) => {
      setLoading(true);
      try {
        await apiClient.post("/auth/otp/send", {
          contact,
          channel: channel ?? (useEmail ? "email" : otpChannel),
          purpose: "register",
        });
        setStep("otp");
        setResendIn(60);
        toast("Code sent — check your messages.");
      } catch {
        toast("Could not send code. Try again.");
      } finally {
        setLoading(false);
      }
    },
    [contact, otpChannel, useEmail],
  );

  async function onSubmitContact(e: React.FormEvent) {
    e.preventDefault();
    if (fullName.trim().length < 2) {
      toast("Please enter your name.");
      return;
    }
    setLoading(true);
    try {
      await apiClient.post("/auth/register", {
        fullName: fullName.trim(),
        contact,
        channel: useEmail ? "email" : "sms",
        consent: true,
      });
      await sendOtp(useEmail ? "email" : "sms");
    } catch {
      // may already exist — still try OTP for login
      await sendOtp(useEmail ? "email" : "sms");
    } finally {
      setLoading(false);
    }
  }

  async function onVerify() {
    if (code.length < 6) return;
    setLoading(true);
    try {
      const user = await apiClient.post<User>("/auth/otp/verify", { contact, code });
      setUser(user);
      toast(`Welcome, ${user.fullName.split(/\s+/)[0]}!`);
      router.replace(returnTo);
    } catch {
      toast("Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-pad-no-tab min-h-dvh px-5 pb-8">
      <PageHeader
        eyebrow={step === "contact" ? "Welcome" : "Almost there"}
        title={step === "contact" ? "Let's get you in" : "Check your messages"}
        subtitle={
          step === "contact"
            ? "Just your name and number. No passwords, no wahala."
            : undefined
        }
        backHref={step === "contact" ? "/welcome" : undefined}
      />

      <AnimatePresence mode="wait">
        {step === "contact" ? (
          <motion.form
            key="contact"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25 }}
            onSubmit={onSubmitContact}
            className="mt-4 space-y-4"
          >
            <Input
              label="Full name"
              name="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Chioma Okafor"
              autoComplete="name"
              leftAddon={<UserRound size={18} className="text-tea" />}
            />
            <SegmentedTabs
              id="contact-mode"
              tabs={[
                { key: "phone", label: "WhatsApp / Phone" },
                { key: "email", label: "Email" },
              ]}
              value={useEmail ? "email" : "phone"}
              onChange={(k) => setUseEmail(k === "email")}
            />
            {useEmail ? (
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                leftAddon={<Mail size={18} className="text-tea" />}
              />
            ) : (
              <Input
                label="Phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+234 801 234 5678"
                autoComplete="tel"
                leftAddon={<Phone size={18} className="text-tea" />}
              />
            )}
            <p className="pl-1 text-xs text-deep/50">
              By continuing you agree to our Terms and Privacy Policy.
            </p>
            <Button type="submit" variant="dark" fullWidth loading={loading} rightIcon={<ArrowRight size={18} />}>
              Send code
            </Button>
          </motion.form>
        ) : (
          <motion.div
            key="otp"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25 }}
            className="mt-4 space-y-6 text-center"
          >
            <motion.div
              initial={{ scale: 0.6, rotate: -15 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 14 }}
              className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-gradient-to-br from-blush-soft to-blush text-deep shadow-[var(--shadow-card)]"
            >
              <MessageSquareText size={32} />
            </motion.div>
            <p className="text-sm text-deep/70">
              Enter the 6-digit code we sent to <strong className="text-deep">{contact}</strong>
            </p>
            <OtpInput value={code} onChange={setCode} disabled={loading} />
            <Button fullWidth variant="dark" loading={loading} disabled={code.length < 6} onClick={() => void onVerify()}>
              Verify & continue
            </Button>
            <div className="flex items-center justify-center gap-4 text-sm">
              <button
                type="button"
                disabled={resendIn > 0 || loading}
                className="font-semibold text-tea disabled:opacity-40"
                onClick={() => void sendOtp()}
              >
                {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
              </button>
              {!useEmail ? (
                <>
                  <span className="h-4 w-px bg-deep/15" />
                  <button
                    type="button"
                    disabled={loading}
                    className="font-semibold text-tea disabled:opacity-40"
                    onClick={() => {
                      setOtpChannel("sms");
                      void sendOtp("sms");
                    }}
                  >
                    Send via SMS
                  </button>
                </>
              ) : null}
            </div>
            <button type="button" className="block w-full text-sm text-deep/55 underline-offset-4 hover:underline" onClick={() => setStep("contact")}>
              Change number/email
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="page-pad skeleton h-40 m-4" />}>
      <VerifyForm />
    </Suspense>
  );
}
