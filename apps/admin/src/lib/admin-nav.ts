import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  Home,
  Tags,
  LayoutDashboard,
  ShoppingCart,
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

export type AdminNavGroup = { label: string; items: AdminNavItem[] };

/** Sidebar, grouped by job. */
export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  { label: "Overview", items: [{ href: "/", label: "Dashboard", icon: Home, match: (p) => p === "/" }] },
  {
    label: "Sales",
    items: [
      { href: "/orders", label: "Orders", icon: LayoutDashboard },
      { href: "/abandoned", label: "Unfinished", icon: ShoppingCart },
      { href: "/events", label: "Events", icon: CalendarDays },
    ],
  },
  {
    label: "Menu",
    items: [
      {
        href: "/catalogue",
        label: "Products",
        icon: ShoppingBag,
        match: (p) => p === "/catalogue" || (p.startsWith("/catalogue/") && !p.startsWith("/catalogue/categories")),
      },
      { href: "/catalogue/categories", label: "Categories", icon: Tags },
      { href: "/promos", label: "Promos", icon: Megaphone },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/users", label: "Customers", icon: Users },
      { href: "/staff", label: "Staff", icon: Shield },
    ],
  },
];

/** Flat list (kept for older imports). */
export const ADMIN_NAV: AdminNavItem[] = ADMIN_NAV_GROUPS.flatMap((g) => g.items);

export const LIVE_ORDER_STATUSES = [
  "placed",
  "seen",
  "accepted",
  "preparing",
  "ready_for_delivery",
  "out_for_delivery",
  "delivered",
] as const;

export const HISTORY_STATUSES = ["delivered", "cancelled", "payment_failed"] as const;

export function isStaffRole(role?: string | null): boolean {
  return role === "STAFF" || role === "SUPER_ADMIN";
}
