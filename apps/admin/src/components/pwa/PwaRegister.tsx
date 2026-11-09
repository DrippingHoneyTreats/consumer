"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "dht-admin-pwa-install-dismissed";

/** Registers the service worker and offers an install prompt when the browser allows it. */
export function PwaRegister() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js").catch(() => {
      /* ignore — HTTPS / localhost required */
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
      setShow(true);
      return;
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
    setDeferred(null);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-4">
      <div className="pointer-events-auto flex w-full max-w-lg items-start gap-3 rounded-[22px] border border-deep/10 bg-white/95 p-3 shadow-[var(--shadow-float)] backdrop-blur">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sage-soft text-deep">
          <Download size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-deep">Install DHT Admin</p>
          <p className="mt-0.5 text-xs leading-relaxed text-deep/60">
            {iosHint
              ? "Tap Share, then “Add to Home Screen” to run the kitchen app fullscreen."
              : "Save the admin app on this device for quick kitchen access."}
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
