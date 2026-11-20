"use client";

import { motion } from "framer-motion";

/**
 * Theatre-curtain intro: deep-green velvet drapes with honey trim and a warm
 * light glowing through the centre seam. When `opening` turns true the drapes
 * gather towards the sides (fabric bunching via scaleX) and slide away, and
 * the pelmet lifts, revealing the app ("entering the room").
 *
 * Transform + opacity only, so it stays smooth on mid-range phones.
 */

const EASE = [0.65, 0, 0.35, 1] as const;
const OPEN_S = 1.7; // drapes
const PELMET_DELAY_S = 1.25;

const VELVET = "linear-gradient(180deg, #23382a 0%, #34523c 22%, #3f5f46 55%, #2f4a36 100%)";
/** Vertical folds: dark valleys + soft highlights repeating across the fabric. */
const FOLDS =
  "repeating-linear-gradient(90deg, rgba(0,0,0,.32) 0px, rgba(0,0,0,0) 13px, rgba(255,255,255,.10) 24px, rgba(255,255,255,0) 32px, rgba(0,0,0,.32) 52px)";

function Drape({ side, opening, onDone }: { side: "left" | "right"; opening: boolean; onDone?: () => void }) {
  const left = side === "left";
  return (
    <motion.div
      aria-hidden
      className="absolute inset-y-0 w-[50.5vw] will-change-transform"
      style={{
        [left ? "left" : "right"]: 0,
        transformOrigin: left ? "left center" : "right center",
        backgroundImage: `${FOLDS}, ${VELVET}`,
        // Shade the inner edge so the two drapes read as separate, heavy fabric.
        boxShadow: left ? "inset -28px 0 36px -12px rgba(0,0,0,.45)" : "inset 28px 0 36px -12px rgba(0,0,0,.45)",
      }}
      initial={false}
      animate={
        opening
          ? {
              // Gather towards the side, swaying slightly, then slide out of frame.
              scaleX: [1, 0.94, 0.26, 0.2],
              x: ["0%", "0%", "0%", left ? "-105%" : "105%"],
              skewY: [0, left ? -1.2 : 1.2, left ? 0.6 : -0.6, 0],
            }
          : { scaleX: [1, 0.985, 1] }
      }
      transition={
        opening
          ? { duration: OPEN_S, times: [0, 0.14, 0.72, 1], ease: EASE }
          : { duration: 2.4, repeat: Infinity, ease: "easeInOut" } // idle breathing while closed
      }
      onAnimationComplete={opening ? onDone : undefined}
    >
      {/* Gold hem along the bottom */}
      <div className="absolute inset-x-0 bottom-0 h-[6px] bg-[linear-gradient(90deg,#b8860b,#d4a017,#f3e2b0,#d4a017,#b8860b)] opacity-90" />
      {/* Tie-back cord near the outer edge, visible as the fabric gathers */}
      <div
        className="absolute top-[58%] h-[10px] w-[38%] rounded-full bg-[linear-gradient(90deg,#b8860b,#f3e2b0,#b8860b)] shadow-[0_2px_6px_rgba(0,0,0,.35)]"
        style={{ [left ? "left" : "right"]: "-2%" }}
      />
    </motion.div>
  );
}

export function CurtainIntro({ opening, onDone }: { opening: boolean; onDone: () => void }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <Drape side="left" opening={opening} onDone={onDone} />
      <Drape side="right" opening={opening} />

      {/* Warm light from the "room" spilling through the centre seam */}
      <motion.div
        aria-hidden
        className="absolute inset-y-0 left-1/2 z-[5] w-[3px] -translate-x-1/2"
        style={{
          background: "linear-gradient(180deg, transparent 4%, #f3e2b0 30%, #fff3d6 60%, transparent 96%)",
          boxShadow: "0 0 48px 16px rgba(243, 226, 176, .55)",
        }}
        initial={{ opacity: 0.35 }}
        animate={opening ? { opacity: [0.9, 1, 0], scaleX: [1, 6, 14] } : { opacity: [0.35, 0.75, 0.35] }}
        transition={
          opening ? { duration: 0.9, ease: "easeOut" } : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
        }
      />


      {/* Pelmet across the top with a scalloped edge and gold fringe; lifts away last */}
      <motion.div
        aria-hidden
        className="absolute inset-x-0 top-0 z-10 h-[11vh] min-h-[64px]"
        style={{ backgroundImage: `${FOLDS}, linear-gradient(180deg, #1d3024, #2c4532)` }}
        initial={false}
        animate={opening ? { y: "-140%" } : { y: "0%" }}
        transition={{ delay: opening ? PELMET_DELAY_S : 0, duration: 0.6, ease: EASE }}
      >
        <div className="absolute inset-x-0 bottom-0 h-[3px] bg-[#d4a017]" />
        <div
          className="absolute inset-x-0 -bottom-[17px] h-[18px]"
          style={{
            backgroundImage: "radial-gradient(circle at 50% 0, #2c4532 15px, #d4a017 15.5px, #d4a017 17px, transparent 17.5px)",
            backgroundSize: "44px 18px",
            backgroundRepeat: "repeat-x",
          }}
        />
      </motion.div>
    </div>
  );
}
