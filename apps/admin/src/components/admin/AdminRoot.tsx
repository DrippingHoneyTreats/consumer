"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { ToastHost } from "@dht/ui";
import { AdminGate } from "@/components/admin/AdminGate";
import { AdminShell } from "@/components/admin/AdminShell";
import { PwaRegister } from "@/components/pwa/PwaRegister";
import { useAuthStore } from "@/store/auth-store";

export function AdminRoot({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";
  const refreshMe = useAuthStore((s) => s.refreshMe);

  useEffect(() => {
    void refreshMe();
  }, [refreshMe]);

  return (
    <AdminGate>
      {isLogin ? (
        <div className="flex min-h-screen items-center justify-center p-6">{children}</div>
      ) : (
        <AdminShell>{children}</AdminShell>
      )}
      <PwaRegister />
      <ToastHost />
    </AdminGate>
  );
}
