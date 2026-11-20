"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImageUp } from "lucide-react";
import { uploadImage } from "@/lib/upload";
import { Input } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";

/** Single image: URL input + "Upload" (Cloudinary, or Supabase Storage as fallback). */
export function ImageField({
  label,
  hint,
  value,
  onChange,
  folder = "catalogue",
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (url: string) => void;
  folder?: "catalogue" | "banners";
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      onChange(await uploadImage(file, folder));
      toast("Photo uploaded");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="flex items-end gap-2">
      {value ? (
        <span className="relative mb-0.5 h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-off-white">
          <Image src={value} alt="" fill className="object-cover" unoptimized />
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <Input label={label} hint={hint} value={value} placeholder="https://…" onChange={(e) => onChange(e.target.value)} />
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
        }}
      />
      <button
        type="button"
        disabled={uploading}
        onClick={() => fileRef.current?.click()}
        className="mb-0.5 inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-deep/20 bg-white px-3 text-sm font-medium text-deep transition hover:bg-deep/5 disabled:opacity-50"
        style={hint ? { marginBottom: "1.4rem" } : undefined}
      >
        <ImageUp className="h-4 w-4" />
        {uploading ? "Uploading…" : "Upload"}
      </button>
    </div>
  );
}
