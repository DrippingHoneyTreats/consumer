"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Eye, EyeOff, Megaphone } from "lucide-react";
import { apiClient } from "@/lib/api";
import { asArray } from "@/lib/data";
import type { AdminCategory } from "@/lib/types";
import { formatNgn } from "@/lib/format";
import { cn } from "@/lib/cn";
import { checkRequired, useFieldErrors } from "@/lib/validate";
import { Button } from "@/components/ui/Button";
import { Input, selectClass, textareaClass } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";
import { ProductImagesField } from "@/components/admin/ProductImagesField";
import { DetailLayout, Fields, PageHeader, Panel } from "@/components/admin/kit";

export type AdminItem = {
  id: string;
  categoryId: string;
  categoryName?: string | null;
  name: string;
  description?: string | null;
  images: string[];
  basePrice: number;
  status: "available" | "few_left" | "sold_out" | "pre_order";
  variants?: { id: string; name: string; price: number }[];
  active?: boolean;
  unitsOrdered?: number;
};

const STATUSES: { value: AdminItem["status"]; label: string; hint: string }[] = [
  { value: "available", label: "Available", hint: "Customers can order it" },
  { value: "few_left", label: "Few left", hint: "Shows a 'few left' badge" },
  { value: "sold_out", label: "Sold out", hint: "Visible but can't be ordered" },
  { value: "pre_order", label: "Pre-order", hint: "Customers order ahead" },
];

const CUSTOMER_SITE = "https://drippinghoneytreats.com";

function sizesToText(item?: AdminItem | null): string {
  return (item?.variants ?? []).map((v) => `${v.name} = ${v.price / 100}`).join("\n");
}

/** "Pack of 3 = 4000" per line → variants (keeps ids by name so existing carts don't break). */
function parseSizes(text: string, existing: AdminItem["variants"] = []) {
  const out: { name: string; price: number; id?: string }[] = [];
  for (const line of text.split("\n").map((l) => l.trim()).filter(Boolean)) {
    const m = line.match(/^(.+?)\s*[=:]\s*₦?\s*([\d,.]+)$/);
    if (!m) return null;
    const name = m[1].trim();
    const price = Math.round(Number(m[2].replace(/,/g, "")) * 100);
    if (!name || !Number.isFinite(price)) return null;
    const prev = existing?.find((v) => v.name.toLowerCase() === name.toLowerCase());
    out.push({ name, price, ...(prev ? { id: prev.id } : {}) });
  }
  return out;
}

