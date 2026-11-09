/** Shared Framer Motion presets — customer app only. */

/** Soft settle into place (gentle ease-in-out feel). */
export const easeGentle = [0.33, 0.0, 0.2, 1] as const;
/** Kept for hover/tap snappiness. */
export const easeOut = [0.22, 1, 0.36, 1] as const;

export const springSnappy = { type: "spring" as const, stiffness: 420, damping: 28 };
export const springSoft = { type: "spring" as const, stiffness: 260, damping: 24 };

/** Bottom-up fly-in — cards & sections. */
export const fadeUp = {
  hidden: { opacity: 0, y: 36 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: easeGentle },
  },
};

export const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.45, ease: easeGentle } },
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  show: { opacity: 1, scale: 1, transition: { ...springSoft } },
};

export const stagger = (gap = 0.07) => ({
  hidden: {},
  show: { transition: { staggerChildren: gap, delayChildren: 0.06 } },
});

export const cardHover = {
  rest: { y: 0, scale: 1 },
  hover: { y: -6, scale: 1.02, transition: springSnappy },
  tap: { scale: 0.97, transition: { duration: 0.12 } },
};

/** Inline whileInView helpers for cards/sections. */
export const flyUp = {
  initial: { opacity: 0, y: 36 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.15 } as const,
  transition: { duration: 0.65, ease: easeGentle },
};
