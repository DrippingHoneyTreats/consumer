"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Heart,
  Inbox,
  Leaf,
  MessageCircle,
  Search,
  SearchX,
  SlidersHorizontal,
  Sparkles,
  Truck,
  Wheat,
  X,
} from "lucide-react";
import { getCategories, searchItems } from "@/lib/catalogue";
import type { CatalogueCategory, CatalogueItem } from "@/lib/catalogue-types";
import { whatsappLink } from "@/lib/format";
import { categoryImage, ITEM_PLACEHOLDER } from "@/lib/placeholders";
import { EmptyState, OfflineState } from "@/components/ui/EmptyState";
import { ColumnLoader } from "@/components/ui/ColumnLoader";
import { ProductCard } from "@/components/catalogue/ProductCard";
import { ItemAddSheet } from "@/components/catalogue/ItemAddSheet";
import { useCartActions } from "@/hooks/useCartActions";
import { easeGentle } from "@/lib/motion";
import { cn } from "@/lib/cn";

const ease = easeGentle;

const featurePills = [
  { icon: Leaf, title: "Fresh daily" },
  { icon: Heart, title: "Handmade" },
  { icon: Truck, title: "Lagos delivery" },
];

const sideLinks = [
  { icon: Wheat, label: "Fibre" },
  { icon: Sparkles, label: "Fresh" },
  { icon: Heart, label: "Love" },
  { icon: Leaf, label: "Grain" },
];

const blobTones = ["bg-[#fce4ec]", "bg-[#ffe8d6]", "bg-[#f9d5e0]", "bg-[#f3ebe3]"] as const;

export default function PastriesPage() {
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
  const hero = categories[0];
  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP ?? "2348000000000";
  const heroImage = hero ? categoryImage(hero) : ITEM_PLACEHOLDER;

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

            <div className="relative grid items-center gap-4 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] md:gap-6">
              <div className="relative z-10">
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
                        className="w-full bg-transparent text-sm text-deep outline-none placeholder:text-deep/40"
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
                className="relative -mr-2 h-[210px] md:-mr-6 md:h-[300px]"
              >
                <span className="absolute -left-4 top-6 h-24 w-24 rounded-full bg-[#ffe0e8]/80 md:h-32 md:w-32" aria-hidden />
                <span className="absolute inset-y-0 right-0 w-[92%] overflow-hidden rounded-[48%_42%_38%_52%] bg-[#ffd6e0]/50 shadow-[0_20px_50px_-24px_rgba(93,64,55,0.35)]">
                  <Image src={heroImage} alt="" fill className="object-cover" sizes="420px" unoptimized priority />
                </span>
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
              {searchHits.map((item, i) => (
                <ProductCard
                  key={item.id}
                  item={item}
                  index={i}
                  layout="grid"
                  onOpen={() => openItem(item)}
                  onAdd={() => openItem(item)}
                />
              ))}
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
        <>
          <ul className="relative z-[1] -mt-3 mb-2 flex items-start justify-around gap-2 px-4 md:-mt-5 md:mb-4 md:px-12">
            {featurePills.map((f) => {
              const Icon = f.icon;
              return (
                <li key={f.title} className="flex max-w-[110px] flex-col items-center gap-2 text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#fce4ec] text-[#5d4037] shadow-[0_8px_20px_-12px_rgba(93,64,55,0.35)] md:h-16 md:w-16">
                    <Icon size={22} strokeWidth={1.5} />
                  </span>
                  <span className="font-display text-sm font-semibold text-[#5d4037] md:text-base">{f.title}</span>
                </li>
              );
            })}
          </ul>

          <div id="categories" className="relative scroll-mt-24 px-4 pb-6 md:px-10">
            <span className="pointer-events-none absolute left-6 top-10 h-2 w-2 rounded-full bg-[#f9a8bb]" aria-hidden />
            <span className="pointer-events-none absolute right-8 top-24 h-1.5 w-1.5 rounded-full bg-[#e8a48a]" aria-hidden />

            <div className="mx-auto max-w-2xl md:max-w-3xl">
              {categories.map((cat, index) => {
                const flip = index % 2 === 1;
                const blob = blobTones[index % blobTones.length];
                const organic =
                  index % 3 === 0
                    ? "rounded-[48%_42%_50%_44%]"
                    : index % 3 === 1
                      ? "rounded-full"
                      : "rounded-[42%_50%_44%_48%]";

                return (
                  <motion.div
                    key={cat.id}
                    initial={{ opacity: 0, y: 36 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.22 }}
                    transition={{ duration: 0.7, delay: Math.min(index, 6) * 0.05, ease }}
                    className="relative py-9 md:py-12"
                  >
                    <Link
                      href={`/pastries/${cat.slug}`}
                      className={cn(
                        "group relative flex w-full items-center gap-4 md:gap-10",
                        flip ? "flex-row-reverse" : "flex-row",
                      )}
                    >
                      <span className="relative shrink-0">
                        <span className={cn("absolute -inset-5 md:-inset-8", blob, organic)} aria-hidden />
                        <span
                          className={cn(
                            "relative block h-[148px] w-[148px] overflow-hidden shadow-[0_16px_36px_-18px_rgba(93,64,55,0.35)] ring-[5px] ring-white md:h-[200px] md:w-[200px]",
                            organic,
                          )}
                        >
                          <Image
                            src={categoryImage(cat)}
                            alt=""
                            fill
                            className="object-cover transition duration-500 group-hover:scale-105"
                            sizes="200px"
                            unoptimized
                          />
                        </span>
                      </span>

                      <span className={cn("min-w-0 flex-1", flip ? "text-right" : "text-left")}>
                        <span className="block font-display text-[26px] leading-[1.1] text-[#5d4037] md:text-[34px]">
                          {cat.name}
                        </span>
                        {cat.tagline ? (
                          <span
                            className={cn(
                              "mt-2 block text-[13px] leading-relaxed text-[#5d4037]/55 md:text-[15px]",
                              flip ? "ml-auto max-w-[260px]" : "max-w-[260px]",
                            )}
                          >
                            {cat.tagline}
                          </span>
                        ) : null}
                        <span
                          className={cn(
                            "mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#c47b62]",
                            flip && "flex-row-reverse",
                          )}
                        >
                          View treats <ArrowRight size={14} />
                        </span>
                      </span>
                    </Link>
                  </motion.div>
                );
              })}
            </div>

            <section className="mx-auto mt-4 grid max-w-3xl gap-3 md:grid-cols-2">
              <div className="rounded-[28px] bg-gradient-to-br from-[#fff1ea] to-[#fce4ec] p-5 shadow-[var(--shadow-card)]">
                <p className="font-display text-2xl text-[#5d4037]">Get 10% off first order</p>
                <p className="mt-2 text-sm text-[#5d4037]/60">Message us on WhatsApp for your welcome treat code.</p>
                <a
                  href={whatsappLink(whatsapp, "Hi DHT! I'd love the 10% first-order welcome treat.")}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#5d4037] px-5 py-2.5 text-sm font-semibold text-white"
                >
                  <MessageCircle size={16} /> Claim on WhatsApp
                </a>
              </div>
              <Link
                href="/events"
                className="pressable rounded-[28px] bg-white p-5 shadow-[var(--shadow-card)] ring-1 ring-[#5d4037]/8"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#c47b62]">Follow the vibe</p>
                <p className="mt-2 font-display text-2xl text-[#5d4037]">Events & dessert tables</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#c47b62]">
                  Explore events <ArrowRight size={14} />
                </span>
              </Link>
            </section>
          </div>
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
