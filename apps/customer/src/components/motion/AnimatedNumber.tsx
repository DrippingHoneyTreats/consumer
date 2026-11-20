"use client";

import { useEffect } from "react";
import { motion, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { formatNgn } from "@/lib/format";

/**
 * Money that counts up/down to its new value (kobo in, ₦ out) instead of
 * snapping, so cart totals feel alive when quantities change.
 */
export function AnimatedNumber({
  value,
  className,
  format = formatNgn,
}: {
  value: number;
  className?: string;
  format?: (n: number) => string;
}) {
  const reduce = useReducedMotion();
  const spring = useSpring(value, { visualDuration: 0.45, bounce: 0 });
  const text = useTransform(spring, (v) => format(Math.round(v)));

  useEffect(() => {
    if (reduce) spring.jump(value);
    else spring.set(value);
  }, [value, reduce, spring]);

  return (
    <motion.span className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {text}
    </motion.span>
  );
}
