"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, Home, ShoppingBag, UserRound, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/cn";
import { useCartStore } from "@/store/cart-store";

const tabs = [
  { href: "/orders", label: "Orders", icon: ShoppingBag },
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/", label: "Home", icon: Home, centre: true },
  { href: "/pastries", label: "Pastries", icon: UtensilsCrossed },
  { href: "/account", label: "Account", icon: UserRound },
];

const hiddenPrefixes = ["/welcome", "/verify", "/checkout", "/payment"];

export function TabBar() {
  const pathname = usePathname();
  const count = useCartStore((s) => s.itemCount());

  if (hiddenPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return null;
  }

  return (
    <nav className="fixed bottom-[calc(10px+var(--safe-bottom))] left-1/2 z-40 w-[calc(100%-24px)] max-w-[min(var(--app-max),100%-24px)] -translate-x-1/2 md:w-[calc(100%-48px)] lg:w-[calc(100%-64px)]">
      <div
        aria-hidden
        className="tab-fade pointer-events-none absolute -inset-x-3 -bottom-[calc(10px+var(--safe-bottom))] -z-10 h-[calc(var(--tab-h)+var(--safe-bottom)+28px)]"
      />
      <ul className="glass grid h-16 grid-cols-5 items-center rounded-[28px] border border-white/70 px-1.5 shadow-[var(--shadow-float)]">
        {tabs.map((tab) => {
          const active =
            tab.href === "/"
              ? pathname === "/"
              : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const Icon = tab.icon;

          if (tab.centre) {
            return (
              <li key={tab.href} className="flex justify-center">
                <Link href={tab.href} aria-label={tab.label} aria-current={active ? "page" : undefined}>
                  <motion.span
                    whileTap={{ scale: 0.9 }}
                    animate={{ y: active ? -14 : -6, scale: active ? 1 : 0.92 }}
                    transition={{ type: "spring", stiffness: 420, damping: 24 }}
                    className={cn(
                      "flex h-14 w-14 items-center justify-center rounded-full border-4 transition-colors duration-300",
                      active
                        ? "border-white bg-deep text-white shadow-[var(--shadow-float)]"
                        : "border-off-white bg-white text-tea shadow-[var(--shadow-card)]",
                    )}
                  >
                    <Icon size={22} strokeWidth={active ? 2.4 : 1.8} />
                  </motion.span>
                </Link>
              </li>
            );
          }

          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className="relative flex h-12 flex-col items-center justify-center gap-0.5 rounded-[20px] text-[10.5px]"
              >
                {active ? (
                  <motion.span
                    layoutId="tab-pill"
                    className="absolute inset-0 rounded-[20px] bg-blush"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  />
                ) : null}
                <motion.span whileTap={{ scale: 0.85 }} className="relative">
                  <Icon
                    size={20}
                    strokeWidth={active ? 2.4 : 1.8}
                    className={active ? "text-deep" : "text-tea"}
                  />
                  <AnimatePresence>
                    {tab.href === "/orders" && count > 0 ? (
                      <motion.span
                        key={count}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 18 }}
                        className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-deep px-1 text-[9px] font-bold text-white"
                      >
                        {count}
                      </motion.span>
                    ) : null}
                  </AnimatePresence>
                </motion.span>
                <span className={cn("relative", active ? "font-bold text-deep" : "font-medium text-deep/55")}>
                  {tab.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
