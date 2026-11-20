"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, BadgeCheck, ChevronLeft, Heart, Inbox, Leaf, ShoppingBag, Truck } from "lucide-react";
import { getCategoryItems, needsOptions } from "@/lib/catalogue";
import type { CatalogueItem } from "@/lib/catalogue-types";
import { categoryImage, ITEM_PLACEHOLDER } from "@/lib/placeholders";
import { contactLink, formatNgn, titleFromSlug } from "@/lib/format";
import { useScrolledPast } from "@/hooks/useAppScroll";
import { ItemAddSheet } from "@/components/catalogue/ItemAddSheet";
import { EmptyState, OfflineState } from "@/components/ui/EmptyState";
import { ColumnLoader } from "@/components/ui/ColumnLoader";
import { useCartActions } from "@/hooks/useCartActions";
import { cn } from "@/lib/cn";
import { ProductCard } from "@/components/catalogue/ProductCard";
import { ArrowPill, CtaBanner, SectionIntro, TrustStrip } from "@/components/editorial/Editorial";
import { SwipeDeck } from "@/components/editorial/SwipeDeck";

const valueBar = [
  { icon: Leaf, title: "Quality Ingredients", blurb: "Whole grains & real fibre", tone: "bg-sage-soft text-tea" },
  { icon: Heart, title: "Handcrafted with Love", blurb: "Baked fresh in Lagos", tone: "bg-blush-soft text-[#c47b62]" },
  { icon: Truck, title: "Fresh Delivery", blurb: "Doorstep, same-day ready", tone: "bg-sage-soft text-tea" },
  { icon: BadgeCheck, title: "100% Satisfaction", blurb: "Treats you’ll reorder", tone: "bg-blush-soft text-[#c47b62]" },
];

