"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  Heart,
  Inbox,
  Leaf,
  Search,
  SearchX,
  SlidersHorizontal,
  Sparkles,
  Wheat,
  X,
} from "lucide-react";
import { getCategories, searchItems, needsOptions } from "@/lib/catalogue";
import type { CatalogueCategory, CatalogueItem } from "@/lib/catalogue-types";
import { contactLink } from "@/lib/format";
import { categoryImage } from "@/lib/placeholders";
import { EmptyState, OfflineState } from "@/components/ui/EmptyState";
import { ColumnLoader } from "@/components/ui/ColumnLoader";
import { ProductCard } from "@/components/catalogue/ProductCard";
import { ItemAddSheet } from "@/components/catalogue/ItemAddSheet";
import { HeroImageCycle } from "@/components/motion/HeroImageCycle";
import { useCartActions } from "@/hooks/useCartActions";
import { easeGentle } from "@/lib/motion";
import { cn } from "@/lib/cn";
import {
  ArrowPill,
  CtaBanner,
  FeatureGridDark,
  Pill,
  ProcessSteps,
  SectionIntro,
  TrustStrip,
} from "@/components/editorial/Editorial";
import { ORDER_STEPS, TRUST_WORDS, WHY_PASTRIES } from "@/components/editorial/content";
import { SwipeDeck } from "@/components/editorial/SwipeDeck";

const ease = easeGentle;

const sideLinks = [
  { icon: Wheat, label: "Fibre" },
  { icon: Sparkles, label: "Fresh" },
  { icon: Heart, label: "Love" },
  { icon: Leaf, label: "Grain" },
];


