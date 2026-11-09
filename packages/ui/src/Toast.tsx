"use client";

import { create } from "zustand";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

type ToastItem = { id: number; message: string; actionLabel?: string; onAction?: () => void };

type ToastState = {
  items: ToastItem[];
  show: (message: string, opts?: { actionLabel?: string; onAction?: () => void; ms?: number }) => void;
  dismiss: (id: number) => void;
};

let seq = 1;

export const useToastStore = create<ToastState>((set, get) => ({
  items: [],
  show: (message, opts) => {
    const id = seq++;
    set({ items: [...get().items, { id, message, actionLabel: opts?.actionLabel, onAction: opts?.onAction }] });
    window.setTimeout(() => get().dismiss(id), opts?.ms ?? 4000);
  },
  dismiss: (id) => set({ items: get().items.filter((t) => t.id !== id) }),
}));

export function toast(
  message: string,
  opts?: { actionLabel?: string; onAction?: () => void; ms?: number },
) {
  useToastStore.getState().show(message, opts);
}

export function ToastHost() {
  const items = useToastStore((s) => s.items);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(12px+var(--safe-top))] z-[60] mx-auto flex w-full max-w-[var(--app-max)] flex-col gap-2 px-4">
      <AnimatePresence initial={false}>
        {items.map((item) => (
          <motion.div
            key={item.id}
            layout
            initial={{ opacity: 0, y: -24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.96 }}
            transition={{ type: "spring", damping: 26, stiffness: 340 }}
            className="glass-deep pointer-events-auto flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm text-white shadow-[var(--shadow-float)]"
          >
            <span className="flex items-center gap-2">
              <CheckCircle2 size={18} className="shrink-0 text-blush" />
              {item.message}
            </span>
            {item.actionLabel ? (
              <button
                className="font-semibold text-blush"
                onClick={() => {
                  item.onAction?.();
                  dismiss(item.id);
                }}
              >
                {item.actionLabel}
              </button>
            ) : null}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
