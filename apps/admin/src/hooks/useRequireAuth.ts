"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";

/** Payment steps only: sends guests to sign in, then back to the current page. */
export function useRequireAuth() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated || user) return;
    const here = window.location.pathname + window.location.search;
    router.replace(`/verify?returnTo=${encodeURIComponent(here)}`);
  }, [hydrated, user, router]);

  return !!user;
}
