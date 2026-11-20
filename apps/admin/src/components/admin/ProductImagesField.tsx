"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ImagePlus, Link2, Loader2, Star, X } from "lucide-react";
import { uploadImage } from "@/lib/upload";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";

export const MAX_PRODUCT_IMAGES = 5; // 1 main + 4 more

/**
 * Product photos: the first image is the main one customers see on cards;
 * the rest show in the product gallery. Upload several at once, set any as
 * main, remove, or paste a URL.
 */
export function ProductImagesField({
  value,
  onChange,
}: {
  value: string[];
  onChange: (images: string[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [urlDraft, setUrlDraft] = useState("");
  const slotsLeft = MAX_PRODUCT_IMAGES - value.length;

  const addFiles = async (files: File[]) => {
    const take = files.slice(0, slotsLeft);
    if (files.length > take.length) toast(`Only ${MAX_PRODUCT_IMAGES} photos per product — extra files skipped`);
    if (!take.length) return;
    setUploading(take.length);
    let next = [...value];
    for (const file of take) {
      try {
        const url = await uploadImage(file, "catalogue");
        next = [...next, url];
        onChange(next);
      } catch (e) {
        toast(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const addUrl = () => {
    const url = urlDraft.trim();
    if (!url) return;
    if (!/^https?:\/\/|^\//.test(url)) {
      toast("Paste a full image link (https://…)");
      return;
    }
    if (slotsLeft <= 0) {
      toast(`Max ${MAX_PRODUCT_IMAGES} photos`);
      return;
    }
    onChange([...value, url]);
    setUrlDraft("");
  };

  const makeMain = (i: number) => onChange([value[i], ...value.filter((_, j) => j !== i)]);
  const remove = (i: number) => onChange(value.filter((_, j) => j !== i));

  return (
    <div className="text-sm">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="font-medium text-deep">Photos</span>
        <span className="text-xs text-deep/50">
          {value.length}/{MAX_PRODUCT_IMAGES} · first is the main photo
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        <AnimatePresence initial={false}>
          {value.map((src, i) => (
            <motion.div
              key={src}
              layout
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ type: "spring", visualDuration: 0.25, bounce: 0.2 }}
              className={cn(
                "group relative aspect-square overflow-hidden rounded-xl bg-off-white ring-2",
                i === 0 ? "ring-tea" : "ring-transparent",
              )}
            >
              <Image src={src} alt="" fill className="object-cover" unoptimized />
              {i === 0 ? (
                <span className="absolute left-1 top-1 rounded-full bg-tea px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                  Main
                </span>
              ) : (
                <button
                  type="button"
                  title="Set as main photo"
                  onClick={() => makeMain(i)}
                  className="absolute left-1 top-1 flex h-6 items-center gap-0.5 rounded-full bg-white/90 px-1.5 text-[9px] font-bold uppercase text-deep shadow"
                >
                  <Star className="h-3 w-3" /> Main
                </button>
              )}
              <button
                type="button"
                aria-label="Remove photo"
                onClick={() => remove(i)}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-deep shadow"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {Array.from({ length: uploading }, (_, i) => (
          <div key={`up-${i}`} className="flex aspect-square items-center justify-center rounded-xl bg-off-white">
            <Loader2 className="h-5 w-5 animate-spin text-tea" />
          </div>
        ))}

        {slotsLeft - uploading > 0 ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-deep/20 text-xs font-medium text-deep/60 transition hover:border-tea hover:text-tea"
          >
            <ImagePlus className="h-5 w-5" />
            {value.length ? "Add more" : "Add photos"}
          </button>
        ) : null}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => void addFiles(Array.from(e.target.files ?? []))}
      />

      {slotsLeft > 0 ? (
        <div className="mt-2 flex items-center gap-2">
          <span className="flex min-h-9 flex-1 items-center gap-2 rounded-lg border border-deep/20 bg-white px-2.5">
            <Link2 className="h-4 w-4 shrink-0 text-deep/40" />
            <input
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addUrl();
                }
              }}
              placeholder="…or paste an image link"
              className="w-full bg-transparent py-1.5 text-sm outline-none placeholder:text-deep/40"
            />
          </span>
          <button
            type="button"
            onClick={addUrl}
            className="h-9 rounded-lg border border-deep/20 px-3 text-sm font-medium text-deep hover:bg-deep/5"
          >
            Add
          </button>
        </div>
      ) : null}
    </div>
  );
}
