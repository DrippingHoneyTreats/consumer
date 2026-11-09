"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { isStaffRole } from "@/lib/admin-nav";

export function AdminGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const hydrated = useAuthStore((s) => s.hydrated);
  const user = useAuthStore((s) => s.user);
  const refreshMe = useAuthStore((s) => s.refreshMe);
  const [checking, setChecking] = useState(true);

  const isLogin = pathname === "/login";

  useEffect(() => {
    if (isLogin) {
      setChecking(false);
      return;
    }
    if (!hydrated) return;

    void (async () => {
      let current = user;
      if (!current) {
        current = await refreshMe();
      }
      if (!isStaffRole(current?.role)) {
        router.replace("/login");
        return;
      }
      setChecking(false);
    })();
  }, [hydrated, user, refreshMe, router, isLogin]);

  if (isLogin) return <>{children}</>;

  if (!hydrated || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-deep/20 border-t-deep" />
      </div>
    );
  }

  return <>{children}</>;
}
