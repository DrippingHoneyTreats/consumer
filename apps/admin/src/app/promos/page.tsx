"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import { asArray } from "@/lib/data";
import type { AdminBanner } from "@/lib/types";
import { LOGO } from "@/lib/placeholders";
import { Button } from "@/components/ui/Button";
import { Input, textareaClass } from "@/components/ui/Input";
import { EmptyState, OfflineState } from "@/components/ui/EmptyState";
import { ColumnLoader } from "@/components/ui/ColumnLoader";
import { PageHeader } from "@/components/admin/kit";
import { ImageField } from "@/components/admin/ImageField";
import { AdminTable } from "@/components/admin/AdminTable";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { checkLink, checkRequired, useFieldErrors } from "@/lib/validate";

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
  const f = useFieldErrors();
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
    const ok = f.validate({
      title: checkRequired(form.title, "Give the promo a title."),
      image: checkRequired(form.image, "Upload an image for the promo."),
      priority: form.priority.trim() && !/^-?\d+$/.test(form.priority.trim()) ? "Priority must be a whole number." : null,
      ctaTarget: checkLink(form.ctaTarget),
      ctaLabel: form.ctaTarget.trim() && !form.ctaLabel.trim() ? "Add button text for the link, e.g. Order now." : null,
    });
    if (!ok) {
      toast.error("Please fix the highlighted fields.");
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
        toast.success("Promo updated");
      } else {
        await apiClient.post("/admin/banners", body);
        toast.success("Promo created");
      }
      setForm(emptyForm);
      setEditId(null);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  return (
    <>
      <PageHeader title="Promos" subtitle="Banners shown on the customer home page. Higher priority shows first." />
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
          <Input
            label="Title"
            value={form.title}
            onChange={(e) => {
              setForm({ ...form, title: e.target.value });
              f.clear("title");
            }}
            error={f.errors.title ?? undefined}
          />
          <Input
            label="Subtitle"
            placeholder="Short line under the title"
            value={form.subtitle}
            onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
          />
          <div className="space-y-1">
            <ImageField
              label="Image"
              folder="banners"
              value={form.image}
              onChange={(url) => {
                setForm({ ...form, image: url });
                f.clear("image");
              }}
            />
            {f.errors.image ? <p role="alert" data-invalid="true" className="text-xs font-semibold text-danger">{f.errors.image}</p> : null}
          </div>
          <Input
            label="Priority"
            type="number"
            hint="Higher shows first"
            value={form.priority}
            onChange={(e) => {
              setForm({ ...form, priority: e.target.value });
              f.clear("priority");
            }}
            error={f.errors.priority ?? undefined}
          />
          <Input
            label="CTA label"
            placeholder="e.g. Order now"
            value={form.ctaLabel}
            onChange={(e) => {
              setForm({ ...form, ctaLabel: e.target.value });
              f.clear("ctaLabel");
            }}
            error={f.errors.ctaLabel ?? undefined}
          />
          <Input
            label="CTA link"
            placeholder="/pastries or https://…"
            value={form.ctaTarget}
            onChange={(e) => {
              setForm({ ...form, ctaTarget: e.target.value });
              f.clear("ctaTarget");
            }}
            error={f.errors.ctaTarget ?? undefined}
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
          <Button onClick={() => save()}>{editId ? "Save" : "Create"}</Button>
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
        <ColumnLoader columns={1} count={4} aspect="h-14 aspect-auto" />
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
