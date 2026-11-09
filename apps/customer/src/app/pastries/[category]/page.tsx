"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ShoppingBag } from "lucide-react";
import { getCategoryItems } from "@/lib/catalogue";
import type { CatalogueItem } from "@/lib/catalogue-types";
import { categoryImage, LOGO } from "@/lib/placeholders";
import { titleFromSlug } from "@/lib/format";
import { useScrolledPast } from "@/hooks/useAppScroll";
import { ProductCard } from "@/components/catalogue/ProductCard";
import { ItemAddSheet } from "@/components/catalogue/ItemAddSheet";
import { EmptyState, OfflineState } from "@/components/ui/EmptyState";
import { ColumnLoader } from "@/components/ui/ColumnLoader";
import { useCartActions } from "@/hooks/useCartActions";

export default function CategoryItemsPage() {
  const { category } = useParams<{ category: string }>();
  const { addItem } = useCartActions();

  const [items, setItems] = useState<CatalogueItem[]>([]);
  const [title, setTitle] = useState(() => titleFromSlug(category));
  const [tagline, setTagline] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [selected, setSelected] = useState<CatalogueItem | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const compact = useScrolledPast(200);
  const loading = state === "loading";

  const load = useCallback(async () => {
    setState("loading");
    try {
      const { category: cat, items: list } = await getCategoryItems(category);
      setItems(list);
      if (cat) {
        setTitle(cat.name);
        setImage(cat.image ?? null);
        setTagline(cat.tagline ?? null);
      }
      setState("ready");
      const wanted = new URLSearchParams(window.location.search).get("item");
      const match = wanted ? list.find((i) => i.id === wanted) : undefined;
      if (match) {
        setSelected(match);
        setSheetOpen(true);
      }
    } catch {
      setState("error");
    }
  }, [category]);

  useEffect(() => {
    void load();
  }, [load]);

  function openItem(item: CatalogueItem) {
    setSelected(item);
    setSheetOpen(true);
  }

  return (
    <div className="page-pad">
      <AnimatePresence>
        {compact ? (
          <motion.div
            initial={{ y: -70, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -70, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="glass fixed left-1/2 top-0 z-30 flex w-full max-w-[var(--app-max)] -translate-x-1/2 items-center gap-3 border-b border-white/70 px-4 pb-2.5 pt-[calc(10px+var(--safe-top))] shadow-[0_10px_24px_-18px_rgba(63,95,70,0.5)] md:px-6 lg:px-8"
          >
            <Link
              href="/pastries"
              aria-label="Back to pastries"
              className="pressable flex h-10 w-10 items-center justify-center rounded-full bg-white text-deep shadow-sm"
            >
              <ChevronLeft size={19} />
            </Link>
            <span className="relative h-9 w-9 overflow-hidden rounded-xl bg-blush-soft">
              <Image src={categoryImage({ slug: category, image })} alt="" fill className="object-cover" sizes="36px" unoptimized />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-display text-lg leading-tight text-deep">{title}</span>
              <span className="block text-[11px] text-deep/55">{items.length} treats</span>
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative mb-5 min-h-[220px] overflow-hidden rounded-[30px] bg-hero p-4 shadow-[var(--shadow-card)] md:min-h-[260px]"
      >
        <Link
          href="/pastries"
          aria-label="Back to pastries"
          className="glass pressable relative z-10 flex h-11 w-11 items-center justify-center rounded-full text-deep"
        >
          <ChevronLeft size={20} />
        </Link>
        <div className="relative z-10 mt-8 max-w-[55%]">
          <h1 className="font-display text-[32px] leading-tight text-deep md:text-[40px]">{title}</h1>
          <p className="mt-1 text-xs text-deep/60 md:text-sm">
            {loading ? "Loading treats…" : tagline || `${items.length} treat${items.length === 1 ? "" : "s"} available`}
          </p>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.8, rotate: -8 }}
          animate={{ opacity: 1, scale: 1, rotate: 6 }}
          transition={{ type: "spring", stiffness: 160, damping: 16, delay: 0.1 }}
          className="absolute -right-4 bottom-4 top-6 w-[46%]"
        >
          <div className="animate-float relative h-full w-full overflow-hidden rounded-[28px] shadow-[var(--shadow-float)] ring-4 ring-white/70">
            <Image
              src={categoryImage({ slug: category, image })}
              alt=""
              fill
              className="object-cover"
              sizes="220px"
              unoptimized
              priority
            />
          </div>
        </motion.div>
      </motion.section>

      {state === "error" ? (
        <OfflineState onRetry={() => void load()} />
      ) : loading ? (
        <ColumnLoader columns={4} count={6} aspect="aspect-[3/4]" />
      ) : items.length === 0 ? (
        <EmptyState
          image={LOGO}
          title="No products yet"
          message="Nothing in this category right now. Check back shortly or explore other treats."
          actionHref="/pastries"
          actionLabel="Browse pastries"
          icon={<ShoppingBag size={28} />}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 md:gap-4">
          {items.map((item, i) => (
            <ProductCard
              key={item.id}
              item={item}
              index={i}
              onOpen={() => openItem(item)}
              onAdd={() => openItem(item)}
            />
          ))}
        </div>
      )}

      <ItemAddSheet
        item={selected}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onConfirm={(opts) => {
          if (selected) void addItem({ item: selected, ...opts });
        }}
      />
    </div>
  );
}
