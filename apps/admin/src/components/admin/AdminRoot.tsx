"use client";

import { usePathname } from "next/navigation";
import { ToastHost } from "@dht/ui";
import { AdminGate } from "@/components/admin/AdminGate";
import { AdminShell } from "@/components/admin/AdminShell";

export function AdminRoot({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";

  return (
    <AdminGate>
      {isLogin ? (
        <div className="flex min-h-screen items-center justify-center p-6">{children}</div>
      ) : (
        <AdminShell>{children}</AdminShell>
      )}
      <ToastHost />
    </AdminGate>
  );
}
