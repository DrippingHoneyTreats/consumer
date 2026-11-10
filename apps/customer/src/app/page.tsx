"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import {
  ArrowRight,
  Bell,
  ChevronDown,
  MapPin,
  MessageCircle,
  PartyPopper,
  Search,
  SearchX,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { getHomeCatalogue, searchItems } from "@/lib/catalogue";
import type { Banner, CatalogueCategory, CatalogueItem } from "@/lib/catalogue-types";
import { greetingForNow, whatsappLink } from "@/lib/format";
import { BANNER_PLACEHOLDER, EVENTS_BANNER, LOGO, categoryImage, toneFor } from "@/lib/placeholders";
import { useAuthStore } from "@/store/auth-store";
import { useCartActions } from "@/hooks/useCartActions";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { ProductCard } from "@/components/catalogue/ProductCard";
import { ItemAddSheet } from "@/components/catalogue/ItemAddSheet";
import { EmptyState, OfflineState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/ColumnLoader";
import { easeGentle, fadeUp, kenBurns, springSnappy, stagger } from "@/lib/motion";
import { HeroImageCycle } from "@/components/motion/HeroImageCycle";
import { cn } from "@/lib/cn";

const SLIDE_MS = 4500;
const ease = easeGentle;

const LAGOS_MARKETS = [
  { place: "Lekki", note: "Drips" },
  { place: "Yaba", note: "Snack jars" },
  { place: "Ikeja", note: "Party packs" },
  { place: "VI", note: "Dessert tables" },
  { place: "Surulere", note: "Chinchin" },
  { place: "Ikoyi", note: "Cake boxes" },
  { place: "Ajah", note: "Same-day" },
  { place: "Mainland", note: "Fibre treats" },
];

function SectionTitle({ title, href, linkLabel = "See all" }: { title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="font-display text-[22px] leading-none text-deep md:text-[26px]">{title}</h2>
      {href ? (
        <Link href={href} className="flex items-center gap-0.5 text-xs font-semibold text-tea">
          {linkLabel} <ArrowRight size={13} />
        </Link>
      ) : null}
    </div>
  );
}

function PromoCarousel({ banners }: { banners: Banner[] }) {
  const slides = banners.slice(0, 5);
  const [[idx, dir], setPage] = useState<[number, number]>([0, 1]);
  const [paused, setPaused] = useState(false);
  const dragged = useRef(false);

  const paginate = useCallback(
    (d: number) => {
      if (slides.length < 2) return;
      setPage(([i]) => [((i + d) % slides.length + slides.length) % slides.length, d]);
    },
    [slides.length],
  );

  useEffect(() => {
    if (paused || slides.length < 2) return;
    const t = window.setInterval(() => paginate(1), SLIDE_MS);
    return () => window.clearInterval(t);
  }, [paused, paginate, slides.length]);

  if (!slides.length) return null;
  const banner = slides[idx];
  const href = banner.ctaTarget || "/pastries";

  return (
    <div
      className="relative overflow-hidden rounded-[28px] bg-cream shadow-[var(--shadow-card)] md:rounded-[32px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      <AnimatePresence initial={false} custom={dir} mode="popLayout">
        <motion.div
          key={banner.id}
          custom={dir}
          initial={{ opacity: 0, x: dir * 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: dir * -40 }}
          transition={{ duration: 0.45, ease }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.12}
          onDragStart={() => {
            dragged.current = true;
          }}
          onDragEnd={(_, info: PanInfo) => {
            if (info.offset.x < -48) paginate(1);
            else if (info.offset.x > 48) paginate(-1);
            window.setTimeout(() => {
              dragged.current = false;
            }, 40);
          }}
          className="relative aspect-[16/9] w-full md:aspect-[21/8] lg:aspect-[24/7]"
        >
          <motion.div
            className="absolute inset-0"
            initial={kenBurns.initial}
            animate={kenBurns.animate}
            transition={kenBurns.transition}
          >
            <Image
              src={banner.image || BANNER_PLACEHOLDER}
              alt={banner.title || "Promo"}
              fill
              className="object-cover"
              sizes="100vw"
              unoptimized
              priority={idx === 0}
            />
          </motion.div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 px-4 pb-8 pt-4 md:px-6 md:pb-10 md:pt-6">
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
              <Link
                href={href}
                onClick={(e) => {
                  if (dragged.current) e.preventDefault();
                }}
                className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-honey px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-deep shadow-[var(--shadow-card)] md:px-5 md:py-3 md:text-sm"
              >
                {banner.ctaLabel || "Order now"} <ArrowRight size={14} />
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>
      {slides.length > 1 ? (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={`Slide ${i + 1}`}
              onClick={() => setPage([i, i > idx ? 1 : -1])}
              className={cn(
                "h-1.5 rounded-full shadow-sm transition-all",
                i === idx ? "w-5 bg-white" : "w-1.5 bg-white/70",
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CategoryRail({ categories }: { categories: CatalogueCategory[] }) {
  return (
    <motion.div
      variants={stagger(0.05)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.3 }}
      className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 pt-0.5 no-scrollbar md:gap-4"
    >
      <motion.div variants={fadeUp}>
        <Link href="/pastries" className="flex w-[72px] shrink-0 flex-col items-center gap-2 md:w-[84px]">
          <motion.span
            whileHover={{ scale: 1.1, y: -5, rotate: -4 }}
            whileTap={{ scale: 0.92 }}
            transition={springSnappy}
            className="flex h-[64px] w-[64px] items-center justify-center rounded-[22px] bg-honey text-deep shadow-[var(--shadow-card)] md:h-[76px] md:w-[76px] md:rounded-[26px]"
          >
            <span className="font-display text-lg font-bold">All</span>
          </motion.span>
          <span className="text-[11px] font-semibold text-deep">All</span>
        </Link>
      </motion.div>
      {categories.map((cat, i) => (
        <motion.div key={cat.id} variants={fadeUp}>
          <Link href={`/pastries/${cat.slug}`} className="flex w-[72px] shrink-0 flex-col items-center gap-2 md:w-[84px]">
            <motion.span
              whileHover={{ scale: 1.1, y: -5, rotate: i % 2 ? 4 : -4 }}
              whileTap={{ scale: 0.92 }}
              transition={springSnappy}
              className={cn(
                "relative h-[64px] w-[64px] overflow-hidden rounded-[22px] shadow-[var(--shadow-card)] ring-2 ring-white md:h-[76px] md:w-[76px] md:rounded-[26px]",
                toneFor(i),
              )}
            >
              <motion.div
                className="absolute inset-0"
                whileHover={{ scale: 1.12 }}
                transition={{ duration: 0.4 }}
              >
                <Image src={categoryImage(cat)} alt="" fill className="object-cover" sizes="76px" unoptimized />
              </motion.div>
            </motion.span>
            <span className="line-clamp-1 text-center text-[11px] font-semibold text-deep">{cat.name}</span>
          </Link>
        </motion.div>
      ))}
    </motion.div>
  );
}

export default function HomePage() {
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const { addItem } = useCartActions();
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [banners, setBanners] = useState<Banner[]>([]);
  const [categories, setCategories] = useState<CatalogueCategory[]>([]);
  const [popular, setPopular] = useState<CatalogueItem[]>([]);
  const [whatsapp, setWhatsapp] = useState(process.env.NEXT_PUBLIC_WHATSAPP || "2348000000000");
  const [greeting, setGreeting] = useState("Welcome, Guest");
  const [selected, setSelected] = useState<CatalogueItem | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<CatalogueItem[]>([]);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (user?.fullName) setGreeting(greetingForNow(user.fullName));
    else setGreeting("Welcome, Guest");
  }, [user?.fullName, hydrated]);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const home = await getHomeCatalogue();
      setBanners(home.banners);
      setCategories(home.categories);
      setPopular(home.popular);
      if (home.settings?.whatsappNumber) setWhatsapp(home.settings.whatsappNumber);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = window.setTimeout(() => {
      void searchItems(q).then((items) => {
        setHits(items);
        setSearching(false);
      });
    }, 220);
    return () => window.clearTimeout(t);
  }, [query]);

  const openItem = (item: CatalogueItem) => {
    setSelected(item);
    setSheetOpen(true);
  };

  const showUser = hydrated && !!user;
  const heroImages = [
    "/temp/images/cake-wholewheat-nobg.png",
    "/temp/images/cake-wholewheat2-nobg.png",
  ];
  const isSearch = query.trim().length >= 2;

  return (
    <div className="page-pad space-y-6 md:space-y-8 lg:space-y-10">
      <header className="space-y-4 md:space-y-5">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease }}
          className="flex items-center justify-between gap-3"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <motion.span
              whileHover={{ scale: 1.06, rotate: -4 }}
              whileTap={{ scale: 0.94 }}
              className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blush-soft ring-2 ring-white shadow-[var(--shadow-card)] md:h-11 md:w-11"
            >
              {showUser ? (
                <span className="font-display text-base text-deep md:text-lg">
                  {user!.fullName
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((p) => p[0]?.toUpperCase())
                    .join("")}
                </span>
              ) : (
                <BrandLogo size="sm" href={null} />
              )}
            </motion.span>
            <Link
              href="/account/addresses"
              className="inline-flex min-w-0 items-center gap-1 text-[12px] font-semibold text-deep md:text-sm"
            >
              <MapPin size={14} className="shrink-0 text-tea" />
              <span className="truncate">Delivering in Lagos</span>
              <ChevronDown size={14} className="shrink-0 text-deep/40" />
            </Link>
          </div>
          <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.92 }}>
            <Link
              href="/account"
              aria-label="Notifications"
              className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-deep shadow-[var(--shadow-card)] md:h-11 md:w-11"
            >
              <Bell size={18} />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-blush-deep" />
            </Link>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, ease, delay: 0.05 }}
          className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#f7efe6_0%,#fbe3e6_48%,#e8f0e6_100%)] shadow-[var(--shadow-card)] md:overflow-visible md:rounded-[32px]"
        >
          <div className="relative z-10 grid items-center gap-4 p-5 md:grid-cols-[minmax(0,1fr)_minmax(260px,1.15fr)] md:gap-3 md:p-7 lg:gap-4 lg:p-8">
            <div className="relative z-20 max-w-md lg:max-w-lg">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-tea md:text-[13px]">{greeting}</p>
              <h1 className="mt-2 font-display text-[30px] leading-[1.08] text-deep md:text-[40px] lg:text-[48px]">
                Freshly baked{" "}
                <span className="inline-block text-honey">drips</span>
                <br />
                delivered to your door.
              </h1>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-deep/60 md:text-[15px]">
                Fibre-rich pastries and event tables — baked fresh for Lagos.
              </p>
              <motion.label
                whileFocus={{ scale: 1.015 }}
                whileHover={{ scale: 1.01 }}
                className="glass mt-5 flex min-h-12 w-full items-center gap-2.5 rounded-full border border-white/90 py-1.5 pl-4 pr-1.5 shadow-[var(--shadow-card)]"
              >
                <Search size={17} className="shrink-0 text-tea" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search cakes, chinchin, meat pies…"
                  aria-label="Search treats"
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
            </div>

            <motion.div
              initial={{ opacity: 0, y: 28, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.75, ease, delay: 0.12 }}
              className="relative z-10 mx-auto h-[240px] w-full max-w-[380px] sm:h-[250px] md:mx-0 md:h-[260px] md:max-w-none lg:h-[280px]"
            >
              <HeroImageCycle images={heroImages} variant="home" className="relative h-full w-full" />
            </motion.div>
          </div>
        </motion.div>
      </header>

      {state === "loading" ? (
        <PageSkeleton variant="home" />
      ) : state === "error" ? (
        <OfflineState onRetry={() => void load()} />
      ) : isSearch ? (
        <motion.section initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease }}>
          <SectionTitle title={searching ? "Searching…" : `Results for “${query.trim()}”`} />
          {searching ? (
            <PageSkeleton variant="grid" />
          ) : hits.length === 0 ? (
            <EmptyState
              compact
              image={LOGO}
              icon={<SearchX size={22} />}
              title="No matches yet"
              message={`Nothing found for “${query.trim()}”. Try chinchin, cake, or donut.`}
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
              {hits.map((item, i) => (
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
        </motion.section>
      ) : (
        <>
          <motion.section
            initial={{ opacity: 0, y: 36 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.12 }}
            transition={{ duration: 0.7, ease }}
          >
            <CategoryRail categories={categories} />
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="border-y border-dotted border-deep/20 py-4 md:py-5"
          >
            <div className="flex items-center gap-4 md:gap-5">
              <p className="shrink-0 max-w-[9.5rem] text-sm font-semibold leading-snug text-deep sm:max-w-[11rem] md:max-w-[13rem] md:text-[15px]">
                Made for every hood across{" "}
                <span className="underline decoration-honey decoration-[3px] underline-offset-4">Lagos</span>
              </p>
              <span className="hidden h-10 w-px shrink-0 bg-deep/15 sm:block" aria-hidden />
              <div className="relative min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
                <motion.ul
                  className="flex w-max gap-8"
                  animate={{ x: ["0%", "-50%"] }}
                  transition={{ duration: 8, ease: "linear", repeat: Infinity }}
                >
                  {[...LAGOS_MARKETS, ...LAGOS_MARKETS].map((m, i) => (
                    <li key={`${m.place}-${i}`} className="shrink-0">
                      <p className="text-sm font-bold text-deep">{m.place}</p>
                      <p className="text-[11px] font-medium text-deep/45 md:text-xs">{m.note}</p>
                    </li>
                  ))}
                </motion.ul>
              </div>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.12 }}
            transition={{ duration: 0.75, ease }}
          >
            <SectionTitle title="Popular this week" href="/pastries" />
            {popular.length ? (
              <>
                <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 no-scrollbar md:gap-4 lg:hidden">
                  {popular.map((item, i) => (
                    <ProductCard
                      key={item.id}
                      item={item}
                      index={i}
                      layout="rail"
                      onOpen={() => openItem(item)}
                      onAdd={() => void addItem({ item })}
                    />
                  ))}
                </div>
                <div className="hidden grid-cols-3 gap-4 lg:grid xl:grid-cols-4">
                  {popular.slice(0, 8).map((item, i) => (
                    <ProductCard
                      key={item.id}
                      item={item}
                      index={i}
                      layout="grid"
                      onOpen={() => openItem(item)}
                      onAdd={() => void addItem({ item })}
                    />
                  ))}
                </div>
              </>
            ) : (
              <EmptyState
                compact
                className="min-h-[120px] rounded-[24px]"
                image={LOGO}
                title="Menu warming up"
                message="Popular picks will show here once the kitchen publishes them."
              />
            )}
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: false, amount: 0.15 }}
            transition={{ duration: 0.75, ease }}
          >
            {banners.length ? (
              <PromoCarousel banners={banners} />
            ) : (
              <EmptyState
                compact
                className="min-h-[140px] rounded-[30px]"
                image={LOGO}
                title="No promos yet"
                message="Offers show here when the kitchen posts them."
              />
            )}
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.15 }}
            transition={{ duration: 0.75, ease }}
            className="grid gap-3 md:grid-cols-2"
          >
            <motion.div whileHover={{ y: -6, scale: 1.015 }} whileTap={{ scale: 0.98 }} transition={springSnappy}>
              <Link
                href="/events"
                className="relative flex h-full min-h-[160px] overflow-hidden rounded-[28px] bg-deep p-5 text-white shadow-[var(--shadow-card)]"
              >
                <div className="relative z-10 max-w-[70%]">
                  <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-blush">
                    <PartyPopper size={14} /> Events
                  </p>
                  <p className="mt-2 font-display text-2xl leading-tight">Book a sweet table</p>
                  <p className="mt-1 text-sm text-white/70">Birthdays, boardrooms & big Lagos days.</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-honey">
                    Explore events <ArrowRight size={13} />
                  </span>
                </div>
                <div className="absolute -right-2 bottom-0 top-4 w-[42%]">
                  <Image src={EVENTS_BANNER} alt="" fill className="object-contain object-bottom" sizes="200px" unoptimized />
                </div>
              </Link>
            </motion.div>

            <motion.a
              href={whatsappLink(whatsapp, "Hi DHT! I want to place an order.")}
              target="_blank"
              rel="noreferrer"
              whileHover={{ y: -4, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              transition={springSnappy}
              className="flex items-center gap-4 rounded-[28px] bg-white p-5 shadow-[var(--shadow-card)]"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-sage-soft text-deep">
                <MessageCircle size={22} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-xl text-deep">Chat on WhatsApp</p>
                <p className="text-sm text-deep/55">Questions, custom cakes, quick orders.</p>
              </div>
              <ArrowRight size={18} className="text-tea" />
            </motion.a>
          </motion.section>
        </>
      )}

      <ItemAddSheet
        item={selected}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onConfirm={({ variantId, qty }) => {
          if (!selected) return;
          void addItem({ item: selected, variantId, qty });
        }}
      />
    </div>
  );
}
