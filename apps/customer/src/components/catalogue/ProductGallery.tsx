"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { AnimatePresence, animate, motion, useMotionValue, type PanInfo } from "framer-motion";
import { ChevronLeft, ChevronRight, Maximize2, Minus, Plus, X } from "lucide-react";
import { slideX, springs } from "@/lib/motion";
import { cn } from "@/lib/cn";

const SWIPE = 6000; // offset × velocity threshold for a swipe
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

const swipePower = (offset: number, velocity: number) => Math.abs(offset) * velocity;

/**
 * Product photos: swipe between images, tap thumbnails, tap the photo to open
 * a full-screen viewer with pinch / double-tap / wheel / +- zoom.
 */
export function ProductGallery({
  images,
  alt,
  overlay,
  className,
}: {
  images: string[];
  alt: string;
  /** Badges etc. drawn over the main photo. */
  overlay?: ReactNode;
  className?: string;
}) {
  const [[index, dir], setPage] = useState<[number, number]>([0, 0]);
  const [viewerOpen, setViewerOpen] = useState(false);
  const dragged = useRef(false);
  const many = images.length > 1;
  const go = (next: number) => {
    const wrapped = (next + images.length) % images.length;
    setPage([wrapped, next > index ? 1 : -1]);
  };

  function onDragEnd(_: unknown, { offset, velocity }: PanInfo) {
    // Let the click that follows a drag be ignored (it isn't a tap).
    window.setTimeout(() => (dragged.current = false), 0);
    const power = swipePower(offset.x, velocity.x);
    if (power < -SWIPE) go(index + 1);
    else if (power > SWIPE) go(index - 1);
  }

  return (
    <div className={className}>
      <div className="relative aspect-square w-full overflow-hidden rounded-[24px] bg-cream">
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <motion.button
            key={index}
            type="button"
            custom={dir}
            variants={slideX}
            initial="enter"
            animate="center"
            exit="exit"
            transition={springs.smooth}
            drag={many ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.9}
            onDragStart={() => (dragged.current = true)}
            onDragEnd={onDragEnd}
            onClick={() => {
              if (!dragged.current) setViewerOpen(true);
            }}
            className="absolute inset-0 cursor-zoom-in"
            aria-label={`View ${alt} photo ${index + 1} full screen`}
          >
            <Image
              src={images[index]}
              alt={alt}
              fill
              className="pointer-events-none object-cover"
              sizes="(max-width: 640px) 90vw, 480px"
              unoptimized
              draggable={false}
              priority={index === 0}
            />
          </motion.button>
        </AnimatePresence>

        {overlay}

        <span className="pointer-events-none absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/85 text-deep shadow">
          <Maximize2 size={14} />
        </span>

        {many ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {images.map((_, i) => (
              <span key={i} className="relative h-1.5 w-1.5 rounded-full bg-white/60">
                {i === index ? (
                  <motion.span
                    layoutId={`gallery-dot-${alt}`}
                    className="absolute -inset-x-1.5 inset-y-0 rounded-full bg-white"
                    transition={springs.snappy}
                  />
                ) : null}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {many ? (
        <div className="mt-2.5 flex gap-2 overflow-x-auto no-scrollbar">
          {images.map((src, i) => (
            <motion.button
              key={src + i}
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => go(i)}
              className={cn(
                "relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl transition-opacity",
                i === index ? "opacity-100" : "opacity-60",
              )}
              aria-label={`Photo ${i + 1}`}
            >
              <Image src={src} alt="" fill className="object-cover" sizes="56px" unoptimized />
              {i === index ? (
                <motion.span
                  layoutId={`gallery-thumb-${alt}`}
                  className="absolute inset-0 rounded-2xl ring-2 ring-inset ring-deep"
                  transition={springs.snappy}
                />
              ) : null}
            </motion.button>
          ))}
        </div>
      ) : null}

      <ImageViewer
        open={viewerOpen}
        images={images}
        alt={alt}
        index={index}
        onIndexChange={(i) => go(i)}
        onClose={() => setViewerOpen(false)}
      />
    </div>
  );
}

// ───────────────────────── Full-screen viewer ─────────────────────────

function ImageViewer({
  open,
  images,
  alt,
  index,
  onIndexChange,
  onClose,
}: {
  open: boolean;
  images: string[];
  alt: string;
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [dir, setDir] = useState(0);
  const many = images.length > 1;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && many) step(1);
      if (e.key === "ArrowLeft" && many) step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function step(d: number) {
    setDir(d);
    onIndexChange(index + d);
  }

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="viewer"
          role="dialog"
          aria-modal="true"
          aria-label={`${alt} photos`}
          className="fixed inset-0 z-[60] flex flex-col bg-deep/95 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center justify-between px-4 pt-[calc(12px+var(--safe-top))] text-white">
            <span className="text-sm font-semibold text-white/70">
              {many ? `${index + 1} / ${images.length}` : alt}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
            >
              <X size={20} />
            </button>
          </div>

          <div className="relative flex flex-1 items-center justify-center overflow-hidden">
            <AnimatePresence initial={false} custom={dir} mode="popLayout">
              <motion.div
                key={index}
                custom={dir}
                variants={slideX}
                initial="enter"
                animate="center"
                exit="exit"
                transition={springs.smooth}
                className="absolute inset-0 flex items-center justify-center p-4"
              >
                <ZoomableImage src={images[index]} alt={alt} onSwipe={many ? step : undefined} onSwipeDown={onClose} />
              </motion.div>
            </AnimatePresence>

            {many ? (
              <>
                <button
                  type="button"
                  aria-label="Previous photo"
                  onClick={() => step(-1)}
                  className="absolute left-3 z-10 hidden h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 md:flex"
                >
                  <ChevronLeft size={22} />
                </button>
                <button
                  type="button"
                  aria-label="Next photo"
                  onClick={() => step(1)}
                  className="absolute right-3 z-10 hidden h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 md:flex"
                >
                  <ChevronRight size={22} />
                </button>
              </>
            ) : null}
          </div>

          <p className="pb-[calc(14px+var(--safe-bottom))] text-center text-[11px] text-white/45">
            Pinch or double-tap to zoom · swipe down to close
          </p>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

/**
 * Pinch (two fingers), double-tap / double-click, mouse wheel and +/- buttons
 * all zoom; drag pans while zoomed. At 1× a horizontal swipe changes photo
 * and a downward swipe closes.
 */
function ZoomableImage({
  src,
  alt,
  onSwipe,
  onSwipeDown,
}: {
  src: string;
  alt: string;
  onSwipe?: (dir: number) => void;
  onSwipeDown: () => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pinching, setPinching] = useState(false);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchStart = useRef<{ dist: number; zoom: number } | null>(null);
  const lastTap = useRef(0);
  const downAt = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const clamp = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
  const setZoomTo = (z: number) => {
    const next = clamp(z);
    setZoom(next);
    if (next === 1) {
      void animate(x, 0, springs.smooth);
      void animate(y, 0, springs.smooth);
    }
  };

  const dist = () => {
    const [a, b] = Array.from(pointers.current.values());
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  const zoomed = zoom > 1.01;
  const bounds = {
    left: -((zoom - 1) * box.w) / 2,
    right: ((zoom - 1) * box.w) / 2,
    top: -((zoom - 1) * box.h) / 2,
    bottom: ((zoom - 1) * box.h) / 2,
  };

  function onPanEnd(_: unknown, info: PanInfo) {
    if (zoomed) return;
    const { offset, velocity } = info;
    if (Math.abs(offset.y) > Math.abs(offset.x)) {
      if (offset.y > 110 || velocity.y > 700) onSwipeDown();
    } else if (onSwipe) {
      const power = swipePower(offset.x, velocity.x);
      if (power < -SWIPE) onSwipe(1);
      else if (power > SWIPE) onSwipe(-1);
    }
  }

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <div
        ref={boxRef}
        className="relative h-full max-h-[78dvh] w-full max-w-3xl touch-none select-none"
        onWheel={(e) => setZoomTo(zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15))}
        onPointerDown={(e) => {
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (pointers.current.size === 1) downAt.current = { x: e.clientX, y: e.clientY };
          if (pointers.current.size === 2) {
            pinchStart.current = { dist: dist(), zoom };
            setPinching(true);
          }
        }}
        onPointerMove={(e) => {
          if (!pointers.current.has(e.pointerId)) return;
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (pointers.current.size === 2 && pinchStart.current) {
            setZoom(clamp((pinchStart.current.zoom * dist()) / pinchStart.current.dist));
          }
        }}
        onPointerUp={(e) => {
          const wasSingle = pointers.current.size === 1;
          pointers.current.delete(e.pointerId);
          if (pointers.current.size < 2) {
            pinchStart.current = null;
            setPinching(false);
            if (zoom < 1.05) setZoomTo(1);
          }
          const moved = downAt.current
            ? Math.hypot(e.clientX - downAt.current.x, e.clientY - downAt.current.y)
            : 0;
          if (wasSingle && moved < 10) {
            const now = Date.now();
            if (now - lastTap.current < 280) {
              setZoomTo(zoomed ? 1 : 2.5);
              lastTap.current = 0;
            } else lastTap.current = now;
          }
        }}
        onPointerCancel={(e) => {
          pointers.current.delete(e.pointerId);
          pinchStart.current = null;
          setPinching(false);
        }}
      >
        <motion.div
          className="absolute inset-0"
          style={{ x: zoomed ? x : undefined, y: zoomed ? y : undefined }}
          animate={{ scale: zoom }}
          transition={pinching ? { duration: 0 } : springs.smooth}
          drag={pinching ? false : zoomed ? true : onSwipe ? true : "y"}
          dragConstraints={zoomed ? bounds : { left: 0, right: 0, top: 0, bottom: 0 }}
          dragElastic={zoomed ? 0.08 : 0.6}
          dragMomentum={zoomed}
          onDragEnd={onPanEnd}
        >
          <Image
            src={src}
            alt={alt}
            fill
            className="pointer-events-none object-contain"
            sizes="100vw"
            unoptimized
            draggable={false}
            priority
          />
        </motion.div>
      </div>

      <div className="absolute bottom-2 right-2 z-10 flex items-center gap-1 rounded-full bg-white/10 p-1 text-white backdrop-blur">
        <button
          type="button"
          aria-label="Zoom out"
          disabled={zoom <= MIN_ZOOM}
          onClick={() => setZoomTo(zoom - 0.75)}
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/15 disabled:opacity-30"
        >
          <Minus size={16} />
        </button>
        <span className="min-w-10 text-center text-xs font-semibold tabular-nums">{zoom.toFixed(1)}×</span>
        <button
          type="button"
          aria-label="Zoom in"
          disabled={zoom >= MAX_ZOOM}
          onClick={() => setZoomTo(zoom + 0.75)}
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/15 disabled:opacity-30"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}
