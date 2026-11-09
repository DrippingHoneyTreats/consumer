"use client";

import { useEffect } from "react";
import { useAdminPageTitleStore } from "@/store/admin-page-title-store";

export function AdminPageTitle({ title }: { title: string }) {
  const setTitle = useAdminPageTitleStore((s) => s.setTitle);
  useEffect(() => {
    setTitle(title);
    return () => setTitle(undefined);
  }, [title, setTitle]);
  return null;
}
