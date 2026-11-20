"use client";

import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, KeyRound, Mail, MessageCircle, Phone, ShieldCheck, Sparkles, Truck, UserRound } from "lucide-react";
import { ApiRequestError, apiClient } from "@/lib/api";
import type { User } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { OtpInput } from "@/components/auth/OtpInput";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { toast } from "@/components/ui/Toast";
import { VerifyingOverlay } from "@/components/ui/Verifying";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { PageSkeleton } from "@/components/ui/ColumnLoader";
import { contactLink, greetingForNow } from "@/lib/format";
import { checkCode, checkEmail, checkName, checkPhone, checkPin, checkPinConfirm, normalizeNgPhone, useFieldErrors } from "@/lib/validate";

/**
 * Phone-first sign-in.
 *   WhatsApp number → (existing) PIN  |  (new) name + create PIN
 *   Email tab → email → 6-digit code → (new) name
 *   Continue with Google
 */
type Step = "phone" | "pin" | "create" | "forgot" | "email" | "emailCode" | "name";

const COPY: Record<Step, { title: string; subtitle: string }> = {
  phone: { title: "Sign in or sign up", subtitle: "Use your WhatsApp number or email. It takes seconds." },
  pin: { title: "Enter your PIN", subtitle: "The 4-digit PIN you created for this number." },
  create: { title: "Create your account", subtitle: "Tell us your name and choose a 4-digit PIN." },
  forgot: { title: "Reset your PIN", subtitle: "Choose a new 4-digit PIN." },
  email: { title: "Sign in or sign up", subtitle: "Use your WhatsApp number or email. It takes seconds." },
  emailCode: { title: "Check your inbox", subtitle: "Enter the 6-digit code we just emailed you." },
  name: { title: "What should we call you?", subtitle: "Your first name is enough." },
};

const errText = (e: unknown, fallback: string) => (e instanceof ApiRequestError ? e.message : fallback);

