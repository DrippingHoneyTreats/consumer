"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";
import { ColumnLoader } from "@/components/ui/ColumnLoader";

const isStaff = (u: User | null) => u?.role === "STAFF" || u?.role === "SUPER_ADMIN";

/**
 * Only staff get past this. Checks the session cookie with /me on load;
 * the API also enforces staff-only on every /admin/* endpoint.
 */
export function AdminGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const [checked, setChecked] = useState(false);
  const isLogin = pathname === "/login";

  useEffect(() => {
    let alive = true;
    void (async () => {
      await useAuthStore.persist.rehydrate();
      await useAuthStore.getState().refreshMe();
      if (alive) setChecked(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!checked) return;
    if (!isStaff(user) && !isLogin) router.replace("/login");
    if (isStaff(user) && isLogin) router.replace("/");
  }, [checked, user, isLogin, router]);

  if (isLogin) return <>{children}</>;
  if (!checked || !isStaff(user)) {
    return (
      <div className="mx-auto w-full max-w-3xl p-8">
        <ColumnLoader columns={1} count={4} aspect="h-14 aspect-auto" cellClassName="rounded-xl" />
      </div>
    );
  }
  return <>{children}</>;
}
