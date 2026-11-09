"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { ADMIN_NAV } from "@/lib/admin-nav";
import { LOGO } from "@/lib/placeholders";
import { useAuthStore } from "@/store/auth-store";
import { useAdminPageTitleStore } from "@/store/admin-page-title-store";
import { Button } from "@/components/ui/Button";

export function AdminShell({
  children,
  actions,
}: {
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const pageTitle = useAdminPageTitleStore((s) => s.title);
  const title = pageTitle ?? "Dashboard";
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLink = (href: string, label: string, Icon: React.ComponentType<{ className?: string }>, active: boolean) => (
    <Link
      key={href}
      href={href}
      onClick={() => setMobileOpen(false)}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
        active ? "bg-blush/80 text-deep" : "text-deep/75 hover:bg-deep/5 hover:text-deep",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  );

  const isActive = (href: string, match?: (p: string) => boolean) =>
    match ? match(pathname) : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row">
      <aside className="hidden w-60 shrink-0 border-r border-deep/10 bg-white/80 backdrop-blur lg:flex lg:flex-col">
        <div className="border-b border-deep/10 px-5 py-5">
          <div className="rounded-2xl bg-deep px-3 py-3">
            <Image
              src={LOGO}
              alt="Dripping Honey Treats"
              width={160}
              height={64}
              unoptimized
              className="h-10 w-auto object-contain"
              priority
            />
          </div>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-deep/45">Admin</p>
          <p className="mt-0.5 truncate text-xs text-deep/55">{user?.fullName}</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {ADMIN_NAV.map(({ href, label, icon: Icon, match }) =>
            navLink(href, label, Icon, isActive(href, match)),
          )}
        </nav>
        <div className="border-t border-deep/10 p-3">
          <Button variant="ghost" fullWidth className="justify-start" onClick={() => void logout()}>
            Sign out
          </Button>
        </div>
      </aside>

      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-deep/10 bg-off-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <button
          type="button"
          className="rounded-xl p-2 hover:bg-deep/5"
          aria-label="Menu"
          onClick={() => setMobileOpen((o) => !o)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <p className="flex-1 truncate font-semibold text-deep">{title ?? "Admin"}</p>
        {actions}
      </header>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 bg-deep/30 lg:hidden" onClick={() => setMobileOpen(false)}>
          <div
            className="absolute left-0 top-0 flex h-full w-[min(280px,85vw)] flex-col bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-deep/10 px-4 py-4">
              <p className="font-display text-lg font-semibold">DHT Admin</p>
            </div>
            <nav className="flex flex-1 flex-col gap-1 overflow-auto p-3">
              {ADMIN_NAV.map(({ href, label, icon: Icon, match }) =>
                navLink(href, label, Icon, isActive(href, match)),
              )}
            </nav>
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="hidden items-center justify-between border-b border-deep/10 bg-white/60 px-6 py-4 lg:flex">
          <h1 className="font-display text-xl font-semibold text-deep">{title ?? "Dashboard"}</h1>
          <div className="flex items-center gap-3">{actions}</div>
        </div>
        <main className="mx-auto w-full max-w-7xl flex-1 p-4 pb-8 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
