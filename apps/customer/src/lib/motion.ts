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

/** Scroll-reveal that can re-trigger for livelier pages. */
export const revealPop = {
  initial: { opacity: 0, y: 48, scale: 0.96 },
  whileInView: { opacity: 1, y: 0, scale: 1 },
  viewport: { once: false, amount: 0.2 } as const,
  transition: { duration: 0.7, ease: easeGentle },
};

/** Continuous float loops for hero / product imagery. */
export const floatLoop = {
  soft: {
    animate: { y: [0, -10, 0], rotate: [0, 1.2, -0.8, 0] },
    transition: { duration: 5.2, repeat: Infinity, ease: "easeInOut" as const },
  },
  bold: {
    animate: { y: [0, -16, 0], rotate: [0, 2.8, -1.8, 0], scale: [1, 1.03, 1] },
    transition: { duration: 6.4, repeat: Infinity, ease: "easeInOut" as const },
  },
};

/** Ken Burns–style slow zoom for carousel slides. */
export const kenBurns = {
  initial: { scale: 1.08 },
  animate: { scale: 1.18 },
  transition: { duration: 8, ease: "linear" as const },
};
