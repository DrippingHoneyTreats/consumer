"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { LOGO } from "@/lib/placeholders";

/** Centered brand mark — used by the full-app welcome splash. */
export function LogoLoader({ label = "Welcome to Dripping Honey Treats" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-5" role="status" aria-label={label}>
      <motion.div
        initial={{ opacity: 0, scale: 0.86 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative"
      >
        <motion.span
          className="absolute -inset-4 rounded-full bg-blush/30"
          animate={{ scale: [1, 1.08, 1], opacity: [0.45, 0.75, 0.45] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          className="relative h-24 w-24 md:h-28 md:w-28"
        >
          <Image src={LOGO} alt="Dripping Honey Treats" fill className="object-contain" sizes="112px" priority unoptimized />
        </motion.div>
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-sm font-medium text-deep/50"
      >
        {label}
      </motion.p>
    </div>
  );
}
