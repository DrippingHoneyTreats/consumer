"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  MapPin,
  MessageCircle,
  PartyPopper,
  Plus,
  Search,
  SlidersHorizontal,
  UtensilsCrossed,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { asArray, unwrapData } from "@/lib/data";
import { formatNgn, greetingForNow, whatsappLink } from "@/lib/format";
import {
  BANNER_PLACEHOLDER,
  EVENTS_BANNER,
  ITEM_PLACEHOLDER,
  LOGO,
  categoryImage,
  toneFor,
} from "@/lib/placeholders";
import type { Banner, Category, HomePayload, Item } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";
import { useCartActions } from "@/hooks/useCartActions";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { ItemAddSheet } from "@/components/catalogue/ItemAddSheet";
import { EmptyState, OfflineState } from "@/components/ui/EmptyState";
import { ColumnLoader } from "@/components/ui/ColumnLoader";
import { cn } from "@/lib/cn";

const SLIDE_MS = 4500;
const ease = [0.22, 1, 0.36, 1] as const;

function SectionTitle({ title, href, linkLabel = "See all" }: { title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-3 flex items-end justify-between">
      <h2 className="font-display text-[21px] leading-none text-deep">{title}</h2>
      {href ? (
        <Link href={href} className="flex items-center gap-0.5 text-xs font-semibold text-tea">
          {linkLabel} <ArrowRight size={13} />
        </Link>
      ) : null}
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div className="space-y-5">
      <div className="skeleton aspect-[16/8] w-full rounded-[30px] md:aspect-[21/8]" />
      <div className="skeleton h-6 w-1/2" />
      <ColumnLoader count={4} columns={2} aspect="aspect-[5/4]" />
    </div>
  );
}

