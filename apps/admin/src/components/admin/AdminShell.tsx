"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink, LogOut, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { ADMIN_NAV_GROUPS, type AdminNavItem } from "@/lib/admin-nav";
import { LOGO } from "@/lib/placeholders";
import { useAuthStore } from "@/store/auth-store";
import { useAdminPageTitleStore } from "@/store/admin-page-title-store";
import { Avatar } from "@/components/admin/kit";

const CUSTOMER_SITE = "https://drippinghoneytreats.com";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const title = useAdminPageTitleStore((s) => s.title);
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => setMobileOpen(false), [pathname]);

  const isActive = (item: AdminNavItem) =>
    item.match ? item.match(pathname) : pathname === item.href || pathname.startsWith(`${item.href}/`);

  const nav = (
    <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-4">
      {ADMIN_NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-deep/40">{group.label}</p>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
                    active ? "bg-deep text-white shadow-sm" : "text-deep/70 hover:bg-deep/5 hover:text-deep",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  const footer = (
    <div className="border-t border-deep/10 p-3">
      <div className="flex items-center gap-3 rounded-xl px-2 py-2">
        <Avatar name={user?.fullName || user?.email} size={34} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-deep">{user?.fullName || "Admin"}</p>
          <p className="truncate text-[11px] text-deep/50">{user?.role === "SUPER_ADMIN" ? "Super admin" : "Staff"}</p>
        </div>
        <button
          type="button"
          aria-label="Sign out"
          title="Sign out"
          disabled={signingOut}
          onClick={() => {
            setSigningOut(true);
            void logout().finally(() => setSigningOut(false));
          }}
          className="flex h-9 w-9 items-center justify-center rounded-full text-deep/50 transition hover:bg-danger/10 hover:text-danger disabled:opacity-50"
        >
          {signingOut ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <LogOut size={16} />
          )}
        </button>
      </div>
      <a
        href={CUSTOMER_SITE}
        target="_blank"
        rel="noreferrer"
        className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-deep/50 hover:text-deep"
      >
        <ExternalLink size={13} /> View customer site
      </a>
    </div>
  );

  const brand = (
    <Link href="/" className="flex items-center gap-3 px-5 py-5">
      <Image src={LOGO} alt="Dripping Honey Treats" width={120} height={48} unoptimized priority className="h-11 w-auto object-contain" />
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-deep/45">Admin</span>
    </Link>
  );

  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-deep/10 bg-white lg:flex">
        <div className="border-b border-deep/10">{brand}</div>
        {nav}
        {footer}
      </aside>

      {/* Phone top bar */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-deep/10 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <button type="button" className="rounded-xl p-2 hover:bg-deep/5" aria-label="Menu" onClick={() => setMobileOpen(true)}>
          <Menu className="h-5 w-5" />
        </button>
        <p className="flex-1 truncate font-semibold text-deep">{title ?? "Admin"}</p>
        <Image src={LOGO} alt="" width={64} height={28} unoptimized className="h-7 w-auto object-contain" />
      </header>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 bg-deep/30 lg:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute left-0 top-0 flex h-full w-[min(290px,85vw)] flex-col bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-deep/10 pr-3">
              {brand}
              <button type="button" aria-label="Close menu" className="rounded-xl p-2 hover:bg-deep/5" onClick={() => setMobileOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            {nav}
            {footer}
          </div>
        </div>
      ) : null}

      <main className="mx-auto w-full min-w-0 max-w-7xl flex-1 p-4 pb-10 md:p-6 lg:p-8">{children}</main>
    </div>
  );
}
