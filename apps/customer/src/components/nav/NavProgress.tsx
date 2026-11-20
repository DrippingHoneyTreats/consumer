"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";

/**
 * Thin honey-coloured bar across the top while the next page loads after a
 * link tap, so a slow page change never looks like nothing happened.
 */
function Bar() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const safety = useRef<number | undefined>(undefined);

  // Start when an internal link is tapped.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      setState("loading");
      window.clearTimeout(safety.current);
      safety.current = window.setTimeout(() => setState("idle"), 12_000);
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // Finish when the new page has arrived.
  useEffect(() => {
    setState((s) => (s === "loading" ? "done" : s));
    const t = window.setTimeout(() => setState((s) => (s === "done" ? "idle" : s)), 350);
    return () => window.clearTimeout(t);
  }, [pathname, search]);

  if (state === "idle") return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]" role="progressbar" aria-label="Loading page">
      <motion.div
        className="h-full rounded-r-full bg-honey shadow-[0_0_10px_rgba(212,160,23,0.7)]"
        initial={{ width: "0%", opacity: 1 }}
        animate={state === "done" ? { width: "100%", opacity: 0 } : { width: "85%", opacity: 1 }}
        transition={
          state === "done"
            ? { width: { duration: 0.2, ease: "easeOut" }, opacity: { duration: 0.3, delay: 0.15 } }
            : { width: { duration: 8, ease: [0.1, 0.7, 0.2, 1] } }
        }
      />
    </div>
  );
}

export function NavProgress() {
  return (
    <Suspense fallback={null}>
      <Bar />
    </Suspense>
  );
}