/** Add / edit a product. `item` = null for a new product. */
export function ProductEditor({ item, onSaved }: { item: AdminItem | null; onSaved?: (i: AdminItem) => void }) {
  const router = useRouter();
  const f = useFieldErrors();
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [form, setForm] = useState({
    categoryId: item?.categoryId ?? "",
    name: item?.name ?? "",
    description: item?.description ?? "",
    basePrice: item && !item.variants?.length ? String(item.basePrice / 100) : "",
    sizes: sizesToText(item),
    images: item?.images ?? [],
    status: item?.status ?? ("available" as AdminItem["status"]),
    active: item?.active ?? true,
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setForm((s) => ({ ...s, [k]: v }));
    f.clear(k as string);
  };

  useEffect(() => {
    void apiClient
      .get<AdminCategory[] | { data: AdminCategory[] }>("/admin/categories")
      .then((res) => {
        const cats = asArray<AdminCategory>(res);
        setCategories(cats);
        setForm((s) => (s.categoryId || !cats[0] ? s : { ...s, categoryId: cats[0].id }));
      })
      .catch(() => toast.error("Couldn't load categories."));
  }, []);

  const variants = parseSizes(form.sizes, item?.variants);
  const fromPrice = variants?.length ? Math.min(...variants.map((v) => v.price)) : Math.round(Number(form.basePrice) * 100);

  async function save() {
    const ok = f.validate({
      categoryId: form.categoryId ? null : "Choose a category.",
      name: checkRequired(form.name, "Give the product a name."),
      sizes: !variants ? 'Write one size per line, like "Pack of 3 = 4000".' : null,
      basePrice:
        variants && !variants.length && (!form.basePrice.trim() || !Number.isFinite(fromPrice) || fromPrice <= 0)
          ? "Enter a price in naira, e.g. 2500 (or add sizes)."
          : null,
    });
    if (!ok || !variants) {
      toast.error("Please fix the highlighted fields.");
      return;
    }
    const body = {
      categoryId: form.categoryId,
      name: form.name.trim(),
      description: form.description.trim() || null,
      basePrice: fromPrice,
      images: form.images.filter(Boolean),
      variants,
      status: form.status,
      active: form.active,
    };
    try {
      if (item) {
        const saved = await apiClient.patch<AdminItem>(`/admin/items/${item.id}`, body);
        toast.success("Product saved.");
        onSaved?.(saved);
      } else {
        const saved = await apiClient.post<AdminItem>("/admin/items", body);
        toast.success("Product added.");
        router.replace(`/catalogue/${saved.id}`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save the product.");
    }
  }

  async function announce() {
    if (!item) return;
    if (!window.confirm(`Email customers about "${item.name}"?\n\nGoes to customers who haven't opted out, up to 90 per press. Nobody gets it twice.`)) return;
    try {
      const res = await apiClient.post<{ sent: number; remaining: number }>(`/admin/items/${item.id}/announce`);
      if (res.sent === 0 && res.remaining === 0) toast("Everyone has already been told about this one.");
      else if (res.remaining > 0) toast.success(`Sent to ${res.sent}. ${res.remaining} left: press Announce again tomorrow.`);
      else toast.success(`Announced to ${res.sent} customer${res.sent === 1 ? "" : "s"}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Announcement failed.");
    }
  }

  const saveButton = (
    <Button variant="dark" onClick={() => save()} disabled={!categories.length}>
      {item ? "Save changes" : "Add product"}
    </Button>
  );

  return (
    <>
      <PageHeader
        back={{ href: "/catalogue", label: "Products" }}
        title={item ? item.name : "Add a product"}
        subtitle={item ? `${item.categoryName ?? ""}${item.unitsOrdered != null ? ` · ${item.unitsOrdered} ordered so far` : ""}` : "Fill in the details, add photos and set the price or sizes."}
        actions={saveButton}
      />

      <DetailLayout
        main={
          <>
            <Panel title="Details">
              <div className="grid gap-4">
                <Input label="Name" value={form.name} onChange={(e) => set("name", e.target.value)} error={f.errors.name ?? undefined} placeholder="e.g. Carrot Wheat Cake" />
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-deep">Category</span>
                  <select
                    className={cn(selectClass, f.errors.categoryId && "border-danger")}
                    value={form.categoryId}
                    onChange={(e) => set("categoryId", e.target.value)}
                    aria-invalid={f.errors.categoryId ? true : undefined}
                  >
                    {!categories.length ? <option value="">Add a category first</option> : null}
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {f.errors.categoryId ? <span role="alert" className="text-xs font-semibold text-danger">{f.errors.categoryId}</span> : null}
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-deep">Description</span>
                  <textarea
                    className={textareaClass}
                    rows={4}
                    value={form.description}
                    onChange={(e) => set("description", e.target.value)}
                    placeholder="What makes it special: taste, ingredients, fibre…"
                  />
                </label>
              </div>
            </Panel>

            <Panel title="Photos">
              <ProductImagesField value={form.images} onChange={(images) => set("images", images)} />
            </Panel>

            <Panel title="Price & sizes">
              <div className="grid gap-4">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-deep">Sizes (optional)</span>
                  <textarea
                    className={cn(textareaClass, f.errors.sizes && "border-danger")}
                    rows={4}
                    placeholder={"1 piece = 1500\nPack of 3 = 4000\nPack of 6 = 8000"}
                    value={form.sizes}
                    aria-invalid={f.errors.sizes ? true : undefined}
                    onChange={(e) => {
                      set("sizes", e.target.value);
                      f.clear("basePrice");
                    }}
                  />
                  {f.errors.sizes ? (
                    <span role="alert" className="text-xs font-semibold text-danger">{f.errors.sizes}</span>
                  ) : (
                    <span className="text-xs text-deep/55">One size per line: name = price in naira. Leave empty for a single price.</span>
                  )}
                </label>
                {!form.sizes.trim() ? (
                  <Input
                    label="Price (₦)"
                    type="number"
                    min={0}
                    value={form.basePrice}
                    onChange={(e) => set("basePrice", e.target.value)}
                    error={f.errors.basePrice ?? undefined}
                    placeholder="2500"
                  />
                ) : variants?.length ? (
                  <ul className="divide-y divide-deep/5 rounded-xl border border-deep/10 text-sm">
                    {variants.map((v) => (
                      <li key={v.name} className="flex justify-between px-3 py-2">
                        <span>{v.name}</span>
                        <span className="font-semibold">{formatNgn(v.price)}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </Panel>
          </>
        }
        aside={
          <>
            <Panel title="Availability">
              <div className="grid gap-2">
                {STATUSES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    aria-pressed={form.status === s.value}
                    onClick={() => set("status", s.value)}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 text-left transition",
                      form.status === s.value ? "border-deep bg-deep text-white" : "border-deep/10 hover:border-deep/30",
                    )}
                  >
                    <span className="block text-sm font-semibold">{s.label}</span>
                    <span className={cn("block text-xs", form.status === s.value ? "text-white/70" : "text-deep/55")}>{s.hint}</span>
                  </button>
                ))}
              </div>
            </Panel>

            <Panel title="Visibility">
              <button
                type="button"
                onClick={() => set("active", !form.active)}
                className="flex w-full items-center gap-3 rounded-xl border border-deep/10 px-3 py-2.5 text-left hover:border-deep/30"
              >
                {form.active ? <Eye size={18} className="text-tea" /> : <EyeOff size={18} className="text-deep/45" />}
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-deep">{form.active ? "Shown on the menu" : "Hidden from the menu"}</span>
                  <span className="block text-xs text-deep/55">Tap to {form.active ? "hide" : "show"} it. Remember to save.</span>
                </span>
              </button>
            </Panel>

            <Panel title="Summary">
              <Fields
                items={[
                  { label: "Price", value: Number.isFinite(fromPrice) && fromPrice > 0 ? `${variants?.length ? "From " : ""}${formatNgn(fromPrice)}` : "—" },
                  { label: "Sizes", value: variants?.length ? variants.length : "Single price" },
                  { label: "Photos", value: form.images.filter(Boolean).length },
                  ...(item?.unitsOrdered != null ? [{ label: "Units ordered", value: item.unitsOrdered }] : []),
                ]}
              />
              <div className="mt-4 grid gap-2">
                {saveButton}
                {item ? (
                  <>
                    <Button variant="tertiary" leftIcon={<Megaphone size={15} />} onClick={() => announce()}>
                      Announce to customers
                    </Button>
                    <a
                      href={`${CUSTOMER_SITE}/pastries`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 py-1 text-xs font-semibold text-tea hover:text-deep"
                    >
                      <ExternalLink size={13} /> View on the menu
                    </a>
                  </>
                ) : null}
              </div>
            </Panel>
          </>
        }
      />
    </>
  );
}