function PromoCarousel({ banners }: { banners: Banner[] }) {
  const slides = banners.slice(0, 5);
  const [[idx, dir], setPage] = useState<[number, number]>([0, 1]);
  const [paused, setPaused] = useState(false);
  const dragged = useRef(false);

  const go = useCallback(
    (step: number) => setPage(([i]) => [(i + step + slides.length) % slides.length, step]),
    [slides.length],
  );

  useEffect(() => {
    if (slides.length <= 1 || paused) return;
    const t = window.setTimeout(() => go(1), SLIDE_MS);
    return () => clearTimeout(t);
  }, [idx, paused, slides.length, go]);

  function onDragEnd(_: unknown, info: PanInfo) {
    setPaused(false);
    if (info.offset.x < -50 || info.velocity.x < -400) go(1);
    else if (info.offset.x > 50 || info.velocity.x > 400) go(-1);
  }

  const slide = slides[idx];
  const href = slide.ctaTarget?.startsWith("/") ? slide.ctaTarget : undefined;

  return (
    <div className="relative aspect-[16/8] overflow-hidden rounded-[30px] bg-hero shadow-[var(--shadow-card)] md:aspect-[21/8] lg:aspect-[24/8]">
      <AnimatePresence initial={false} custom={dir}>
        <motion.div
          key={slide.id}
          custom={dir}
          variants={{
            enter: (d: number) => ({ x: d > 0 ? "100%" : "-100%", opacity: 0.6 }),
            centre: { x: 0, opacity: 1 },
            exit: (d: number) => ({ x: d > 0 ? "-35%" : "35%", opacity: 0 }),
          }}
          initial="enter"
          animate="centre"
          exit="exit"
          transition={{ type: "spring", stiffness: 260, damping: 32 }}
          drag={slides.length > 1 ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.4}
          onPointerDown={() => {
            dragged.current = false;
          }}
          onDragStart={() => {
            dragged.current = true;
            setPaused(true);
          }}
          onDragEnd={onDragEnd}
          className="absolute inset-0 cursor-grab active:cursor-grabbing"
        >
          {href ? (
            <Link
              href={href}
              draggable={false}
              aria-label={slide.title}
              className="absolute inset-0 z-10"
              onClick={(e) => {
                if (dragged.current) e.preventDefault();
              }}
            />
          ) : null}
          <Image
            src={slide.image || BANNER_PLACEHOLDER}
            alt={slide.title}
            fill
            draggable={false}
            className="pointer-events-none object-cover object-left"
            sizes="480px"
            unoptimized
            priority
          />
        </motion.div>
      </AnimatePresence>

      {slides.length > 1 ? (
        <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 rounded-full bg-white/70 px-2 py-1.5 backdrop-blur">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={`Show slide ${i + 1}`}
              onClick={() => setPage([i, i > idx ? 1 : -1])}
              className={cn(
                "relative h-1.5 overflow-hidden rounded-full bg-deep/20 transition-all duration-300",
                i === idx ? "w-6" : "w-1.5",
              )}
            >
              {i === idx && !paused ? (
                <motion.span
                  key={idx}
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: SLIDE_MS / 1000, ease: "linear" }}
                  className="absolute inset-y-0 left-0 rounded-full bg-deep"
                />
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CategoryTile({ cat, index, wide }: { cat: Category; index: number; wide: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.94 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, delay: index * 0.06, ease }}
      whileTap={{ scale: 0.97 }}
      className={cn(wide && "col-span-2")}
    >
      <Link
        href={`/pastries/${cat.slug}`}
        className={cn(
          "group relative flex h-full flex-col justify-between overflow-hidden rounded-[26px] p-3.5 shadow-[var(--shadow-card)]",
          wide ? "bg-deep text-white" : cn(toneFor(index), "text-deep"),
        )}
      >
        <span
          className={cn(
            "pointer-events-none absolute -bottom-10 -left-8 h-28 w-28 rounded-full",
            wide ? "bg-white/10" : "bg-white/45",
          )}
        />
        <p className={cn("relative z-10 max-w-[56%] font-display leading-[1.1]", wide ? "text-[22px]" : "text-[19px]")}>
          {cat.name}
        </p>
        <div
          className={cn("animate-float pointer-events-none absolute bottom-2 right-2 top-2", wide ? "w-[34%]" : "w-[42%]")}
          style={{ animationDelay: `${index * 0.6}s`, ["--float-rot" as string]: index % 2 ? "3deg" : "-3deg" }}
        >
          <div className="relative h-full w-full overflow-hidden rounded-[20px] shadow-[var(--shadow-float)] ring-[3px] ring-white/70">
            <Image src={categoryImage(cat)} alt="" fill className="object-cover" sizes="160px" unoptimized />
          </div>
          <span
            className={cn(
              "absolute -bottom-1 -left-2 flex h-8 w-8 items-center justify-center rounded-full shadow-md transition group-hover:rotate-45",
              wide ? "bg-blush text-deep" : "bg-white text-deep",
            )}
          >
            <ArrowUpRight size={15} />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

function CategoryGrid({ categories }: { categories: Category[] }) {
  const tiles = categories.slice(0, 5);
  return (
    <div className="grid auto-rows-[118px] grid-cols-2 gap-3 md:auto-rows-[140px] md:grid-cols-3 lg:auto-rows-[160px] lg:grid-cols-4">
      {tiles.map((cat, i) => (
        <CategoryTile
          key={cat.id}
          cat={cat}
          index={i}
          wide={i === tiles.length - 1 && tiles.length % 2 === 1}
        />
      ))}
    </div>
  );
}

function PickCard({ item, index, onOpen }: { item: Item; index: number; onOpen: () => void }) {
  const soldOut = item.status === "sold_out";
  return (
    <motion.li
      initial={{ opacity: 0, x: 24 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, delay: Math.min(index, 5) * 0.06, ease }}
      className="w-[42%] shrink-0 snap-start sm:w-[30%] md:w-[22%] lg:w-[18%]"
    >
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "pressable flex w-full flex-col rounded-[24px] border border-deep/5 bg-white p-2 text-left shadow-[var(--shadow-card)]",
          soldOut && "opacity-60",
        )}
      >
        <span className={cn("relative block aspect-square overflow-hidden rounded-[18px]", toneFor(index))}>
          <Image src={item.images?.[0] || ITEM_PLACEHOLDER} alt="" fill className="object-cover" sizes="200px" unoptimized />
          {item.status === "few_left" ? (
            <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-blush-deep">
              Few left
            </span>
          ) : null}
        </span>
        <span className="mt-2 line-clamp-1 px-1 text-[13px] font-semibold text-deep">{item.name}</span>
        <span className="flex items-center justify-between px-1 pb-0.5 pt-1">
          <span className="font-display text-[15px] font-semibold text-deep">{formatNgn(item.basePrice)}</span>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-deep text-white">
            <Plus size={15} />
          </span>
        </span>
      </button>
    </motion.li>
  );
}

export default function HomePage() {
  const user = useAuthStore((s) => s.user);
  const { addItem } = useCartActions();
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [home, setHome] = useState<HomePayload>({ banners: [], categories: [] });
  const [picks, setPicks] = useState<Item[]>([]);
  const [picksLoading, setPicksLoading] = useState(false);
  const [greeting, setGreeting] = useState("Welcome");
  const [selected, setSelected] = useState<Item | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    setGreeting(greetingForNow(user?.fullName));
  }, [user?.fullName]);

  const load = useCallback(async () => {
    setState("loading");
    setPicks([]);
    try {
      const res = await apiClient.get<HomePayload | { data: HomePayload }>("/home");
      const payload = unwrapData(res) ?? (res as HomePayload);
      const categories = asArray<Category>(payload.categories);
      setHome({ banners: asArray(payload.banners), categories, settings: payload.settings });
      setState("ready");

      if (!categories.length) {
        setPicksLoading(false);
        return;
      }
      setPicksLoading(true);
      const lists = await Promise.allSettled(
        categories.slice(0, 3).map((c) => apiClient.get<Item[] | { data: Item[] }>(`/categories/${c.slug}/items`)),
      );
      const items = lists.flatMap((r) => (r.status === "fulfilled" ? asArray<Item>(r.value) : []));
      setPicks(
        items.sort((a, b) => Number(a.status === "sold_out") - Number(b.status === "sold_out")).slice(0, 8),
      );
      setPicksLoading(false);
    } catch {
      setPicksLoading(false);
      setState("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const whatsapp = home.settings?.whatsappNumber || process.env.NEXT_PUBLIC_WHATSAPP || "2348000000000";

  return (
    <div className="page-pad space-y-6">
      <header className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="min-w-0 flex-1"
          >
            <Link
              href="/account/addresses"
              className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-sage-soft px-2.5 py-1 text-[11px] font-semibold text-deep"
            >
              <MapPin size={12} className="text-tea" />
              Delivering in Lagos
              <ChevronDown size={12} />
            </Link>
            <p className="truncate font-display text-[22px] leading-tight text-deep md:text-[26px]">{greeting}</p>
            <p className="text-sm text-deep/55">Order pastries or book an event.</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="shrink-0 pt-0.5"
          >
            <BrandLogo size="lg" />
          </motion.div>
        </div>

        <Link
          href="/pastries?focus=1"
          className="glass pressable flex min-h-13 items-center gap-3 rounded-full border border-white/80 py-1.5 pl-4 pr-1.5 shadow-[var(--shadow-card)]"
        >
          <Search size={18} className="shrink-0 text-tea" />
          <span className="flex-1 truncate text-sm text-deep/45">Search cakes, chinchin, meat pies…</span>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-deep text-white">
            <SlidersHorizontal size={16} />
          </span>
        </Link>
      </header>

      {state === "loading" ? (
        <HomeSkeleton />
      ) : state === "error" ? (
        <OfflineState onRetry={() => void load()} />
      ) : (
        <>
          <motion.section initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.45, ease }}>
            {home.banners.length ? (
              <PromoCarousel banners={home.banners} />
            ) : (
              <EmptyState
                compact
                className="min-h-[140px] rounded-[30px]"
                image={LOGO}
                title="No promos yet"
                message="Offers and seasonal banners will show here when the kitchen posts them."
              />
            )}
          </motion.section>

          <section>
            <SectionTitle title="What are you craving?" href={home.categories.length ? "/pastries" : undefined} />
            {home.categories.length ? (
              <CategoryGrid categories={home.categories} />
            ) : (
              <EmptyState
                compact
                image={LOGO}
                icon={<UtensilsCrossed size={22} />}
                title="Menu coming soon"
                message="No pastries uploaded yet. Check back shortly."
              />
            )}
          </section>

          {home.categories.length ? (
            <section>
              <SectionTitle title="Fresh picks for you" href="/pastries" />
              {picksLoading ? (
                <ColumnLoader count={4} columns={2} aspect="aspect-square" />
              ) : picks.length ? (
                <ul className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2">
                  {picks.map((item, i) => (
                    <PickCard
                      key={item.id}
                      item={item}
                      index={i}
                      onOpen={() => {
                        setSelected(item);
                        setSheetOpen(true);
                      }}
                    />
                  ))}
                </ul>
              ) : (
                <EmptyState
                  compact
                  image={LOGO}
                  title="No products yet"
                  message="Products will appear here once the kitchen uploads them."
                />
              )}
            </section>
          ) : null}

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.5, ease }}
          >
            <Link
              href="/events"
              className="pressable relative flex min-h-[150px] overflow-hidden rounded-[30px] bg-deep p-5 text-white shadow-[var(--shadow-float)]"
            >
              <span className="absolute -right-10 -top-12 h-44 w-44 rounded-full bg-white/10" />
              <span className="absolute -bottom-16 right-16 h-32 w-32 rounded-full bg-blush/20" />
              <div className="relative z-10 flex max-w-[60%] flex-col justify-between gap-3">
                <div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                    <PartyPopper size={11} /> Events
                  </span>
                  <p className="mt-2 font-display text-[22px] leading-[1.15]">Planning a celebration?</p>
                  <p className="mt-1 text-xs text-white/70">Birthdays, hangouts and owambe. We cater it all.</p>
                </div>
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-blush px-4 py-2 text-xs font-semibold text-deep">
                  Book us now <ArrowRight size={14} />
                </span>
              </div>
              <div className="absolute -right-10 bottom-3 top-3 w-[44%] overflow-hidden rounded-[24px] ring-4 ring-white/15">
                <Image src={EVENTS_BANNER} alt="" fill className="object-cover object-right" sizes="220px" unoptimized />
              </div>
            </Link>
          </motion.section>

          <a
            href={whatsappLink(whatsapp, "Hi DHT, I have a question about an order")}
            target="_blank"
            rel="noreferrer"
            className="pressable flex items-center gap-3 rounded-[24px] bg-blush-soft p-3.5"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-deep">
              <MessageCircle size={19} />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold text-deep">Need help?</span>
              <span className="block text-xs text-deep/55">Chat with us on WhatsApp</span>
            </span>
            <ArrowUpRight size={18} className="text-deep/50" />
          </a>
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
