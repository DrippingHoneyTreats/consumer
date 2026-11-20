"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useAnimate, useReducedMotion } from "framer-motion";

/**
 * "Fly to cart": a thumbnail of the product arcs from where the customer
 * tapped into the cart icon, which then wobbles. Works for every add-to-cart
 * caller without passing refs around:
 *   - we remember the last tap position (pointerdown, capture phase)
 *   - targets opt in with `data-cart-target` (tab bar + floating cart)
 */

type Flight = { id: number; src?: string; from: { x: number; y: number }; to: { x: number; y: number } };

const BUMP_EVENT = "dht:cart-bump";
const FLY_EVENT = "dht:cart-fly";
const SIZE = 56;

let lastTap: { x: number; y: number } | null = null;
let nextId = 1;

function visibleTarget(): DOMRect | null {
  const els = Array.from(document.querySelectorAll<HTMLElement>("[data-cart-target]"));
  for (const el of els) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight) return r;
  }
  return null;
}

/** Call after an item is added. Safe to call anywhere on the client. */
export function flyToCart(imageSrc?: string) {
  if (typeof window === "undefined") return;
  try {
    navigator.vibrate?.(12);
  } catch {
    /* unsupported */
  }
  const target = visibleTarget();
  if (!target) {
    window.dispatchEvent(new Event(BUMP_EVENT));
    return;
  }
  const from = lastTap ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const to = { x: target.left + target.width / 2, y: target.top + target.height / 2 };
  window.dispatchEvent(
    new CustomEvent<Flight>(FLY_EVENT, { detail: { id: nextId++, src: imageSrc, from, to } }),
  );
}

/** Mount once (AppProviders). Renders the flying thumbnails above everything. */
export function CartFlyLayer() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [mounted, setMounted] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    setMounted(true);
    const onDown = (e: PointerEvent) => {
      lastTap = { x: e.clientX, y: e.clientY };
    };
    const onFly = (e: Event) => {
      const f = (e as CustomEvent<Flight>).detail;
      if (reduce) {
        window.dispatchEvent(new Event(BUMP_EVENT));
        return;
      }
      setFlights((list) => [...list.slice(-3), f]);
    };
    window.addEventListener("pointerdown", onDown, { capture: true, passive: true });
    window.addEventListener(FLY_EVENT, onFly);
    return () => {
      window.removeEventListener("pointerdown", onDown, { capture: true });
      window.removeEventListener(FLY_EVENT, onFly);
    };
  }, [reduce]);

  if (!mounted) return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[70]" aria-hidden>
      <AnimatePresence>
        {flights.map((f) => {
          const peak = Math.min(f.from.y, f.to.y) - 140; // arc apex
          return (
            <motion.div
              key={f.id}
              className="absolute left-0 top-0 overflow-hidden rounded-2xl bg-blush shadow-[var(--shadow-float)] ring-2 ring-white"
              style={{ width: SIZE, height: SIZE, marginLeft: -SIZE / 2, marginTop: -SIZE / 2 }}
              initial={{ x: f.from.x, y: f.from.y, scale: 0.4, opacity: 0 }}
              animate={{
                x: [f.from.x, (f.from.x + f.to.x) / 2, f.to.x],
                y: [f.from.y, peak, f.to.y],
                scale: [0.4, 1.1, 0.3],
                opacity: [0, 1, 0.9],
                rotate: [0, -12, 8],
              }}
              transition={{ duration: 0.72, times: [0, 0.45, 1], ease: [0.45, 0, 0.2, 1] }}
              onAnimationComplete={() => {
                setFlights((list) => list.filter((x) => x.id !== f.id));
                window.dispatchEvent(new Event(BUMP_EVENT));
              }}
            >
              {f.src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.src} alt="" className="h-full w-full object-cover" draggable={false} />
              ) : null}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>,
    document.body,
  );
}

/** Wobble an element when something lands in the cart. Attach the returned ref. */
export function useCartBump<T extends HTMLElement = HTMLElement>() {
  const [scope, animate] = useAnimate<T>();
  useEffect(() => {
    const onBump = () => {
      if (!scope.current) return;
      void animate(
        scope.current,
        { scale: [1, 1.35, 0.9, 1.08, 1], rotate: [0, -14, 10, -4, 0] },
        { duration: 0.55, ease: "easeOut" },
      );
    };
    window.addEventListener(BUMP_EVENT, onBump);
    return () => window.removeEventListener(BUMP_EVENT, onBump);
  }, [animate, scope]);
  return scope;
}
