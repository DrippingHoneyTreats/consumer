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
import { Input, selectClass } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { ColumnLoader } from "@/components/ui/ColumnLoader";
import { AdminPageTitle } from "@/components/admin/AdminPageTitle";
import { AdminCardList } from "@/components/admin/AdminTable";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";

type ItemForm = {
  categoryId: string;
  name: string;
  basePrice: string;
  description: string;
  image: string;
};

const blankItem = (categoryId = ""): ItemForm => ({
  categoryId,
  name: "",
  basePrice: "",
  description: "",
  image: "",
});

export default function AdminCataloguePage() {
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
      toast(e instanceof Error ? e.message : "Catalogue load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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
      toast(next === "sold_out" ? "Marked sold out" : "Back in stock");
      void load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Update failed");
    }
  };

  const saveCategory = async () => {
    if (!catForm.name.trim()) return;
    try {
      await apiClient.post("/admin/categories", {
        name: catForm.name.trim(),
        slug: catForm.slug.trim() || undefined,
        image: catForm.image.trim() || undefined,
      });
      setCatForm({ name: "", slug: "", image: "" });
      toast("Category created");
      void load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not create category");
    }
  };

  const saveItem = async () => {
    const basePrice = Math.round(Number(itemForm.basePrice) * 100);
    if (!itemForm.name.trim() || !itemForm.categoryId || !Number.isFinite(basePrice)) {
      toast("Name, category and price required");
      return;
    }
    const images = itemForm.image.trim()
      ? [itemForm.image.trim()]
      : editingItem?.images?.length
        ? editingItem.images
        : [];
    const body = {
      categoryId: itemForm.categoryId,
      name: itemForm.name.trim(),
      description: itemForm.description.trim() || undefined,
      basePrice,
      images,
      status: editingItem?.status ?? "available",
    };
    try {
      if (editingItem) {
        await apiClient.patch(`/admin/items/${editingItem.id}`, body);
        toast("Item updated");
      } else {
        await apiClient.post("/admin/items", body);
        toast("Item created");
      }
      setEditingItem(null);
      setItemForm(blankItem(itemForm.categoryId));
      void load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Save failed");
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
            <Input label="Name" value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} />
            <Input label="Slug (optional)" value={catForm.slug} onChange={(e) => setCatForm({ ...catForm, slug: e.target.value })} />
            <div className="sm:col-span-2">
              <Input
                label="Image URL"
                hint="Shown on the customer menu"
                value={catForm.image}
                onChange={(e) => setCatForm({ ...catForm, image: e.target.value })}
              />
            </div>
          </div>
          <Button className="mt-3" onClick={() => void saveCategory()}>
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
                onChange={(e) => setItemForm({ ...itemForm, categoryId: e.target.value })}
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
            <Input label="Name" value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} />
            <Input
              label="Price (₦)"
              type="number"
              value={itemForm.basePrice}
              onChange={(e) => setItemForm({ ...itemForm, basePrice: e.target.value })}
            />
            <Input
              label="Image URL"
              hint="Product photo customers see"
              value={itemForm.image}
              onChange={(e) => setItemForm({ ...itemForm, image: e.target.value })}
            />
            <Input
              label="Description"
              value={itemForm.description}
              onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
            />
          </div>
          <div className="mt-3 flex gap-2">
            <Button onClick={() => void saveItem()} disabled={!categories.length}>
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
                    <Button variant="secondary" onClick={() => void toggleSoldOut(item)}>
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
                          image: item.images?.[0] ?? "",
                        });
                      }}
                    >
                      Edit
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
