"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiClient } from "@/lib/api";
import { OfflineState } from "@/components/ui/EmptyState";
import { ProductEditor, type AdminItem } from "@/components/admin/ProductEditor";

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<AdminItem | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(async () => {
    try {
      setItem(await apiClient.get<AdminItem>(`/admin/items/${encodeURIComponent(id)}`));
      setState("ready");
    } catch {
      setState("error");
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (state === "error") return <OfflineState onRetry={() => void load()} />;
  if (!item) return <div className="h-96 animate-pulse rounded-2xl bg-white" />;
  // key: rebuild the form from the saved version after each save.
  return <ProductEditor key={`${item.id}-${item.name}-${item.status}-${item.active}`} item={item} onSaved={() => void load()} />;
}
