"use client";

import { cn } from "@/lib/cn";
import { X } from "lucide-react";
import { AnimatePresence, motion, useDragControls, type PanInfo } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const dragControls = useDragControls();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  function onDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.y > 120 || info.velocity.y > 600) onClose();
  }

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <motion.button
            aria-label="Close"
            className="absolute inset-0 bg-deep/35 backdrop-blur-[3px]"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={cn(
              "relative z-10 max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-[32px] bg-white px-5 pb-[calc(20px+var(--safe-bottom))] pt-3 shadow-2xl md:rounded-[32px] md:max-h-[85dvh]",
              className,
            )}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={onDragEnd}
          >
            <div
              className="-mx-5 -mt-3 cursor-grab touch-none px-5 pt-3"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-deep/15" />
            </div>
            <div className="mb-4 flex items-center justify-between gap-3">
              {title ? <h2 className="font-display text-2xl text-deep">{title}</h2> : <span />}
              <button
                onClick={onClose}
                className="pressable flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-off-white text-deep"
                aria-label="Close sheet"
              >
                <X size={18} />
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
