"use client";

import { useEffect } from "react";
import { isDevOrLanHost } from "@/lib/is-dev-host";

async function clearDevServiceWorkers() {
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(regs.map((r) => r.unregister()));
  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  }
}

/**
 * Registers the service worker (offline fallback + cached icons).
 * No "Install app" pop-up: we also suppress the browser's own install
 * mini-bar so customers aren't interrupted while ordering.
 */
export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const host = window.location.hostname;
    // Dev + phone-on-LAN: never let a SW fight Next HMR (causes refresh loops).
    if (isDevOrLanHost(host) || process.env.NODE_ENV === "development") {
      void clearDevServiceWorkers();
      return;
    }

    void navigator.serviceWorker.register("/sw.js").catch(() => {
      /* HTTPS required in production */
    });
  }, []);

  useEffect(() => {
    const suppress = (e: Event) => e.preventDefault();
    window.addEventListener("beforeinstallprompt", suppress);
    return () => window.removeEventListener("beforeinstallprompt", suppress);
  }, []);

  return null;
}
