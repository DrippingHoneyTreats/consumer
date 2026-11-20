"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

// Server-rendered first paint stays visible; only client-side navigations animate in.
let firstLoad = true;

// Browser back/forward fires `popstate` just before the new route renders, so
// we can slide "backwards" for Back and "forwards" for normal navigation.
let navDirection: 1 | -1 = 1;
if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    navDirection = -1;
  });
}

export default function Template({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  const [{ animateIn, dir }] = useState(() => ({ animateIn: !firstLoad, dir: navDirection }));

  useEffect(() => {
    firstLoad = false;
    navDirection = 1;
    document.getElementById("app-scroll")?.scrollTo({ top: 0 });
  }, []);

  return (
    <motion.div
      initial={animateIn ? (reduce ? { opacity: 0 } : { opacity: 0, x: dir * 28 }) : false}
      animate={{ opacity: 1, x: 0 }}
      // No will-change: a lingering transform would trap position:fixed children (sticky bars).
      transition={{ type: "spring", visualDuration: 0.32, bounce: 0 }}
    >
      {children}
    </motion.div>
  );
}