function Shell({ children, onBack, showBack }: { children: ReactNode; onBack: () => void; showBack: boolean }) {
  return (
    <div className="flex min-h-dvh flex-col bg-[#f7f3ee] md:flex-row">
      <aside className="relative overflow-hidden border-b border-deep/5 bg-gradient-to-br from-[#fff8f3] via-cream to-blush-soft px-5 pb-5 pt-[calc(16px+var(--safe-top))] md:flex md:w-[340px] md:shrink-0 md:flex-col md:border-b-0 md:border-r md:px-7 md:pb-8 md:pt-8 lg:w-[380px]">
        <div className="pointer-events-none absolute -bottom-16 -right-10 h-48 w-48 rounded-full bg-blush/30 blur-2xl" aria-hidden />
        <div className="pointer-events-none absolute -left-10 top-24 h-32 w-32 rounded-full bg-sage/20 blur-2xl" aria-hidden />
        <div className="relative flex items-center justify-between gap-3 md:mb-10">
          <BrandLogo size="sm" href="/" />
          <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-tea shadow-sm">
            <Sparkles size={11} /> Seamless Drip!
          </span>
        </div>
        <div className="relative hidden md:block">
          <p className="mb-6 font-display text-2xl text-deep">Sign in, sweet & simple</p>
          <ul className="space-y-5 text-sm text-deep/70">
            {[
              { icon: Phone, title: "Just your WhatsApp number", blurb: "No passwords. A quick 4-digit PIN." },
              { icon: Truck, title: "Order updates on WhatsApp", blurb: "From the oven to your door." },
              { icon: ShieldCheck, title: "Private & secure", blurb: "We never share your details." },
            ].map(({ icon: Icon, title, blurb }) => (
              <li key={title} className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-white text-tea shadow-sm">
                  <Icon size={16} />
                </span>
                <span>
                  <span className="block font-semibold text-deep">{title}</span>
                  <span className="block text-xs text-deep/55">{blurb}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="relative mt-auto hidden items-center justify-between gap-3 pt-10 text-sm md:flex">
          <Link href="/" className="inline-flex items-center gap-1.5 font-semibold text-tea">
            <ArrowLeft size={14} /> Back to home
          </Link>
          <Link href="/" className="font-semibold text-deep underline decoration-deep/30 underline-offset-4 hover:decoration-deep">
            Browse as guest
          </Link>
        </div>
      </aside>

      <main className="relative flex flex-1 flex-col px-5 pb-[calc(28px+var(--safe-bottom))] pt-6 md:px-10 md:pt-12 lg:px-16">
        {showBack ? (
          <button type="button" onClick={onBack} className="mb-6 inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-tea md:mb-8">
            <ArrowLeft size={16} /> Back
          </button>
        ) : (
          <div className="mb-6 h-5 md:mb-8" />
        )}
        <div className="mx-auto w-full max-w-md flex-1">{children}</div>
        <div className="mt-8 flex items-center justify-between gap-3 text-sm md:hidden">
          <Link href="/" className="inline-flex items-center gap-1.5 font-semibold text-tea">
            <ArrowLeft size={14} /> Home
          </Link>
          <Link href="/" className="font-semibold text-deep underline decoration-deep/30 underline-offset-4 hover:decoration-deep">
            Browse as guest
          </Link>
        </div>
      </main>
    </div>
  );
}

function SignInFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const returnTo = params.get("returnTo") || "/";
  const setUser = useAuthStore((s) => s.setUser);

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("+234");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [code, setCode] = useState("");
  const [knownName, setKnownName] = useState<string | null>(null);
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);
  const [forgotByWhatsapp, setForgotByWhatsapp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    const err = params.get("error");
    if (err === "google") toast.error("Google sign-in didn't complete. Please try again.");
    if (err === "google_unavailable") toast("Google sign-in isn't available yet. Use your WhatsApp number or email.");
  }, [params]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const doneRef = useRef(false);

  const f = useFieldErrors();

  const go = (next: Step) => {
    setPin("");
    setPin2("");
    setCode("");
    f.reset();
    setStep(next);
  };

  function finish(user: User) {
    doneRef.current = true;
    setDone(true);
    setUser(user);
    window.setTimeout(() => {
      toast.success(greetingForNow(user.fullName) + "!");
      router.replace(returnTo);
    }, 900);
  }

  /** Run an API step. A server error is shown as a toast and under `field`. */
  async function run(fn: () => Promise<void>, fallback: string, busyText = "Verifying…", field?: string) {
    setLoading(true);
    setBusy(busyText);
    try {
      await fn();
    } catch (e) {
      const msg = errText(e, fallback);
      toast.error(msg);
      if (field) f.setError(field, msg);
    } finally {
      setLoading(false);
      // Keep the overlay up (as a tick) when we're signing in and navigating away.
      if (!doneRef.current) setBusy(null);
    }
  }

  // ── Phone + PIN ──
  const startPhone = () => {
    if (!f.validate({ phone: checkPhone(phone) })) return;
    return run(async () => {
      const res = await apiClient.post<{ next: "pin" | "create" | "create_with_code"; name?: string | null; sentTo?: string }>(
        "/auth/phone/start",
        { phone: normalizeNgPhone(phone) },
      );
      setKnownName(res.name ?? null);
      setCodeSentTo(res.next === "create_with_code" ? (res.sentTo ?? null) : null);
      go(res.next === "pin" ? "pin" : "create");
    }, "Couldn't continue. Check the number and try again.", "Checking your number…", "phone");
  };

  const loginPin = (value: string) => {
    if (!f.validate({ pin: value.length === 4 ? null : "Enter your 4-digit PIN." })) return;
    return run(
      async () => {
        finish(await apiClient.post<User>("/auth/pin/login", { phone: normalizeNgPhone(phone), pin: value }));
      },
      "Couldn't sign you in.",
      "Verifying your PIN…",
      "pin",
    ).then(() => {
      if (!doneRef.current) setPin("");
    });
  };

  const register = () => {
    const ok = f.validate({
      name: checkName(fullName),
      pin: checkPin(pin),
      pin2: checkPinConfirm(pin, pin2),
      code: codeSentTo ? checkCode(code) : null,
    });
    if (!ok) {
      toast.error("Please fix the highlighted fields.");
      return;
    }
    return run(async () => {
      finish(
        await apiClient.post<User>("/auth/pin/register", {
          phone: normalizeNgPhone(phone),
          pin,
          fullName: fullName.trim(),
          code: codeSentTo ? code : undefined,
        }),
      );
    }, "Couldn't create your account.", "Creating your account…");
  };

  const forgot = () =>
    run(async () => {
      const res = await apiClient.post<{ method: "email" | "whatsapp"; sentTo?: string }>("/auth/pin/forgot", { phone: normalizeNgPhone(phone) });
      setForgotByWhatsapp(res.method === "whatsapp");
      setCodeSentTo(res.sentTo ?? null);
      go("forgot");
    }, "Couldn't start the reset.", "Sending your reset code…");

  const resetPin = () => {
    const ok = f.validate({ code: checkCode(code), pin: checkPin(pin), pin2: checkPinConfirm(pin, pin2) });
    if (!ok) {
      toast.error("Please fix the highlighted fields.");
      return;
    }
    return run(async () => {
      finish(await apiClient.post<User>("/auth/pin/reset", { phone: normalizeNgPhone(phone), code, pin }));
    }, "Couldn't reset your PIN.", "Resetting your PIN…");
  };

  // ── Email + code ──
  const sendEmailCode = () => {
    if (!f.validate({ email: checkEmail(email) })) return;
    return run(async () => {
      await apiClient.post("/auth/otp/send", { contact: email.trim(), channel: "email", purpose: "login" });
      setResendIn(60);
      go("emailCode");
      toast.success("Code sent. Check your inbox.");
    }, "Couldn't send the code. Try again.", "Sending your code…", "email");
  };

  const verifyEmail = (value: string) => {
    if (!f.validate({ code: checkCode(value) })) return;
    return run(async () => {
      const user = await apiClient.post<User>("/auth/otp/verify", { contact: email.trim(), code: value });
      if (user.fullName?.trim()) finish(user);
      else {
        setUser(user);
        go("name");
      }
    }, "Invalid code. Please try again.", "Verifying your code…", "code");
  };

  const saveName = () => {
    if (!f.validate({ name: checkName(fullName) })) return;
    return run(
      async () => {
        finish(await apiClient.patch<User>("/me", { fullName: fullName.trim() }));
      },
      "Couldn't save your name.",
      "Saving your name…",
      "name",
    );
  };

  const back = () => {
    if (step === "pin" || step === "create") go("phone");
    else if (step === "forgot") go("pin");
    else if (step === "emailCode") go("email");
    else router.push("/welcome");
  };

  const copy = COPY[step];

  // WhatsApp and email are two tabs of the same first screen.
  const entry = step === "phone" || step === "email";
  const title = step === "pin" && knownName ? greetingForNow(knownName) : copy.title;

  return (
    <Shell onBack={back} showBack={!entry && step !== "name"}>
      <VerifyingOverlay open={busy !== null} text={busy ?? undefined} done={done} />
      <div className="mb-6 text-center md:mb-8 md:text-left">
        <h1 className="font-display text-[30px] leading-tight text-deep md:text-[36px]">{title}</h1>
        <p className="mt-2 text-sm text-deep/55 md:text-base">{copy.subtitle}</p>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={entry ? "entry" : step}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.22 }}
          className="space-y-5"
        >
          {entry ? (
            <div className="space-y-5">
              <EntryTabs value={step === "email" ? "email" : "phone"} onChange={(t) => go(t)} />
              <div className="relative overflow-hidden">
                <AnimatePresence mode="wait" initial={false} custom={step === "email" ? 1 : -1}>
                  <motion.div
                    key={step}
                    custom={step === "email" ? 1 : -1}
                    variants={{
                      enter: (dir: number) => ({ opacity: 0, x: dir * 36 }),
                      center: { opacity: 1, x: 0 },
                      exit: (dir: number) => ({ opacity: 0, x: dir * -36 }),
                    }}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {step === "phone" ? (
                <form
                  className="space-y-5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void startPhone();
                  }}
                >
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
                    autoFocus
                    leftAddon={<Phone size={18} className="text-tea" />}
                    hint="We'll send order updates here."
                  />
                  <Button type="submit" fullWidth variant="dark" loading={loading} rightIcon={<ArrowRight size={18} />}>
                    Continue
                  </Button>
                </form>
                    ) : (
                <form
                  className="space-y-5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void sendEmailCode();
                  }}
                >
                  <Input
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      f.clear("email");
                    }}
                    error={f.errors.email ?? undefined}
                    placeholder="you@example.com"
                    autoComplete="email"
                    autoFocus
                    leftAddon={<Mail size={18} className="text-tea" />}
                    hint="We'll email you a 6-digit code."
                  />
                  <Button type="submit" fullWidth variant="dark" loading={loading} rightIcon={<ArrowRight size={18} />}>
                    Email me a code
                  </Button>
                </form>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
              <GoogleButton returnTo={returnTo} withDivider className="!mt-1" />
              <p className="text-center text-xs text-deep/45">
                By continuing you agree to our{" "}
                <Link href="/terms" className="font-semibold underline underline-offset-2">
                  Terms
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="font-semibold underline underline-offset-2">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          ) : null}

          {step === "pin" ? (
            <>
              <div className="rounded-[24px] bg-white p-5 shadow-[var(--shadow-card)] ring-1 ring-deep/5">
                <OtpInput
                  value={pin}
                  length={4}
                  mask
                  autoFocus
                  disabled={loading}
                  error={f.errors.pin}
                  onChange={(v) => {
                    setPin(v);
                    f.clear("pin");
                    if (v.length === 4) void loginPin(v);
                  }}
                />
                <p className="mt-4 text-center text-sm text-deep/55">
                  {phone} ·{" "}
                  <button type="button" className="font-semibold text-tea" onClick={() => go("phone")}>
                    change
                  </button>
                </p>
              </div>
              <Button fullWidth variant="dark" loading={loading} onClick={() => loginPin(pin)}>
                Sign in
              </Button>
              <button type="button" onClick={() => void forgot()} className="mx-auto flex items-center gap-1.5 text-sm font-semibold text-deep/55">
                <KeyRound size={15} /> Forgot your PIN?
              </button>
            </>
          ) : null}

          {step === "create" ? (
            <form
              className="space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                void register();
              }}
            >
              <Input
                label="Your name"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  f.clear("name");
                }}
                error={f.errors.name ?? undefined}
                placeholder="Chioma Okafor"
                autoComplete="name"
                autoFocus
                leftAddon={<UserRound size={18} className="text-tea" />}
              />
              <div>
                <p className="mb-2 pl-1 text-sm font-semibold text-deep">Create a 4-digit PIN</p>
                <OtpInput value={pin} onChange={(v) => { setPin(v); f.clear("pin"); }} length={4} mask label="New PIN" error={f.errors.pin} />
              </div>
              <div>
                <p className="mb-2 pl-1 text-sm font-semibold text-deep">Confirm your PIN</p>
                <OtpInput value={pin2} onChange={(v) => { setPin2(v); f.clear("pin2"); }} length={4} mask label="Confirm PIN" error={f.errors.pin2} />
              </div>
              {codeSentTo ? (
                <div>
                  <p className="mb-2 pl-1 text-sm font-semibold text-deep">Code sent to {codeSentTo}</p>
                  <OtpInput value={code} onChange={(v) => { setCode(v); f.clear("code"); }} length={6} label="Email code" error={f.errors.code} />
                  <p className="mt-2 pl-1 text-xs text-deep/50">This number already has an account, so we need to confirm it&apos;s you.</p>
                </div>
              ) : null}
              <p className="text-xs text-deep/50">Use this PIN to sign in next time. Avoid easy ones like 1234 or 0000.</p>
              <Button type="submit" fullWidth variant="dark" loading={loading} rightIcon={<ArrowRight size={18} />}>
                Create account
              </Button>
            </form>
          ) : null}

          {step === "forgot" ? (
            forgotByWhatsapp ? (
              <div className="space-y-5">
                <div className="rounded-[24px] bg-white p-5 text-sm leading-relaxed text-deep/70 shadow-[var(--shadow-card)] ring-1 ring-deep/5">
                  This account doesn&apos;t have an email address, so we&apos;ll reset your PIN for you. Message us on WhatsApp from{" "}
                  <strong>{phone}</strong> and we&apos;ll sort it out.
                </div>
                <a href={contactLink(`Hi DHT, please reset my PIN for ${phone}`)} target="_blank" rel="noreferrer" className="block">
                  <Button fullWidth variant="dark" leftIcon={<MessageCircle size={18} />}>
                    Message us on WhatsApp
                  </Button>
                </a>
              </div>
            ) : (
              <form
                className="space-y-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  void resetPin();
                }}
              >
                <div>
                  <p className="mb-2 pl-1 text-sm font-semibold text-deep">Code sent to {codeSentTo}</p>
                  <OtpInput value={code} onChange={(v) => { setCode(v); f.clear("code"); }} length={6} autoFocus label="Email code" error={f.errors.code} />
                </div>
                <div>
                  <p className="mb-2 pl-1 text-sm font-semibold text-deep">New 4-digit PIN</p>
                  <OtpInput value={pin} onChange={(v) => { setPin(v); f.clear("pin"); }} length={4} mask label="New PIN" error={f.errors.pin} />
                </div>
                <div>
                  <p className="mb-2 pl-1 text-sm font-semibold text-deep">Confirm new PIN</p>
                  <OtpInput value={pin2} onChange={(v) => { setPin2(v); f.clear("pin2"); }} length={4} mask label="Confirm PIN" error={f.errors.pin2} />
                </div>
                <Button type="submit" fullWidth variant="dark" loading={loading}>
                  Reset PIN & sign in
                </Button>
              </form>
            )
          ) : null}

          {step === "emailCode" ? (
            <>
              <div className="rounded-[24px] bg-white p-5 shadow-[var(--shadow-card)] ring-1 ring-deep/5">
                <OtpInput
                  value={code}
                  autoFocus
                  disabled={loading}
                  error={f.errors.code}
                  onChange={(v) => {
                    setCode(v);
                    f.clear("code");
                    if (v.length === 6) void verifyEmail(v);
                  }}
                />
                <p className="mt-4 text-center text-sm text-deep/55">
                  Sent to {email.trim()} ·{" "}
                  <button
                    type="button"
                    disabled={resendIn > 0 || loading}
                    className="font-semibold text-deep underline decoration-deep/30 underline-offset-2 disabled:opacity-40"
                    onClick={() => void sendEmailCode()}
                  >
                    {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend"}
                  </button>
                </p>
              </div>
              <Button fullWidth variant="dark" loading={loading} onClick={() => verifyEmail(code)}>
                Continue
              </Button>
            </>
          ) : null}

          {step === "name" ? (
            <form
              className="space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                void saveName();
              }}
            >
              <Input
                label="Your name"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  f.clear("name");
                }}
                error={f.errors.name ?? undefined}
                placeholder="Chioma Okafor"
                autoComplete="name"
                autoFocus
                leftAddon={<UserRound size={18} className="text-tea" />}
              />
              <Button type="submit" fullWidth variant="dark" loading={loading} rightIcon={<ArrowRight size={18} />}>
                Continue
              </Button>
            </form>
          ) : null}
        </motion.div>
      </AnimatePresence>
    </Shell>
  );
}

function EntryTabs({ value, onChange }: { value: "phone" | "email"; onChange: (v: "phone" | "email") => void }) {
  const tabs = [
    { id: "phone" as const, label: "WhatsApp", icon: Phone },
    { id: "email" as const, label: "Email", icon: Mail },
  ];
  return (
    <div role="tablist" aria-label="Sign in with" className="grid grid-cols-2 gap-1 rounded-full bg-white p-1 shadow-[var(--shadow-card)] ring-1 ring-deep/5">
      {tabs.map(({ id, label, icon: Icon }) => {
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => !active && onChange(id)}
            className={`relative flex h-11 items-center justify-center gap-2 rounded-full text-sm font-semibold transition-colors ${active ? "text-white" : "text-deep/55 hover:text-deep"}`}
          >
            {active ? (
              <motion.span
                layoutId="entry-tab"
                className="absolute inset-0 rounded-full bg-deep shadow-[0_8px_20px_-10px_rgba(63,95,70,0.8)]"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            ) : null}
            <span className="relative flex items-center gap-2">
              <Icon size={16} /> {label}
            </span>
          </button>
        );
      })}
    </div>
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
      <SignInFlow />
    </Suspense>
  );
}
