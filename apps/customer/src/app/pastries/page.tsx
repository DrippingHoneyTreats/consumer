"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ArrowUpRight, MessageCircle, PartyPopper, Search, SearchX, UtensilsCrossed, X } from "lucide-react";
import { getCategories, searchItems } from "@/lib/catalogue";
import type { CatalogueCategory, CatalogueItem } from "@/lib/catalogue-types";
import { formatNgn, whatsappLink } from "@/lib/format";
import { categoryImage, ITEM_PLACEHOLDER, LOGO, toneFor } from "@/lib/placeholders";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, OfflineState } from "@/components/ui/EmptyState";
import { ColumnLoader } from "@/components/ui/ColumnLoader";
import { useScrolledPast } from "@/hooks/useAppScroll";
import { easeGentle } from "@/lib/motion";
import { cn } from "@/lib/cn";

const ease = easeGentle;

function FeaturedTile({ cat }: { cat: CatalogueCategory }) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 36 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease }}
      className="col-span-2 md:col-span-2 lg:col-span-2"
    >
      <Link
        href={`/pastries/${cat.slug}`}
        className="pressable group relative flex h-[200px] overflow-hidden rounded-[30px] bg-hero p-5 shadow-[var(--shadow-card)] md:h-[260px] lg:h-[300px]"
      >
        <div className="relative z-10 flex max-w-[52%] flex-col justify-between">
          <div>
            <p className="mt-1 font-display text-[30px] leading-none text-deep">{cat.name}</p>
          </div>
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-deep px-4 py-2 text-xs font-semibold text-white">
            Shop now <ArrowRight size={14} />
          </span>
        </div>
        <div className="animate-float absolute -right-3 bottom-4 top-4 w-[48%]" style={{ ["--float-rot" as string]: "5deg" }}>
          <div className="relative h-full w-full overflow-hidden rounded-[26px] shadow-[var(--shadow-float)] ring-4 ring-white/70">
            <Image src={categoryImage(cat)} alt="" fill className="object-cover" sizes="240px" unoptimized priority />
          </div>
        </div>
      </Link>
    </motion.li>
  );
}

function CategoryCard({ cat, index, wide }: { cat: CatalogueCategory; index: number; wide: boolean }) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.7, delay: (index % 4) * 0.06, ease }}
      className={cn(wide && "col-span-2")}
    >
      <Link
        href={`/pastries/${cat.slug}`}
        className={cn(
          "pressable group flex overflow-hidden rounded-[26px] p-2 shadow-[var(--shadow-card)]",
          wide ? "flex-row items-center gap-3 bg-deep text-white" : cn("flex-col", toneFor(index + 1), "text-deep"),
        )}
      >
        <span
          className={cn(
            "relative block overflow-hidden rounded-[20px] ring-[3px] ring-white/70",
            wide ? "aspect-square w-[38%] shrink-0" : "aspect-[5/4] w-full",
          )}
        >
          <Image
            src={categoryImage(cat)}
            alt=""
            fill
            className="object-cover transition duration-500 group-hover:scale-105"
            sizes="240px"
            unoptimized
          />
        </span>
        <span className={cn("flex flex-1 items-end justify-between gap-2 px-1.5", wide ? "py-2" : "pb-1 pt-3")}>
          <span>
            <span className="block font-display text-xl leading-tight">{cat.name}</span>
          </span>
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition group-hover:rotate-45",
              wide ? "bg-blush text-deep" : "bg-white text-deep shadow-sm",
            )}
          >
            <ArrowUpRight size={16} />
          </span>
        </span>
      </Link>
    </motion.li>
  );
}

