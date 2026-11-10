import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  LayoutDashboard,
  Megaphone,
  Shield,
  ShoppingBag,
  Users,
} from "lucide-react";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  match?: (path: string) => boolean;
};

/** MVP admin: products, users, staff, promos, orders, events. */
export const ADMIN_NAV: AdminNavItem[] = [
  { href: "/catalogue", label: "Products", icon: ShoppingBag },
  { href: "/users", label: "Users", icon: Users },
  { href: "/staff", label: "Staff", icon: Shield },
  { href: "/promos", label: "Promos", icon: Megaphone },
  {
    href: "/orders",
    label: "Orders",
    icon: LayoutDashboard,
    match: (p) => p === "/orders" || p.startsWith("/orders/"),
  },
  { href: "/events", label: "Events", icon: CalendarDays },
];

export const LIVE_ORDER_STATUSES = [
  "placed",
  "accepted",
  "preparing",
  "out_for_delivery",
  "delivered",
] as const;

export const HISTORY_STATUSES = ["delivered", "cancelled", "payment_failed"] as const;

export function isStaffRole(role?: string | null): boolean {
  return role === "STAFF" || role === "SUPER_ADMIN";
}
