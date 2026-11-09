"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/** Per-device: once closed or installed, never show again on this browser. */
const DISMISS_KEY = "dht-pwa-install-dismissed";

function isOrdersSurface(pathname: string) {
  if (pathname === "/orders") return true;
  // Order detail — not cart
  return /^\/orders\/[^/]+$/.test(pathname);
}

/** Registers the SW globally; install banner only on the Orders surface. */
export function PwaRegister() {
  const pathname = usePathname();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [eligible, setEligible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js").catch(() => {
      /* HTTPS / localhost required */
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isSafari = /safari/i.test(navigator.userAgent) && !/crios|fxios|edgios/i.test(navigator.userAgent);
    if (isIos && isSafari) {
      setIosHint(true);
      setEligible(true);
      return;
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setEligible(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setEligible(false);
    setDeferred(null);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    localStorage.setItem(DISMISS_KEY, "1");
    setDeferred(null);
    setEligible(false);
  };

  const show = eligible && isOrdersSurface(pathname);
  if (!show) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(12px+var(--safe-top))] z-50 flex justify-center px-4 md:px-6">
      <div className="pointer-events-auto flex w-full max-w-lg items-start gap-3 rounded-[22px] border border-deep/10 bg-white/95 p-3 shadow-[var(--shadow-float)] backdrop-blur">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blush text-deep">
          <Download size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-deep">Install DHT</p>
          <p className="mt-0.5 text-xs leading-relaxed text-deep/60">
            {iosHint
              ? "Tap Share, then “Add to Home Screen” for quicker reorders."
              : "Save the app on this device for faster orders next time."}
          </p>
          {!iosHint && deferred ? (
            <Button className="mt-2" variant="dark" onClick={() => void install()}>
              Install app
            </Button>
          ) : null}
        </div>
        <button type="button" aria-label="Dismiss" onClick={dismiss} className="rounded-full p-1.5 text-deep/45 hover:bg-deep/5">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