export function PastriesView() {
  const { addItem } = useCartActions();
  const [categories, setCategories] = useState<CatalogueCategory[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [query, setQuery] = useState("");
  const [searchHits, setSearchHits] = useState<CatalogueItem[]>([]);
  const [searchState, setSearchState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [searchNonce, setSearchNonce] = useState(0);
  const [selected, setSelected] = useState<CatalogueItem | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function openItem(item: CatalogueItem) {
    setSelected(item);
    setSheetOpen(true);
  }

  const load = useCallback(() => {
    setState("loading");
    void getCategories()
      .then(({ categories: cats }) => {
        setCategories(cats);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, []);

  useEffect(() => {
    load();
    if (new URLSearchParams(window.location.search).get("focus")) inputRef.current?.focus();
  }, [load]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSearchHits([]);
      setSearchState("idle");
      return;
    }
    setSearchState("loading");
    const t = window.setTimeout(() => {
      void searchItems(q)
        .then((items) => {
          setSearchHits(items);
          setSearchState("done");
        })
        .catch(() => setSearchState("error"));
    }, 300);
    return () => clearTimeout(t);
  }, [query, searchNonce]);

  const searching = query.trim().length >= 2;

  const collectionCard = (cat: CatalogueCategory, index: number) => (
    <Link
      href={`/pastries/${cat.slug}`}
      className="pressable group relative flex h-full min-h-[260px] flex-col justify-end overflow-hidden rounded-[28px] bg-cream p-5 shadow-[var(--shadow-card)]"
    >
      <Image
        src={categoryImage(cat)}
        alt=""
        fill
        className="object-cover transition duration-700 group-hover:scale-105"
        sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
        unoptimized
      />
      <span className="absolute inset-0 bg-gradient-to-t from-[#1f2f24]/85 via-[#1f2f24]/25 to-transparent" />
      <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 font-display text-xs font-semibold text-deep">
        {String(index + 1).padStart(2, "0")}
      </span>
      <span className="absolute right-4 top-4 hidden h-10 w-10 items-center justify-center rounded-full bg-white text-deep shadow transition group-hover:rotate-45 md:flex">
        <ArrowUpRight size={17} />
      </span>
      <span className="relative">
        <span className="block font-display text-[26px] font-semibold leading-tight text-white md:text-[30px]">{cat.name}</span>
        {cat.tagline ? <span className="mt-1 block max-w-xs text-sm text-white/75">{cat.tagline}</span> : null}
      </span>
    </Link>
  );

  return (
    <div className="page-pad !px-0 !pt-0 bg-[#fffaf7]">
      {/* Soft pink categories hero */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative overflow-hidden bg-gradient-to-b from-[#ffe8ee] via-[#fff3f0] to-[#fffaf7] px-4 pb-20 pt-[calc(12px+var(--safe-top))] md:px-10 md:pb-24"
      >
            <span className="pointer-events-none absolute left-[18%] top-10 h-2 w-2 rounded-full bg-[#f9a8bb]" aria-hidden />
            <span className="pointer-events-none absolute left-[28%] top-24 h-1.5 w-1.5 rounded-full bg-[#e8a48a]" aria-hidden />
            <span className="pointer-events-none absolute right-[42%] top-14 h-2.5 w-2.5 rounded-full border-2 border-[#f9a8bb]/70" aria-hidden />

            <div className="relative grid items-center gap-4 md:grid-cols-[minmax(0,1fr)_minmax(280px,1.2fr)] md:gap-2">
              <div className="relative z-20">
                <div className="flex items-start gap-4 md:gap-6">
                  <ul className="mt-2 hidden shrink-0 flex-col gap-3 sm:flex">
                    {sideLinks.map((s) => {
                      const Icon = s.icon;
                      return (
                        <li key={s.label} className="flex flex-col items-center gap-1">
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#5d4037] shadow-sm ring-1 ring-[#5d4037]/8">
                            <Icon size={14} strokeWidth={1.8} />
                          </span>
                          <span className="text-[9px] font-semibold tracking-wide text-[#5d4037]/55">{s.label}</span>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="min-w-0 pt-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#c47b62]">Our menu</p>
                    <h1 className="mt-2 font-display text-[44px] leading-[0.95] tracking-tight text-[#5d4037] md:text-[64px]">
                      Pastries
                    </h1>
                    <p className="mt-3 max-w-xs font-display text-[15px] italic leading-snug text-[#5d4037]/55 md:text-lg">
                      Fibre-rich treats, baked fresh — pick a category below
                    </p>
                    <motion.label
                      whileFocus={{ scale: 1.01 }}
                      className="glass mt-5 flex min-h-12 w-full max-w-sm items-center gap-2.5 rounded-full border border-white/90 py-1.5 pl-4 pr-1.5 shadow-[var(--shadow-card)]"
                    >
                      <Search size={17} className="shrink-0 text-tea" />
                      <input
                        ref={inputRef}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search cakes, chinchin, meat pies…"
                        aria-label="Search pastries"
                        className="w-full bg-transparent text-base text-deep outline-none placeholder:text-deep/40"
                      />
                      {query ? (
                        <button
                          type="button"
                          aria-label="Clear search"
                          onClick={() => setQuery("")}
                          className="mr-1 rounded-full p-1 text-deep/45 hover:bg-deep/5"
                        >
                          <X size={15} />
                        </button>
                      ) : (
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-deep text-white">
                          <SlidersHorizontal size={14} />
                        </span>
                      )}
                    </motion.label>

                    <ul className="mt-5 flex gap-3 sm:hidden">
                      {sideLinks.map((s) => {
                        const Icon = s.icon;
                        return (
                          <li
                            key={s.label}
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#5d4037] shadow-sm"
                          >
                            <Icon size={14} strokeWidth={1.8} />
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, x: 28, scale: 0.94 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 140, damping: 18, delay: 0.06 }}
                className="relative z-10 mx-auto h-[230px] w-full max-w-[400px] sm:h-[250px] md:mx-0 md:h-[270px] md:max-w-none lg:h-[290px]"
              >
                <HeroImageCycle images={categories.map((c) => c.image ?? "")} variant="pastries" className="h-full w-full" />
              </motion.div>
            </div>

            <div className="pointer-events-none absolute inset-x-0 bottom-0 leading-[0]" aria-hidden>
              <svg viewBox="0 0 1440 90" preserveAspectRatio="none" className="block h-14 w-full md:h-[72px]">
                <path
                  fill="#fffaf7"
                  d="M0,54 C90,78 180,24 270,50 C360,76 450,30 540,54 C630,78 720,34 810,56 C900,78 990,28 1080,50 C1170,72 1260,36 1350,54 C1410,66 1440,58 1440,58 L1440,90 L0,90 Z"
                />
              </svg>
            </div>
      </motion.section>

      {searching ? (
        <div className="relative px-4 pb-8 md:px-10">
          <span className="pointer-events-none absolute left-8 top-2 h-2 w-2 rounded-full bg-[#f9a8bb]" aria-hidden />
          <span className="pointer-events-none absolute right-10 top-8 h-1.5 w-1.5 rounded-full bg-[#e8a48a]" aria-hidden />

          <div className="mb-5 flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#c47b62]">Sweet finds</p>
              <h2 className="mt-1 font-display text-[26px] text-[#5d4037] md:text-[32px]">
                {searchState === "loading" ? "Searching…" : `Matches for “${query.trim()}”`}
              </h2>
            </div>
            {searchState === "done" && searchHits.length > 0 ? (
              <p className="text-xs font-semibold text-[#5d4037]/45">
                {searchHits.length} treat{searchHits.length === 1 ? "" : "s"}
              </p>
            ) : null}
          </div>

          {searchState === "error" ? (
            <OfflineState compact onRetry={() => setSearchNonce((n) => n + 1)} />
          ) : searchState === "loading" ? (
            <ColumnLoader columns={2} count={4} aspect="aspect-square" />
          ) : searchHits.length === 0 ? (
            <EmptyState
              compact
              icon={<SearchX size={48} strokeWidth={1.4} />}
              title="Uh-oh! 👀"
              message={`We couldn't find "${query.trim()}". Try another treat.`}
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
              <AnimatePresence mode="popLayout">
                {searchHits.map((item, i) => (
                  <ProductCard
                    key={item.id}
                    item={item}
                    index={i}
                    layout="grid"
                    onOpen={() => openItem(item)}
                    onAdd={() => (needsOptions(item) ? openItem(item) : void addItem({ item }))}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      ) : state === "loading" ? (
        <div className="px-4 pb-6 md:px-10">
          <ColumnLoader columns={2} count={4} aspect="aspect-[4/5]" />
        </div>
      ) : state === "error" ? (
        <div className="px-4 pb-6 md:px-10">
          <OfflineState onRetry={load} />
        </div>
      ) : categories.length === 0 ? (
        <div className="px-4 pb-6 md:px-10">
          <EmptyState
            icon={<Inbox size={56} strokeWidth={1.4} />}
            title="Uh-oh! 👀"
            message="Looks like there's nothing here yet."
          />
        </div>
      ) : (
        <div className="mx-auto max-w-6xl space-y-16 px-4 pb-10 md:space-y-24 md:px-10">
          <TrustStrip items={TRUST_WORDS} className="-mt-2" />

          <section id="categories" className="scroll-mt-24">
            <SectionIntro
              pill={<><Wheat size={13} /> Our collections</>}
              title={
                <>
                  Baked fresh, <span className="italic text-tea">made</span> for sharing
                </>
              }
              text="Pick a collection to see every treat, price and size."
            />
            <SwipeDeck
              tone="none"
              label="Collections"
              items={categories.map((cat, index) => (
                <div key={cat.id} className="h-[340px] [&>a]:h-full">
                  {collectionCard(cat, index)}
                </div>
              ))}
            />
            <ul className="hidden gap-4 md:grid md:grid-cols-2 lg:grid-cols-3">
              {categories.map((cat, index) => (
                <motion.li
                  key={cat.id}
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.6, delay: Math.min(index, 6) * 0.06, ease }}
                  className={cn(index === 0 && categories.length > 2 && "md:col-span-2 lg:col-span-1 lg:row-span-2")}
                >
                  {collectionCard(cat, index)}
                </motion.li>
              ))}
            </ul>
          </section>

          <section>
            <SectionIntro
              pill="How to order"
              title={
                <>
                  From our oven to your <span className="italic text-tea">door</span>
                </>
              }
            />
            <ProcessSteps steps={ORDER_STEPS} note="Ready to be enjoyed!" />
          </section>

          <FeatureGridDark
            pill="Why DHT"
            title="Treats that are good, and good for you"
            text="Everything we bake starts with whole grains, real fibre and a lot of love."
            items={WHY_PASTRIES}
          />

          <section className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
            <CtaBanner
              className="!text-left md:!px-10"
              title="Get 10% off your first order"
              text="Message us on WhatsApp for your welcome treat code."
              actions={
                <ArrowPill href={contactLink("Hi DHT! I'd love the 10% first-order welcome treat.")} external tone="light">
                  Claim on WhatsApp
                </ArrowPill>
              }
            />
            <Link
              href="/events"
              className="pressable group relative flex min-h-[220px] flex-col justify-between overflow-hidden rounded-[32px] bg-blush-soft p-7"
            >
              <Pill>Events</Pill>
              <span>
                <span className="block font-display text-[28px] font-semibold leading-tight text-deep">Dessert tables for your next party</span>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-tea">
                  Explore events <ArrowUpRight size={15} className="transition group-hover:rotate-45" />
                </span>
              </span>
            </Link>
          </section>
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
