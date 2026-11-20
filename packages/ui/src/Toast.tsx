"use client";

import { create } from "zustand";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "./cn";

/**
 * Shared toasts (used by the admin app).
 *   toast.success("Item created")  dark card, gold tick
 *   toast.error("Upload failed")   soft red card, red border, dark-red text
 *   toast("Note") / toast.info()   dark card, info icon
 */
export type ToastKind = "info" | "success" | "error";

type ToastItem = { id: number; message: string; kind: ToastKind; actionLabel?: string; onAction?: () => void };

type ShowOpts = { kind?: ToastKind; actionLabel?: string; onAction?: () => void; ms?: number };

type ToastState = {
  items: ToastItem[];
  show: (message: string, opts?: ShowOpts) => void;
  dismiss: (id: number) => void;
};

let seq = 1;

export const useToastStore = create<ToastState>((set, get) => ({
  items: [],
  show: (message, opts) => {
    const id = seq++;
    const kind = opts?.kind ?? "info";
    set({ items: [...get().items, { id, message, kind, actionLabel: opts?.actionLabel, onAction: opts?.onAction }] });
    window.setTimeout(() => get().dismiss(id), opts?.ms ?? (kind === "error" ? 5000 : 3500));
  },
  dismiss: (id) => set({ items: get().items.filter((t) => t.id !== id) }),
}));

type Opts = Omit<ShowOpts, "kind">;

function toastFn(message: string, opts?: ShowOpts) {
  useToastStore.getState().show(message, opts);
}
toastFn.info = (message: string, opts?: Opts) => useToastStore.getState().show(message, { ...opts, kind: "info" });
toastFn.success = (message: string, opts?: Opts) => useToastStore.getState().show(message, { ...opts, kind: "success" });
toastFn.error = (message: string, opts?: Opts) => useToastStore.getState().show(message, { ...opts, kind: "error" });

export const toast = toastFn;

function Icon({ kind }: { kind: ToastKind }) {
  if (kind === "error") return <AlertCircle size={18} className="shrink-0 text-danger" />;
  if (kind === "success") return <CheckCircle2 size={18} className="shrink-0 text-honey" />;
  return <Info size={18} className="shrink-0 text-blush" />;
}

export function ToastHost() {
  const items = useToastStore((s) => s.items);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(12px+var(--safe-top))] z-[60] mx-auto flex w-full max-w-[var(--app-max)] flex-col gap-2 px-4">
      <AnimatePresence initial={false}>
        {items.map((item) => {
          const error = item.kind === "error";
          return (
            <motion.div
              key={item.id}
              layout
              role={error ? "alert" : "status"}
              initial={{ opacity: 0, y: -24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.96 }}
              transition={{ type: "spring", damping: 26, stiffness: 340 }}
              className={cn(
                "pointer-events-auto flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm shadow-[var(--shadow-float)]",
                error ? "border border-danger/35 bg-[#fdecea] text-[#7a1a12]" : "glass-deep text-white",
              )}
            >
              <span className="flex min-w-0 items-center gap-2">
                <Icon kind={item.kind} />
                <span className="leading-snug">{item.message}</span>
              </span>
              {item.actionLabel ? (
                <button
                  className={cn("shrink-0 font-semibold", error ? "text-danger underline underline-offset-2" : "text-blush")}
                  onClick={() => {
                    item.onAction?.();
                    dismiss(item.id);
                  }}
                >
                  {item.actionLabel}
                </button>
              ) : (
                <button
                  type="button"
                  aria-label="Dismiss"
                  className={cn(
                    "shrink-0 rounded-full p-0.5",
                    error ? "text-danger/60 hover:bg-danger/10 hover:text-danger" : "text-white/50 hover:bg-white/10 hover:text-white",
                  )}
                  onClick={() => dismiss(item.id)}
                >
                  <X size={14} />
                </button>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
