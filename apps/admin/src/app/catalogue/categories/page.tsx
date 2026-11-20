"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Eye, EyeOff, Plus } from "lucide-react";
import { apiClient } from "@/lib/api";
import { asArray } from "@/lib/data";
import { ITEM_PLACEHOLDER } from "@/lib/placeholders";
import { cn } from "@/lib/cn";
import { checkRequired, useFieldErrors } from "@/lib/validate";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";
import { OfflineState } from "@/components/ui/EmptyState";
import { ImageField } from "@/components/admin/ImageField";
import { DataTable, DetailLayout, PageHeader, Panel } from "@/components/admin/kit";

type Cat = { id: string; name: string; slug: string; image?: string | null; tagline?: string | null; sort?: number; active?: boolean };

const blank = { name: "", tagline: "", image: "", active: true };

export default function CategoriesPage() {
  const f = useFieldErrors();
  const [cats, setCats] = useState<Cat[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [editing, setEditing] = useState<Cat | null>(null);
  const [form, setForm] = useState(blank);

  const load = useCallback(async () => {
    try {
      const [catsRes, itemsRes] = await Promise.all([
        apiClient.get<Cat[] | { data: Cat[] }>("/admin/categories"),
        apiClient.get<{ items: { categoryId: string }[] }>("/admin/items"),
      ]);
      setCats(asArray<Cat>(catsRes));
      const c: Record<string, number> = {};
      for (const i of itemsRes.items ?? []) c[i.categoryId] = (c[i.categoryId] ?? 0) + 1;
      setCounts(c);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function edit(c: Cat | null) {
    setEditing(c);
    setForm(c ? { name: c.name, tagline: c.tagline ?? "", image: c.image ?? "", active: c.active !== false } : blank);
    f.reset();
  }

  async function save() {
    if (!f.validate({ name: checkRequired(form.name, "Give the category a name.") })) return;
    const body = { name: form.name.trim(), tagline: form.tagline.trim() || undefined, image: form.image.trim() || undefined, active: form.active };
    try {
      if (editing) {
        await apiClient.patch(`/admin/categories/${editing.id}`, body);
        toast.success("Category saved.");
      } else {
        await apiClient.post("/admin/categories", body);
        toast.success("Category added.");
      }
      edit(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save the category.");
    }
  }

  const sorted = useMemo(() => [...cats].sort((a, b) => (a.sort ?? 99) - (b.sort ?? 99) || a.name.localeCompare(b.name)), [cats]);

  return (
    <>
      <PageHeader
        back={{ href: "/catalogue", label: "Products" }}
        title="Categories"
        subtitle="Groups on the customer menu, like Cakes or Chinchin. Click one to edit it."
        actions={
          <Button variant="dark" leftIcon={<Plus size={15} />} onClick={() => edit(null)}>
            New category
          </Button>
        }
      />

      {state === "error" ? (
        <OfflineState onRetry={() => void load()} />
      ) : (
        <DetailLayout
          main={
            <DataTable
              loading={state === "loading"}
              rows={sorted}
              rowKey={(c) => c.id}
              empty="No categories yet. Add the first one on the right."
              columns={[
                {
                  key: "name",
                  label: "Category",
                  render: (c) => (
                    <button type="button" onClick={() => edit(c)} className="flex items-center gap-3 text-left">
                      <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-cream">
                        <Image src={c.image || ITEM_PLACEHOLDER} alt="" fill className="object-cover" sizes="44px" unoptimized />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-medium text-deep">{c.name}</span>
                        {c.tagline ? <span className="block truncate text-xs text-deep/50">{c.tagline}</span> : null}
                      </span>
                    </button>
                  ),
                },
                { key: "products", label: "Products", render: (c) => counts[c.id] ?? 0 },
                {
                  key: "visible",
                  label: "Visible",
                  render: (c) =>
                    c.active === false ? (
                      <span className="inline-flex items-center gap-1 text-xs text-deep/50">
                        <EyeOff size={13} /> Hidden
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-tea">
                        <Eye size={13} /> Shown
                      </span>
                    ),
                },
                {
                  key: "edit",
                  label: "",
                  align: "right",
                  render: (c) => (
                    <button type="button" onClick={() => edit(c)} className={cn("text-xs font-semibold", editing?.id === c.id ? "text-deep" : "text-tea hover:text-deep")}>
                      {editing?.id === c.id ? "Editing" : "Edit"}
                    </button>
                  ),
                },
              ]}
              mobile={(c) => (
                <button type="button" onClick={() => edit(c)} className="flex w-full items-center gap-3 text-left">
                  <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-cream">
                    <Image src={c.image || ITEM_PLACEHOLDER} alt="" fill className="object-cover" sizes="44px" unoptimized />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-deep">{c.name}</span>
                    <span className="text-xs text-deep/55">{counts[c.id] ?? 0} products{c.active === false ? " · Hidden" : ""}</span>
                  </span>
                </button>
              )}
            />
          }
          aside={
            <Panel title={editing ? `Edit “${editing.name}”` : "New category"}>
              <div className="grid gap-4">
                <Input
                  label="Name"
                  value={form.name}
                  onChange={(e) => {
                    setForm({ ...form, name: e.target.value });
                    f.clear("name");
                  }}
                  error={f.errors.name ?? undefined}
                  placeholder="e.g. Chinchin"
                />
                <Input label="Short description" value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} placeholder="Crunchy, fibre-rich and baked fresh" />
                <ImageField label="Image" hint="Shown on the customer menu" value={form.image} onChange={(url) => setForm({ ...form, image: url })} />
                <button
                  type="button"
                  onClick={() => setForm({ ...form, active: !form.active })}
                  className="flex items-center gap-3 rounded-xl border border-deep/10 px-3 py-2.5 text-left hover:border-deep/30"
                >
                  {form.active ? <Eye size={18} className="text-tea" /> : <EyeOff size={18} className="text-deep/45" />}
                  <span className="text-sm font-semibold text-deep">{form.active ? "Shown on the menu" : "Hidden from the menu"}</span>
                </button>
                <div className="grid gap-2">
                  <Button variant="dark" onClick={() => save()}>
                    {editing ? "Save changes" : "Add category"}
                  </Button>
                  {editing ? (
                    <Button variant="ghost" onClick={() => edit(null)}>
                      Cancel
                    </Button>
                  ) : null}
                </div>
              </div>
            </Panel>
          }
        />
      )}
    </>
  );
}