export default function PastriesPage() {
  const [categories, setCategories] = useState<CatalogueCategory[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [query, setQuery] = useState("");
  const [searchHits, setSearchHits] = useState<CatalogueItem[]>([]);
  const [searchState, setSearchState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [searchNonce, setSearchNonce] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const compact = useScrolledPast(60);

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
  const [featured, ...rest] = categories;
  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP ?? "2348000000000";
  const slugByCategoryId = Object.fromEntries(categories.map((c) => [c.id, c.slug]));

  return (
    <div className="page-pad">
      <PageHeader eyebrow="Our menu" title="Pastries" subtitle="Fibre-rich treats, baked fresh in Lagos." />

      <div
        className={cn(
          "sticky top-0 z-20 -mx-4 mb-5 space-y-3 px-4 pb-2 pt-[calc(8px+var(--safe-top))] transition-colors duration-300",
          compact && "glass shadow-[0_10px_24px_-18px_rgba(63,95,70,0.5)]",
        )}
      >
        <label className="glass flex min-h-13 items-center gap-3 rounded-full border border-white/80 px-4 shadow-[var(--shadow-card)] focus-within:ring-4 focus-within:ring-sage/25">
          <Search size={18} className="shrink-0 text-tea" />
          <input
            ref={inputRef}
            placeholder="Search cakes, chinchin, meat pies…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent py-3.5 text-sm text-deep outline-none placeholder:text-deep/40"
            aria-label="Search pastries"
          />
          {query ? (
            <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="text-deep/50">
              <X size={18} />
            </button>
          ) : null}
        </label>

        {!searching && categories.length ? (
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/pastries/${c.slug}`}
                className="pressable flex shrink-0 items-center gap-2 rounded-full bg-white py-1 pl-1 pr-3.5 text-xs font-semibold text-deep shadow-sm ring-1 ring-deep/5"
              >
                <span className="relative h-7 w-7 overflow-hidden rounded-full bg-blush-soft">
                  <Image src={categoryImage(c)} alt="" fill className="object-cover" sizes="28px" unoptimized />
                </span>
                {c.name}
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      {searching ? (
        searchState === "error" ? (
          <OfflineState compact onRetry={() => setSearchNonce((n) => n + 1)} />
        ) : searchState === "loading" ? (
          <ColumnLoader columns={1} count={4} aspect="h-[72px] aspect-auto" />
        ) : searchHits.length === 0 ? (
          <EmptyState
            compact
            image={LOGO}
            icon={<SearchX size={22} />}
            title="No matches yet"
            message={`We couldn't find "${query.trim()}". Try another treat.`}
          />
        ) : (
          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {searchHits.map((item, i) => (
                <motion.li
                  key={item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Link
                    href={`/pastries/${slugByCategoryId[item.categoryId] || item.categoryId}?item=${item.id}`}
                    className="pressable flex items-center gap-3 rounded-[20px] bg-white p-2 pr-4 shadow-[var(--shadow-card)]"
                  >
                    <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-blush-soft">
                      <Image src={item.images?.[0] || ITEM_PLACEHOLDER} alt="" fill className="object-cover" sizes="56px" unoptimized />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-deep">{item.name}</span>
                      <span className="text-xs text-deep/55">{formatNgn(item.basePrice)}</span>
                    </span>
                    <ArrowUpRight size={18} className="text-tea" />
                  </Link>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )
      ) : state === "loading" ? (
        <ColumnLoader columns={4} count={6} aspect="aspect-[4/5]" />
      ) : state === "error" ? (
        <OfflineState onRetry={load} />
      ) : !featured ? (
        <EmptyState
          image={LOGO}
          icon={<UtensilsCrossed size={28} />}
          title="Menu coming soon"
          message="No pastries uploaded yet. Check back shortly."
        />
      ) : (
        <>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:gap-5">
            <FeaturedTile cat={featured} />
            {rest.map((cat, i) => (
              <CategoryCard key={cat.id} cat={cat} index={i} wide={rest.length % 2 === 1 && i === rest.length - 1} />
            ))}
          </ul>

          <section className="mt-6 grid grid-cols-2 gap-3 md:mt-8 md:grid-cols-2 md:gap-4 lg:max-w-3xl">
            <Link
              href="/events/book"
              className="pressable relative overflow-hidden rounded-[26px] bg-sage-glow p-4 shadow-[var(--shadow-card)]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-deep">
                <PartyPopper size={18} />
              </span>
              <p className="mt-3 font-display text-lg leading-tight text-deep">Hosting a crowd?</p>
              <p className="mt-1 text-[11px] leading-snug text-deep/60">Party packs and dessert tables for your event.</p>
            </Link>
            <a
              href={whatsappLink(whatsapp, "Hi DHT, I'm looking for a treat that isn't on the menu")}
              target="_blank"
              rel="noreferrer"
              className="pressable relative overflow-hidden rounded-[26px] bg-gradient-to-br from-blush-soft to-blush p-4 shadow-[var(--shadow-card)]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-deep">
                <MessageCircle size={18} />
              </span>
              <p className="mt-3 font-display text-lg leading-tight text-deep">Can&apos;t find it?</p>
              <p className="mt-1 text-[11px] leading-snug text-deep/60">Tell us on WhatsApp and we&apos;ll bake it.</p>
            </a>
          </section>
        </>
      )}
    </div>
  );
}
