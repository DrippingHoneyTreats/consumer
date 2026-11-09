"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, GripHorizontal, ShoppingBag, X } from "lucide-react";
import { formatNgn } from "@/lib/format";
import { easeGentle, springSnappy } from "@/lib/motion";
import { useCartStore } from "@/store/cart-store";
import { cn } from "@/lib/cn";

const hiddenPrefixes = ["/checkout", "/payment", "/welcome", "/verify", "/orders/"];

export function CartBanner() {
  const pathname = usePathname();
  const draft = useCartStore((s) => s.draft);
  const guestItems = useCartStore((s) => s.guestItems);
  const count = useCartStore((s) => s.itemCount());
  const [closed, setClosed] = useState(false);
  const constraintsRef = useRef<HTMLDivElement>(null);

  const routeHidden =
    count <= 0 ||
    pathname === "/orders" ||
    pathname === "/events" ||
    pathname === "/events/book" ||
    hiddenPrefixes.some((p) => pathname.startsWith(p));

  const hidden = routeHidden || closed;

  // Re-open when cart count changes (new add / remove)
  useEffect(() => {
    setClosed(false);
  }, [count]);

  useEffect(() => {
    // Corner widget — don't reserve a full-width banner strip
    document.documentElement.style.setProperty("--banner-h", hidden ? "0px" : "8px");
  }, [hidden]);

  const total = guestItems.length
    ? guestItems.reduce((sum, i) => sum + i.unitPrice * i.qty, 0)
    : (draft?.total ?? 0);
  const href = guestItems.length || !draft?.id ? "/orders/cart" : `/orders/${draft.id}`;

  return (
    <div
      ref={constraintsRef}
      className="pointer-events-none fixed inset-0 z-40"
      aria-hidden={hidden}
    >
      <AnimatePresence>
        {hidden ? null : (
          <motion.div
            drag
            dragConstraints={constraintsRef}
            dragElastic={0.14}
            dragMomentum={false}
            dragTransition={{ power: 0.2, timeConstant: 200 }}
            initial={{ opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.94 }}
            transition={{ duration: 0.45, ease: easeGentle }}
            whileDrag={{ scale: 1.03, cursor: "grabbing" }}
            className={cn(
              "pointer-events-auto absolute bottom-[calc(var(--tab-h)+var(--safe-bottom)+12px)] right-3 w-[min(100%-24px,240px)] touch-none sm:right-5",
              "md:bottom-[calc(var(--tab-h)+var(--safe-bottom)+16px)]",
            )}
          >
            <div className="glass-deep relative overflow-hidden rounded-[22px] text-white shadow-[var(--shadow-float)] ring-1 ring-white/10">
              <div className="flex items-center justify-between gap-2 px-3 pt-2.5">
                <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">
                  <GripHorizontal size={12} className="md:hidden" />
                  Your order
                </span>
                <button
                  type="button"
                  aria-label="Hide order"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setClosed(true);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-white/55 hover:bg-white/10 hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>

              <Link href={href} className="pressable block px-3 pb-3 pt-1">
                <div className="flex items-center gap-3">
                  <motion.span
                    key={count}
                    initial={{ scale: 0.7 }}
                    animate={{ scale: 1 }}
                    transition={springSnappy}
                    className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blush text-deep"
                  >
                    <ShoppingBag size={18} />
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-deep">
                      {count}
                    </span>
                  </motion.span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] text-white/65">
                      {count} item{count === 1 ? "" : "s"}
                    </span>
                    <span className="block font-semibold tracking-tight">{formatNgn(total)}</span>
                  </span>
                </div>
                <span className="mt-2.5 flex items-center justify-center gap-1 rounded-full bg-white/10 py-2 text-xs font-semibold text-blush ring-1 ring-white/10">
                  View order <ArrowRight size={14} />
                </span>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
