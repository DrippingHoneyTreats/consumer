"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { EyeOff, Plus, Tags } from "lucide-react";
import { apiClient } from "@/lib/api";
import { formatNgn } from "@/lib/format";
import { ITEM_PLACEHOLDER } from "@/lib/placeholders";
import { selectClass } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { OfflineState } from "@/components/ui/EmptyState";
import type { AdminItem } from "@/components/admin/ProductEditor";
import { DataTable, FilterTabs, PageHeader, SearchBox, Toolbar, type Tab } from "@/components/admin/kit";

type View = "all" | "available" | "sold_out" | "hidden";

function priceLabel(i: AdminItem) {
  return i.variants?.length ? `From ${formatNgn(Math.min(...i.variants.map((v) => v.price)))}` : formatNgn(i.basePrice);
}

export default function ProductsPage() {
  const [items, setItems] = useState<AdminItem[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [view, setView] = useState<View>("all");
  const [category, setCategory] = useState("");
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setState("loading");
    try {
      const res = await apiClient.get<{ items: AdminItem[] }>("/admin/items");
      setItems(res.items ?? []);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const categories = useMemo(
    () => [...new Map(items.map((i) => [i.categoryId, i.categoryName ?? i.categoryId])).entries()].sort((a, b) => a[1].localeCompare(b[1])),
    [items],
  );
  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items.filter(
      (i) =>
        (view === "all" ||
          (view === "hidden" ? i.active === false : i.active !== false && (view === "sold_out" ? i.status === "sold_out" : i.status !== "sold_out"))) &&
        (!category || i.categoryId === category) &&
        (!term || i.name.toLowerCase().includes(term)),
    );
  }, [items, view, category, q]);

  const tabs: Tab<View>[] = [
    { value: "all", label: "All", count: items.length },
    { value: "available", label: "On sale", count: items.filter((i) => i.active !== false && i.status !== "sold_out").length },
    { value: "sold_out", label: "Sold out", count: items.filter((i) => i.active !== false && i.status === "sold_out").length },
    { value: "hidden", label: "Hidden", count: items.filter((i) => i.active === false).length },
  ];

  return (
    <>
      <PageHeader
        title="Products"
        subtitle="Everything on the menu. Click a product to edit its details, photos, price or availability."
        actions={
          <>
            <Link href="/catalogue/categories" className="inline-flex h-10 items-center gap-2 rounded-full border border-deep/20 bg-white px-4 text-sm font-semibold text-deep">
              <Tags size={15} /> Categories
            </Link>
            <Link href="/catalogue/new" className="inline-flex h-10 items-center gap-2 rounded-full bg-deep px-4 text-sm font-semibold text-white">
              <Plus size={15} /> Add product
            </Link>
          </>
        }
      />
      <Toolbar>
        <FilterTabs tabs={tabs} value={view} onChange={setView} />
        <div className="flex flex-1 flex-wrap items-center gap-2 sm:justify-end">
          <select className={`${selectClass} h-10 w-auto min-w-[160px]`} value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
            <option value="">All categories</option>
            {categories.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
          <SearchBox value={q} onChange={setQ} placeholder="Search products" />
        </div>
      </Toolbar>

      {state === "error" ? (
        <OfflineState onRetry={() => void load()} />
      ) : (
        <DataTable
          loading={state === "loading"}
          rows={shown}
          rowKey={(i) => i.id}
          href={(i) => `/catalogue/${i.id}`}
          empty={items.length ? "No products match these filters." : "No products yet. Click “Add product” to create the first one."}
          columns={[
            {
              key: "product",
              label: "Product",
              render: (i) => (
                <div className="flex items-center gap-3">
                  <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-cream">
                    <Image src={i.images?.[0] || ITEM_PLACEHOLDER} alt="" fill className="object-cover" sizes="44px" unoptimized />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-deep">{i.name}</span>
                    {i.active === false ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-deep/50">
                        <EyeOff size={11} /> Hidden
                      </span>
                    ) : null}
                  </span>
                </div>
              ),
            },
            { key: "category", label: "Category", render: (i) => <span className="text-deep/70">{i.categoryName ?? "—"}</span> },
            { key: "sizes", label: "Sizes", render: (i) => (i.variants?.length ? i.variants.length : "—") },
            { key: "status", label: "Status", render: (i) => <Badge status={i.status} /> },
            { key: "price", label: "Price", align: "right", render: (i) => <span className="font-semibold">{priceLabel(i)}</span> },
          ]}
          mobile={(i) => (
            <div className="flex items-center gap-3">
              <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-cream">
                <Image src={i.images?.[0] || ITEM_PLACEHOLDER} alt="" fill className="object-cover" sizes="48px" unoptimized />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-deep">{i.name}</p>
                <p className="text-xs text-deep/55">
                  {i.categoryName ?? ""} · {priceLabel(i)}
                </p>
              </div>
              <Badge status={i.active === false ? undefined : i.status}>{i.active === false ? "Hidden" : undefined}</Badge>
            </div>
          )}
        />
      )}
    </>
  );
}