export function CategoryView() {
  const { category } = useParams<{ category: string }>();
  const { addItem } = useCartActions();

  const [items, setItems] = useState<CatalogueItem[]>([]);
  const [title, setTitle] = useState(() => titleFromSlug(category));
  const [tagline, setTagline] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [selected, setSelected] = useState<CatalogueItem | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const compact = useScrolledPast(180);
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

  const [featA, featB, featC, featD, ...rest] = items;

  return (
    <div className="page-pad bg-[#fdf8f5]">
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
            <span className="relative h-9 w-9 overflow-hidden rounded-2xl bg-blush-soft">
              <Image src={categoryImage({ slug: category, image })} alt="" fill className="object-cover" sizes="36px" unoptimized />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-display text-lg leading-tight text-deep">{title}</span>
              <span className="block text-[11px] text-deep/55">{items.length} treats</span>
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="mb-5 flex items-center gap-3">
        <Link
          href="/pastries"
          aria-label="Back to pastries"
          className="pressable flex h-11 w-11 items-center justify-center rounded-full bg-white text-deep shadow-[var(--shadow-card)]"
        >
          <ChevronLeft size={20} />
        </Link>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#c47b62]">Collection</p>
          <h1 className="font-display text-[28px] leading-tight text-deep md:text-[34px]">{title}</h1>
          {tagline ? <p className="mt-0.5 truncate text-sm text-deep/55">{tagline}</p> : null}
        </div>
      </div>

      {state === "error" ? (
        <OfflineState onRetry={() => void load()} />
      ) : loading ? (
        <ColumnLoader columns={2} count={6} aspect="aspect-[4/5]" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Inbox size={56} strokeWidth={1.4} />}
          title="Uh-oh! 👀"
          message="Looks like there's nothing here yet."
          actionHref="/pastries"
          actionLabel="Browse pastries"
          actionIcon={<ShoppingBag size={16} />}
        />
      ) : (
        <>
          {/* Phones: every treat in one swipeable deck */}
          <SwipeDeck
            className="mb-10"
            tone="none"
            label={title}
            items={items.map((item, i) => (
              <div key={item.id} className="mx-auto w-full max-w-[300px]">
                <ProductCard item={item} index={i} layout="grid" onOpen={() => openItem(item)} onAdd={() => (needsOptions(item) ? openItem(item) : void addItem({ item }))} />
              </div>
            ))}
          />

          {/* Bento featured treats (tablet/desktop) */}
          <section className="mb-8 hidden gap-3 md:grid md:grid-cols-4 md:gap-4">
            {featA ? (
              <button
                type="button"
                onClick={() => openItem(featA)}
                className="pressable group relative col-span-2 row-span-2 min-h-[260px] overflow-hidden rounded-[28px] bg-sage-soft p-5 text-left shadow-[var(--shadow-card)] md:min-h-[360px] md:p-6"
              >
                <div className="relative z-10 max-w-[52%] md:max-w-[44%]">
                  <p className="font-display text-[22px] leading-tight text-deep sm:text-2xl md:text-[34px]">
                    Start Your Day the{" "}
                    <span className="italic text-[#c47b62]">Sweet</span> Way
                  </p>
                  <p className="mt-2 text-sm text-deep/60">{featA.name}</p>
                  <p className="mt-1 line-clamp-3 text-xs text-deep/45">{featA.description || tagline}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#c47b62]">
                    Explore {title} <ArrowRight size={14} />
                  </span>
                </div>
                <span className="absolute -bottom-4 -right-3 h-[64%] w-[44%] overflow-hidden rounded-[28px] shadow-[var(--shadow-float)] ring-4 ring-white/80 transition duration-500 group-hover:scale-[1.03] md:h-[72%] md:w-[52%] md:rounded-[32px]">
                  <Image
                    src={featA.images?.[0] || ITEM_PLACEHOLDER}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="360px"
                    unoptimized
                    priority
                  />
                </span>
              </button>
            ) : null}

            {featB ? (
              <button
                type="button"
                onClick={() => openItem(featB)}
                className={cn(
                  "pressable group relative col-span-2 min-h-[150px] overflow-hidden rounded-[28px] bg-[#f9e2db] p-5 text-left shadow-[var(--shadow-card)] md:min-h-[170px]",
                  !featC && "md:row-span-2",
                )}
              >
                <div className="relative z-10 max-w-[56%] md:max-w-[55%]">
                  <p className="font-display text-xl text-deep md:text-2xl">{featB.name}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-deep/55 md:text-sm">
                    {featB.description || "A favourite from this collection"}
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#c47b62]">
                    Order Now <ArrowRight size={14} />
                  </span>
                </div>
                <span className="absolute -bottom-2 -right-2 h-24 w-24 overflow-hidden rounded-[22px] ring-4 ring-white/80 sm:h-28 sm:w-28 md:h-36 md:w-36">
                  <Image
                    src={featB.images?.[0] || ITEM_PLACEHOLDER}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="144px"
                    unoptimized
                  />
                </span>
              </button>
            ) : null}

            {[featC, featD].filter(Boolean).map((item, i) =>
              item ? (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openItem(item)}
                  className={cn(
                    "pressable group relative aspect-[4/5] overflow-hidden rounded-[24px] p-4 text-left shadow-[var(--shadow-card)] md:aspect-auto md:min-h-[170px]",
                    i % 2 === 0 ? "bg-sage-soft" : "bg-[#f7e8df]",
                    !featD && "col-span-2 aspect-[2/1]",
                  )}
                >
                  <span className="relative z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-deep shadow-sm">
                    <Heart size={14} className="text-[#c47b62]" />
                  </span>
                  <span className="absolute inset-x-3 bottom-[34%] top-12 overflow-hidden rounded-[20px] md:bottom-[38%]">
                    <Image
                      src={item.images?.[0] || ITEM_PLACEHOLDER}
                      alt=""
                      fill
                      className="object-cover transition duration-500 group-hover:scale-105"
                      sizes="200px"
                      unoptimized
                    />
                  </span>
                  <span className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-white via-white/95 to-transparent px-4 pb-4 pt-6">
                    <span className="block truncate font-display text-lg text-deep">{item.name}</span>
                    <span className="mt-0.5 text-xs font-semibold text-[#c47b62]">{formatNgn(item.basePrice)}</span>
                  </span>
                </button>
              ) : null,
            )}
          </section>

          {rest.length ? (
            <section className="mb-14 hidden md:block">
              <SectionIntro pill="More treats" title={<>More from <span className="italic text-tea">{title}</span></>} />
              <div className="hidden gap-3 md:grid md:grid-cols-3 md:gap-4 lg:grid-cols-4">
                {rest.map((item, i) => (
                  <ProductCard key={item.id} item={item} index={i} layout="grid" onOpen={() => openItem(item)} onAdd={() => (needsOptions(item) ? openItem(item) : void addItem({ item }))} />
                ))}
              </div>
            </section>
          ) : null}

          <TrustStrip items={valueBar.map((v) => v.title)} className="mb-14" />

          <CtaBanner
            title="Can't decide? We'll help you choose"
            text="Tell us the occasion and how many people, and we'll suggest the perfect mix."
            actions={
              <>
                <ArrowPill href={contactLink(`Hi DHT, can you help me choose from ${title}?`)} external tone="light">
                  Chat on WhatsApp
                </ArrowPill>
                <Link href="/pastries" className="text-sm font-semibold text-white/80 underline-offset-4 hover:underline">
                  See all collections
                </Link>
              </>
            }
          />
        </>
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
