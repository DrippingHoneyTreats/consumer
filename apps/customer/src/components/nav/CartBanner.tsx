"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { formatNgn } from "@/lib/format";
import { useCartStore } from "@/store/cart-store";

const hiddenPrefixes = ["/checkout", "/payment", "/welcome", "/verify", "/orders/"];

export function CartBanner() {
  const pathname = usePathname();
  const draft = useCartStore((s) => s.draft);
  const guestItems = useCartStore((s) => s.guestItems);
  const count = useCartStore((s) => s.itemCount());

  const hidden =
    count <= 0 ||
    pathname === "/orders" ||
    pathname === "/events" ||
    pathname === "/events/book" ||
    hiddenPrefixes.some((p) => pathname.startsWith(p));

  useEffect(() => {
    document.documentElement.style.setProperty("--banner-h", hidden ? "0px" : "76px");
  }, [hidden]);

  const total = guestItems.length
    ? guestItems.reduce((sum, i) => sum + i.unitPrice * i.qty, 0)
    : (draft?.total ?? 0);
  const href = guestItems.length || !draft?.id ? "/orders/cart" : `/orders/${draft.id}`;

  return (
    <AnimatePresence>
      {hidden ? null : (
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          className="fixed bottom-[calc(var(--tab-h)+var(--safe-bottom)+4px)] left-1/2 z-40 w-[calc(100%-32px)] max-w-[min(var(--app-max),100%-32px)] -translate-x-1/2 md:w-[calc(100%-48px)]"
        >
          <Link
            href={href}
            className="glass-deep pressable flex items-center gap-3 rounded-[22px] py-2.5 pl-2.5 pr-4 text-sm text-white shadow-[var(--shadow-float)]"
          >
            <motion.span
              key={count}
              initial={{ scale: 0.6 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 15 }}
              className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-blush text-deep"
            >
              <ShoppingBag size={18} />
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-deep">
                {count}
              </span>
            </motion.span>
            <span className="flex-1">
              <span className="block text-[11px] text-white/70">
                {count} item{count === 1 ? "" : "s"}
              </span>
              <span className="block font-semibold">{formatNgn(total)}</span>
            </span>
            <span className="flex items-center gap-1 font-semibold text-blush">
              View order <ArrowRight size={16} />
            </span>
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
