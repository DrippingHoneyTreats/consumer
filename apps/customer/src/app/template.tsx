"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

// Server-rendered first paint stays visible; only client-side navigations animate in.
let firstLoad = true;

export default function Template({ children }: { children: React.ReactNode }) {
  const [animateIn] = useState(() => !firstLoad);

  useEffect(() => {
    firstLoad = false;
    document.getElementById("app-scroll")?.scrollTo({ top: 0 });
  }, []);

  return (
    <motion.div
      initial={animateIn ? { opacity: 0, y: 28 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.33, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}
