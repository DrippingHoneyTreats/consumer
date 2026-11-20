"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Package } from "lucide-react";
import { apiClient } from "@/lib/api";
import { asArray } from "@/lib/data";
import type { AdminCategory, Item } from "@/lib/types";
import { formatNgn } from "@/lib/format";
import { ITEM_PLACEHOLDER, LOGO } from "@/lib/placeholders";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, selectClass, textareaClass } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { ColumnLoader } from "@/components/ui/ColumnLoader";
import { AdminPageTitle } from "@/components/admin/AdminPageTitle";
import { AdminCardList } from "@/components/admin/AdminTable";
import { ImageField } from "@/components/admin/ImageField";
import { ProductImagesField } from "@/components/admin/ProductImagesField";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { checkRequired, useFieldErrors } from "@/lib/validate";

type ItemForm = {
  categoryId: string;
  name: string;
  basePrice: string;
  description: string;
  /** First = main photo; up to 4 more for the gallery. */
  images: string[];
  /** One size per line: "Pack of 3 = 4000" (naira). */
  sizes: string;
};

function sizesToText(item: Item): string {
  return (item.variants ?? []).map((v) => `${v.name} = ${v.price / 100}`).join("\n");
}

/** Parse the sizes box; keeps existing variant ids (by name) so carts don't break. */
function parseSizes(text: string, existing: Item["variants"] = []): { name: string; price: number; id?: string }[] | null {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const out: { name: string; price: number; id?: string }[] = [];
  for (const line of lines) {
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

const blankItem = (categoryId = ""): ItemForm => ({
  categoryId,
  name: "",
  basePrice: "",
  description: "",
  images: [],
  sizes: "",
});

export default function AdminCataloguePage() {
  const f = useFieldErrors();
  const cf = useFieldErrors();
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [catForm, setCatForm] = useState({ name: "", slug: "", image: "" });
  const [itemForm, setItemForm] = useState<ItemForm>(blankItem());
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const catsRes = await apiClient.get<AdminCategory[] | { data: AdminCategory[] }>("/admin/categories");
      const cats = asArray<AdminCategory>(catsRes);
      setCategories(cats);

      const allItems: Item[] = [];
      for (const cat of cats) {
        const listRes = await apiClient.get<Item[] | { data: Item[] }>(`/categories/${cat.id}/items`);
        allItems.push(...asArray<Item>(listRes));
      }
      setItems(allItems);
      setItemForm((f) => (f.categoryId || !cats[0] ? f : { ...f, categoryId: cats[0].id }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Catalogue load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const [announcing, setAnnouncing] = useState<string | null>(null);

  /** "New on the menu" email to opted-in customers (90 per press; repeat to continue). */
  const announce = async (item: Item) => {
    if (!window.confirm(`Email customers about "${item.name}"?\n\nIt goes to customers who haven't opted out, up to 90 per press. Nobody gets it twice.`)) return;
    setAnnouncing(item.id);
    try {
      const res = await apiClient.post<{ sent: number; remaining: number; total: number }>(`/admin/items/${item.id}/announce`);
      if (res.sent === 0 && res.remaining === 0) toast("Everyone has already been told about this one");
      else if (res.remaining > 0) toast.success(`Sent to ${res.sent}. ${res.remaining} left: press Announce again tomorrow`);
      else toast.success(`Announced to ${res.sent} customer${res.sent === 1 ? "" : "s"}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Announcement failed");
    } finally {
      setAnnouncing(null);
    }
  };

  const toggleSoldOut = async (item: Item) => {
    const next = item.status === "sold_out" ? "available" : "sold_out";
    try {
      await apiClient.patch(`/admin/items/${item.id}`, {
        categoryId: item.categoryId,
        name: item.name,
        basePrice: item.basePrice,
        status: next,
        images: item.images,
      });
      toast.success(next === "sold_out" ? "Marked sold out" : "Back in stock");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  const saveCategory = async () => {
    if (!cf.validate({ catName: checkRequired(catForm.name, "Give the category a name.") })) return;
    try {
      await apiClient.post("/admin/categories", {
        name: catForm.name.trim(),
        slug: catForm.slug.trim() || undefined,
        image: catForm.image.trim() || undefined,
      });
      setCatForm({ name: "", slug: "", image: "" });
      toast.success("Category created");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create category");
    }
  };

  const saveItem = async () => {
    const variants = parseSizes(itemForm.sizes, editingItem?.variants);
    const basePrice = variants?.length
      ? Math.min(...variants.map((v) => v.price))
      : Math.round(Number(itemForm.basePrice) * 100);
    const ok = f.validate({
      categoryId: itemForm.categoryId ? null : "Choose a category.",
      name: checkRequired(itemForm.name, "Give the product a name."),
      sizes: !variants ? 'Write one size per line, like "Pack of 3 = 4000".' : null,
      basePrice:
        variants && !variants.length && (!itemForm.basePrice.trim() || !Number.isFinite(basePrice) || basePrice <= 0)
          ? "Enter a price in naira, e.g. 2500 (or add sizes above)."
          : null,
    });
    if (!ok || !variants) {
      toast.error("Please fix the highlighted fields.");
      return;
    }
    const images = itemForm.images.filter(Boolean);
    const body = {
      categoryId: itemForm.categoryId,
      name: itemForm.name.trim(),
      description: itemForm.description.trim() || undefined,
      basePrice,
      images,
      variants,
      status: editingItem?.status ?? "available",
    };
    try {
      if (editingItem) {
        await apiClient.patch(`/admin/items/${editingItem.id}`, body);
        toast.success("Item updated");
      } else {
        await apiClient.post("/admin/items", body);
        toast.success("Item created");
      }
      setEditingItem(null);
      setItemForm(blankItem(itemForm.categoryId));
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  return (
    <>
      <AdminPageTitle title="Catalogue" />
      <p className="mb-4 max-w-2xl text-sm text-deep/60">
        Categories and products you add here power the customer app. Until something is uploaded, customers see an empty menu.
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-deep/10 bg-white p-4">
          <h2 className="font-semibold">Categories</h2>
          {loading ? (
            <div className="mt-3">
              <ColumnLoader columns={1} count={3} aspect="h-12 aspect-auto" cellClassName="rounded-xl" />
            </div>
          ) : categories.length === 0 ? (
            <EmptyState
              compact
              className="mt-3"
              image={LOGO}
              title="No categories yet"
              message="Add a category first, then upload products under it."
            />
          ) : (
            <AdminCardList
              items={categories.map((c) => ({
                id: c.id,
                content: (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="relative h-10 w-10 overflow-hidden rounded-xl bg-blush-soft">
                        <Image src={c.image || ITEM_PLACEHOLDER} alt="" fill className="object-cover" unoptimized />
                      </span>
                      <span>
                        <span className="block font-medium">{c.name}</span>
                        <span className="text-xs text-deep/50">{c.slug}</span>
                      </span>
                    </div>
                  </div>
                ),
              }))}
            />
          )}
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Input
              label="Name"
              value={catForm.name}
              onChange={(e) => {
                setCatForm({ ...catForm, name: e.target.value });
                cf.clear("catName");
              }}
              error={cf.errors.catName ?? undefined}
            />
            <Input label="Slug (optional)" value={catForm.slug} onChange={(e) => setCatForm({ ...catForm, slug: e.target.value })} />
            <div className="sm:col-span-2">
              <ImageField
                label="Image"
                hint="Shown on the customer menu"
                value={catForm.image}
                onChange={(url) => setCatForm({ ...catForm, image: url })}
              />
            </div>
          </div>
          <Button className="mt-3" onClick={() => saveCategory()}>
            Add category
          </Button>
        </section>

        <section className="rounded-2xl border border-deep/10 bg-white p-4">
          <h2 className="font-semibold">{editingItem ? "Edit product" : "Upload product"}</h2>
          <div className="mt-3 grid gap-2">
            <label className="text-sm">
              <span className="font-medium">Category</span>
              <select
                className={cn(selectClass, "mt-1")}
                value={itemForm.categoryId}
                onChange={(e) => {
                  setItemForm({ ...itemForm, categoryId: e.target.value });
                  f.clear("categoryId");
                }}
                aria-invalid={f.errors.categoryId ? true : undefined}
                disabled={!categories.length}
              >
                {!categories.length ? <option value="">Add a category first</option> : null}
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            {f.errors.categoryId ? <p role="alert" data-invalid="true" className="text-xs font-semibold text-danger">{f.errors.categoryId}</p> : null}
            <Input
              label="Name"
              value={itemForm.name}
              onChange={(e) => {
                setItemForm({ ...itemForm, name: e.target.value });
                f.clear("name");
              }}
              error={f.errors.name ?? undefined}
            />
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-deep">Sizes &amp; prices (₦)</span>
              <textarea
                className={textareaClass}
                rows={4}
                placeholder={"1 piece = 1500\nPack of 3 = 4000\nPack of 6 = 8000"}
                value={itemForm.sizes}
                aria-invalid={f.errors.sizes ? true : undefined}
                onChange={(e) => {
                  setItemForm({ ...itemForm, sizes: e.target.value });
                  f.clear("sizes");
                  f.clear("basePrice");
                }}
              />
              {f.errors.sizes ? (
                <span role="alert" className="text-xs font-semibold text-danger">{f.errors.sizes}</span>
              ) : (
                <span className="text-xs text-deep/55">One per line. Leave empty to use a single price.</span>
              )}
            </label>
            {!itemForm.sizes.trim() ? (
              <Input
                label="Price (₦)"
                type="number"
                value={itemForm.basePrice}
                onChange={(e) => {
                  setItemForm({ ...itemForm, basePrice: e.target.value });
                  f.clear("basePrice");
                }}
                error={f.errors.basePrice ?? undefined}
              />
            ) : null}
            <ProductImagesField
              value={itemForm.images}
              onChange={(images) => setItemForm((f) => ({ ...f, images }))}
            />
            <Input
              label="Description"
              value={itemForm.description}
              onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
            />
          </div>
          <div className="mt-3 flex gap-2">
            <Button onClick={() => saveItem()} disabled={!categories.length}>
              {editingItem ? "Save changes" : "Upload product"}
            </Button>
            {editingItem ? (
              <Button
                variant="ghost"
                onClick={() => {
                  setEditingItem(null);
                  setItemForm(blankItem(itemForm.categoryId));
                }}
              >
                Cancel
              </Button>
            ) : null}
          </div>
        </section>
      </div>

      <section className="mt-6">
        <h2 className="mb-3 font-semibold">Products</h2>
        {loading ? (
          <ColumnLoader columns={1} count={4} aspect="h-16 aspect-auto" className="md:grid-cols-2" />
        ) : items.length === 0 ? (
          <EmptyState
            compact
            image={LOGO}
            icon={<Package size={22} />}
            title="No products yet"
            message="Upload a product above. The customer menu stays empty until then."
          />
        ) : (
          <AdminCardList
            items={items.map((item) => ({
              id: item.id,
              content: (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="relative h-12 w-12 overflow-hidden rounded-xl bg-blush-soft">
                      <Image
                        src={item.images?.[0] || ITEM_PLACEHOLDER}
                        alt=""
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </span>
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-deep/60">{formatNgn(item.basePrice)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge status={item.status} />
                    <Button variant="secondary" onClick={() => toggleSoldOut(item)}>
                      {item.status === "sold_out" ? "Restock" : "Sold out"}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setEditingItem(item);
                        setItemForm({
                          categoryId: item.categoryId,
                          name: item.name,
                          basePrice: String(item.basePrice / 100),
                          description: item.description ?? "",
                          images: item.images ?? [],
                          sizes: sizesToText(item),
                        });
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      loading={announcing === item.id}
                      onClick={() => announce(item)}
                      title="Email customers about this product"
                    >
                      Announce
                    </Button>
                  </div>
                </div>
              ),
            }))}
          />
        )}
      </section>
    </>
  );
}
