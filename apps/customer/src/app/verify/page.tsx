"use client";

import { Suspense, useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Mail,
  MessageSquareText,
  PartyPopper,
  Phone,
  Sparkles,
  UserRound,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import type { User } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { OtpInput } from "@/components/auth/OtpInput";
import { toast } from "@/components/ui/Toast";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { PageSkeleton } from "@/components/ui/ColumnLoader";
import { cn } from "@/lib/cn";

type Channel = "sms" | "email";
type Step = "name" | "method" | "contact" | "otp";

const stepsOrder: Step[] = ["name", "method", "contact", "otp"];

const stepNav: {
  key: Step;
  title: string;
  blurb: string;
  icon: typeof UserRound;
}[] = [
  { key: "name", title: "Your details", blurb: "Tell us what to call you", icon: UserRound },
  { key: "method", title: "How we reach you", blurb: "Phone or email for your code", icon: Phone },
  { key: "contact", title: "Your contact", blurb: "Where should we send it?", icon: Mail },
  { key: "otp", title: "Verify code", blurb: "Enter the 6-digit treat code", icon: MessageSquareText },
];

const stepCopy: Record<Step, { title: string; subtitle: (ctx: { firstName: string; contact: string }) => string }> = {
  name: {
    title: "What's your name, though?",
    subtitle: () => "Your first name is enough — we'll keep it sweet.",
  },
  method: {
    title: "How do we reach you?",
    subtitle: ({ firstName }) => `Nice to meet you, ${firstName}. Pick WhatsApp/phone or email.`,
  },
  contact: {
    title: "Almost there",
    subtitle: () => "We'll send a one-time code. No passwords, no wahala.",
  },
  otp: {
    title: "Verify your code",
    subtitle: ({ contact }) => `We sent a code to ${contact}`,
  },
};

function StepRail({
  step,
  orientation = "vertical",
}: {
  step: Step;
  orientation?: "vertical" | "horizontal";
}) {
  const idx = stepsOrder.indexOf(step);
  if (orientation === "horizontal") {
    return (
      <ol className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {stepNav.map((s, i) => {
          const done = i < idx;
          const active = i === idx;
          const Icon = s.icon;
          return (
            <li
              key={s.key}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold",
                active && "bg-deep text-white shadow-[var(--shadow-card)]",
                done && "bg-sage-soft text-tea",
                !active && !done && "bg-white/70 text-deep/40",
              )}
            >
              {done ? <Check size={14} /> : <Icon size={14} />}
              <span>{s.title}</span>
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <ol className="relative space-y-0">
      {stepNav.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        const Icon = s.icon;
        const last = i === stepNav.length - 1;
        return (
          <li key={s.key} className="relative flex gap-3 pb-8 last:pb-0">
            {!last ? (
              <span
                className={cn(
                  "absolute left-[17px] top-10 h-[calc(100%-28px)] w-0.5",
                  done || active ? "bg-deep/40" : "bg-deep/10",
                )}
                aria-hidden
              />
            ) : null}
            <span
              className={cn(
                "relative z-[1] flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] border-2 transition",
                active && "border-deep bg-deep text-white shadow-[var(--shadow-card)]",
                done && "border-tea bg-sage-soft text-tea",
                !active && !done && "border-deep/15 bg-white text-deep/35",
              )}
            >
              {done ? <Check size={16} strokeWidth={2.4} /> : <Icon size={16} strokeWidth={1.8} />}
            </span>
            <span className="min-w-0 pt-0.5">
              <span
                className={cn(
                  "block text-sm font-semibold",
                  active ? "text-deep" : done ? "text-tea" : "text-deep/40",
                )}
              >
                {s.title}
              </span>
              <span className={cn("mt-0.5 block text-xs leading-snug", active ? "text-deep/55" : "text-deep/35")}>
                {s.blurb}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function BottomBars({ step }: { step: Step }) {
  const idx = stepsOrder.indexOf(step);
  return (
    <div className="mt-8 flex justify-center gap-2" aria-hidden>
      {stepsOrder.map((s, i) => (
        <span
          key={s}
          className={cn(
            "h-1.5 w-10 rounded-full transition-colors md:w-12",
            i <= idx ? "bg-deep" : "bg-deep/10",
          )}
        />
      ))}
    </div>
  );
}

function Shell({
  step,
  children,
  onBack,
}: {
  step: Step;
  children: ReactNode;
  onBack: () => void;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-[#f7f3ee] md:flex-row">
      {/* Sidebar stepper */}
      <aside className="relative overflow-hidden border-b border-deep/5 bg-gradient-to-br from-[#fff8f3] via-cream to-blush-soft px-5 pb-5 pt-[calc(16px+var(--safe-top))] md:w-[340px] md:shrink-0 md:border-b-0 md:border-r md:px-7 md:pb-8 md:pt-8 lg:w-[380px]">
        <div className="pointer-events-none absolute -bottom-16 -right-10 h-48 w-48 rounded-full bg-blush/30 blur-2xl" aria-hidden />
        <div className="pointer-events-none absolute -left-10 top-24 h-32 w-32 rounded-full bg-sage/20 blur-2xl" aria-hidden />

        <div className="relative mb-5 flex items-center justify-between gap-3 md:mb-10">
          <BrandLogo size="sm" href="/" />
          <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-tea shadow-sm">
            <Sparkles size={11} /> Join DHT
          </span>
        </div>

        <div className="relative mb-4 md:hidden">
          <StepRail step={step} orientation="horizontal" />
        </div>

        <div className="relative hidden md:block">
          <p className="mb-5 font-display text-2xl text-deep">Sign in, sweet & simple</p>
          <StepRail step={step} orientation="vertical" />
        </div>

        <div className="relative mt-auto hidden items-center justify-between gap-3 pt-10 text-sm md:flex">
          <Link href="/" className="inline-flex items-center gap-1.5 font-semibold text-tea">
            <ArrowLeft size={14} /> Back to home
          </Link>
          <Link href="/" className="font-semibold text-deep/50">
            Browse as guest
          </Link>
        </div>
      </aside>

      {/* Main step content */}
      <main className="relative flex flex-1 flex-col px-5 pb-[calc(28px+var(--safe-bottom))] pt-6 md:px-10 md:pt-12 lg:px-16">
        <button
          type="button"
          onClick={onBack}
          className="mb-6 inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-tea md:mb-8"
        >
          <ArrowLeft size={16} /> Back
        </button>

        <div className="mx-auto w-full max-w-md flex-1">
          {children}
          <BottomBars step={step} />
        </div>

        <div className="mt-8 flex items-center justify-between gap-3 text-sm md:hidden">
          <Link href="/" className="inline-flex items-center gap-1.5 font-semibold text-tea">
            <ArrowLeft size={14} /> Home
          </Link>
          <Link href="/" className="font-semibold text-deep/50">
            Browse as guest
          </Link>
        </div>
      </main>
    </div>
  );
}

function VerifyForm() {
  const router = useRouter();
  const params = useSearchParams();
  const returnTo = params.get("returnTo") || "/";
  const setUser = useAuthStore((s) => s.setUser);

  const [step, setStep] = useState<Step>("name");
  const [fullName, setFullName] = useState("");
  const [useEmail, setUseEmail] = useState(false);
  const [phone, setPhone] = useState("+234");
  const [email, setEmail] = useState("");
  const [otpChannel, setOtpChannel] = useState<Channel>("sms");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  const contact = useEmail ? email.trim() : phone.trim();
  const firstName = fullName.trim().split(/\s+/)[0] || "friend";
  const copy = stepCopy[step];

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

  async function registerAndSend() {
    if (useEmail ? !email.includes("@") : phone.replace(/\D/g, "").length < 10) {
      toast(useEmail ? "Enter a valid email." : "Enter a valid phone number.");
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

  function goBackStep() {
    if (step === "otp") setStep("contact");
    else if (step === "contact") setStep("method");
    else if (step === "method") setStep("name");
    else router.push("/welcome");
  }

  return (
    <Shell step={step} onBack={goBackStep}>
      <div className="mb-6 text-center md:mb-8 md:text-left">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blush-soft px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[#c47b62]">
          <PartyPopper size={12} /> Step {stepsOrder.indexOf(step) + 1} of {stepsOrder.length}
        </span>
        <h1 className="mt-3 font-display text-[30px] leading-tight text-deep md:text-[36px]">{copy.title}</h1>
        <p className="mt-2 text-sm text-deep/55 md:text-base">{copy.subtitle({ firstName, contact })}</p>
      </div>

      <AnimatePresence mode="wait">
        {step === "name" ? (
          <motion.div
            key="name"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-5"
          >
            <Input
              label="Your name"
              name="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Chioma Okafor"
              autoComplete="name"
              autoFocus
              leftAddon={<UserRound size={18} className="text-tea" />}
            />
            <Button
              fullWidth
              variant="dark"
              rightIcon={<ArrowRight size={18} />}
              disabled={fullName.trim().length < 2}
              onClick={() => setStep("method")}
            >
              Continue
            </Button>
          </motion.div>
        ) : null}

        {step === "method" ? (
          <motion.div
            key="method"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-3"
          >
            {[
              {
                id: "phone" as const,
                label: "WhatsApp / Phone",
                hint: "Fastest — most Lagos customers pick this",
                icon: Phone,
              },
              {
                id: "email" as const,
                label: "Email",
                hint: "We'll send a code to your inbox",
                icon: Mail,
              },
            ].map((opt) => {
              const Icon = opt.icon;
              const active = useEmail ? opt.id === "email" : opt.id === "phone";
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setUseEmail(opt.id === "email")}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-[22px] border bg-white p-4 text-left transition shadow-[var(--shadow-card)]",
                    active ? "border-deep ring-2 ring-deep/10" : "border-deep/8",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-2xl",
                      active ? "bg-deep text-white" : "bg-sage-soft text-tea",
                    )}
                  >
                    <Icon size={22} strokeWidth={1.7} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-deep">{opt.label}</span>
                    <span className="block text-xs text-deep/50">{opt.hint}</span>
                  </span>
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full border-2",
                      active ? "border-deep" : "border-deep/20",
                    )}
                  >
                    {active ? <span className="h-2.5 w-2.5 rounded-full bg-deep" /> : null}
                  </span>
                </button>
              );
            })}
            <Button fullWidth variant="dark" className="mt-2" rightIcon={<ArrowRight size={18} />} onClick={() => setStep("contact")}>
              Continue
            </Button>
          </motion.div>
        ) : null}

        {step === "contact" ? (
          <motion.div
            key="contact"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-5"
          >
            {useEmail ? (
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                autoFocus
                leftAddon={<Mail size={18} className="text-tea" />}
              />
            ) : (
              <Input
                label="Phone number"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+234 801 234 5678"
                autoComplete="tel"
                autoFocus
                leftAddon={<Phone size={18} className="text-tea" />}
              />
            )}
            <p className="text-xs text-deep/45">By continuing you agree to our Terms and Privacy Policy.</p>
            <Button
              fullWidth
              variant="dark"
              loading={loading}
              rightIcon={<ArrowRight size={18} />}
              onClick={() => void registerAndSend()}
            >
              Send code
            </Button>
          </motion.div>
        ) : null}

        {step === "otp" ? (
          <motion.div
            key="otp"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-6"
          >
            <div className="rounded-[24px] bg-white p-5 shadow-[var(--shadow-card)] ring-1 ring-deep/5">
              <OtpInput value={code} onChange={setCode} disabled={loading} />
              <p className="mt-4 text-center text-sm text-deep/55">
                Didn&apos;t get a code?{" "}
                <button
                  type="button"
                  disabled={resendIn > 0 || loading}
                  className="font-semibold text-deep underline decoration-deep/30 underline-offset-2 disabled:opacity-40"
                  onClick={() => void sendOtp()}
                >
                  {resendIn > 0 ? `Resend in ${resendIn}s` : "Click to resend"}
                </button>
              </p>
            </div>
            <Button
              fullWidth
              variant="dark"
              loading={loading}
              disabled={code.length < 6}
              onClick={() => void onVerify()}
            >
              Continue
            </Button>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
              {!useEmail ? (
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
              ) : null}
              <button type="button" className="font-semibold text-deep/45" onClick={() => setStep("contact")}>
                Change contact
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </Shell>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="page-pad">
          <PageSkeleton variant="detail" />
        </div>
      }
    >
      <VerifyForm />
    </Suspense>
  );
}
