"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import { asArray } from "@/lib/data";
import type { AdminBanner } from "@/lib/types";
import { LOGO } from "@/lib/placeholders";
import { Button } from "@/components/ui/Button";
import { Input, textareaClass } from "@/components/ui/Input";
import { EmptyState, OfflineState } from "@/components/ui/EmptyState";
import { AdminPageTitle } from "@/components/admin/AdminPageTitle";
import { AdminTable } from "@/components/admin/AdminTable";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";

const emptyForm = {
  title: "",
  subtitle: "",
  description: "",
  image: "",
  ctaLabel: "",
  ctaTarget: "",
  priority: "0",
  active: true,
};

export default function AdminPromosPage() {
  const [banners, setBanners] = useState<AdminBanner[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(async () => {
    setState("loading");
    try {
      const list = await apiClient.get<AdminBanner[] | { data: AdminBanner[] }>("/admin/banners");
      setBanners(asArray(list));
      setState("ready");
    } catch {
      setBanners([]);
      setState("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!form.title.trim() || !form.image.trim()) {
      toast("Title and image URL are required");
      return;
    }
    const body = {
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || undefined,
      description: form.description.trim() || undefined,
      image: form.image.trim(),
      ctaLabel: form.ctaLabel.trim() || undefined,
      ctaTarget: form.ctaTarget.trim() || undefined,
      ctaType: form.ctaTarget.trim() ? "url" : "none",
      priority: Number(form.priority) || 0,
      active: form.active,
    };
    try {
      if (editId) {
        await apiClient.patch(`/admin/banners/${editId}`, body);
        toast("Promo updated");
      } else {
        await apiClient.post("/admin/banners", body);
        toast("Promo created");
      }
      setForm(emptyForm);
      setEditId(null);
      void load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Save failed");
    }
  };

  return (
    <>
      <AdminPageTitle title="Promos" />
      <p className="mb-4 max-w-2xl text-sm text-deep/60">
        Upload promo banners for the customer home. The customer app shows an empty slot until an active promo exists.
      </p>

      {state === "error" ? (
        <div className="mb-6">
          <OfflineState compact onRetry={() => void load()} />
        </div>
      ) : null}

      <div className="mb-6 rounded-2xl border border-deep/10 bg-white p-4">
        <h2 className="font-semibold text-deep">{editId ? "Edit promo" : "New promo"}</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Input
            label="Subtitle"
            placeholder="Short line under the title"
            value={form.subtitle}
            onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
          />
          <Input
            label="Image URL"
            placeholder="https://… or /assets/…"
            value={form.image}
            onChange={(e) => setForm({ ...form, image: e.target.value })}
          />
          <Input
            label="Priority"
            type="number"
            hint="Higher shows first"
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
          />
          <Input
            label="CTA label"
            placeholder="e.g. Order now"
            value={form.ctaLabel}
            onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })}
          />
          <Input
            label="CTA link"
            placeholder="/pastries or https://…"
            value={form.ctaTarget}
            onChange={(e) => setForm({ ...form, ctaTarget: e.target.value })}
          />
        </div>
        <label className="mt-3 block text-sm">
          <span className="mb-1.5 block pl-1 font-semibold text-deep">Description</span>
          <textarea
            className={cn(textareaClass, "min-h-[88px]")}
            placeholder="Promo details customers should know"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </label>
        <label className="mt-2 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
          Active on customer home
        </label>
        <div className="mt-3 flex gap-2">
          <Button onClick={() => void save()}>{editId ? "Save" : "Create"}</Button>
          {editId ? (
            <Button
              variant="ghost"
              onClick={() => {
                setEditId(null);
                setForm(emptyForm);
              }}
            >
              Cancel
            </Button>
          ) : null}
        </div>
      </div>

      {state === "loading" ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="skeleton h-14 rounded-2xl" />
          ))}
        </div>
      ) : banners.length === 0 ? (
        <EmptyState
          compact
          image={LOGO}
          title="No promos yet"
          message="Create one above. Customer home stays empty until an active promo exists."
        />
      ) : (
        <AdminTable
          columns={[
            { key: "title", label: "Title" },
            { key: "subtitle", label: "Subtitle" },
            { key: "priority", label: "Priority" },
            { key: "active", label: "Active" },
            { key: "actions", label: "" },
          ]}
          rows={banners.map((b) => ({
            id: b.id,
            cells: [
              b.title,
              b.subtitle || "—",
              b.priority ?? 0,
              b.active === false ? "No" : "Yes",
              <Button
                key="edit"
                variant="ghost"
                onClick={() => {
                  setEditId(b.id);
                  setForm({
                    title: b.title,
                    subtitle: b.subtitle ?? "",
                    description: b.description ?? "",
                    image: b.image,
                    ctaLabel: b.ctaLabel ?? "",
                    ctaTarget: b.ctaTarget ?? "",
                    priority: String(b.priority ?? 0),
                    active: b.active !== false,
                  });
                }}
              >
                Edit
              </Button>,
            ],
          }))}
        />
      )}
    </>
  );
}
