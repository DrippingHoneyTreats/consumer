"use client";

import { create } from "zustand";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, Loader2, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { easeGentle } from "@/lib/motion";

type ToastKind = "default" | "loading" | "success" | "error";

type ToastItem = {
  id: number;
  message: string;
  kind: ToastKind;
  actionLabel?: string;
  onAction?: () => void;
  /** 0–1 for determinate progress; omit for indeterminate */
  progress?: number;
};

type ToastState = {
  items: ToastItem[];
  show: (
    message: string,
    opts?: {
      kind?: ToastKind;
      actionLabel?: string;
      onAction?: () => void;
      ms?: number;
      progress?: number;
      id?: number;
    },
  ) => number;
  update: (
    id: number,
    patch: Partial<Pick<ToastItem, "message" | "kind" | "progress" | "actionLabel" | "onAction">> & {
      ms?: number;
    },
  ) => void;
  dismiss: (id: number) => void;
};

let seq = 1;
const timers = new Map<number, number>();

function clearTimer(id: number) {
  const t = timers.get(id);
  if (t) window.clearTimeout(t);
  timers.delete(id);
}

function scheduleDismiss(id: number, ms: number) {
  clearTimer(id);
  if (ms <= 0) return;
  timers.set(
    id,
    window.setTimeout(() => {
      useToastStore.getState().dismiss(id);
    }, ms),
  );
}

export const useToastStore = create<ToastState>((set, get) => ({
  items: [],
  show: (message, opts) => {
    const id = opts?.id ?? seq++;
    const kind = opts?.kind ?? "default";
    const existing = get().items.find((t) => t.id === id);
    if (existing) {
      get().update(id, {
        message,
        kind,
        progress: opts?.progress,
        actionLabel: opts?.actionLabel,
        onAction: opts?.onAction,
        ms: opts?.ms,
      });
      return id;
    }
    set({
      items: [
        ...get().items,
        {
          id,
          message,
          kind,
          actionLabel: opts?.actionLabel,
          onAction: opts?.onAction,
          progress: opts?.progress,
        },
      ],
    });
    const ms = opts?.ms ?? (kind === "loading" ? 0 : 3200);
    if (ms > 0) scheduleDismiss(id, ms);
    return id;
  },
  update: (id, patch) => {
    const { ms, ...rest } = patch;
    set({
      items: get().items.map((t) => (t.id === id ? { ...t, ...rest } : t)),
    });
    if (typeof ms === "number") scheduleDismiss(id, ms);
    else if (rest.kind && rest.kind !== "loading") scheduleDismiss(id, 2800);
  },
  dismiss: (id) => {
    clearTimer(id);
    set({ items: get().items.filter((t) => t.id !== id) });
  },
}));

type ToastOpts = {
  actionLabel?: string;
  onAction?: () => void;
  ms?: number;
  kind?: ToastKind;
};

function toastFn(message: string, opts?: ToastOpts) {
  return useToastStore.getState().show(message, {
    ...opts,
    kind: opts?.kind ?? "default",
  });
}

toastFn.loading = (message: string, opts?: Omit<ToastOpts, "kind">) =>
  useToastStore.getState().show(message, { ...opts, kind: "loading", ms: 0 });

toastFn.success = (message: string, opts?: Omit<ToastOpts, "kind">) =>
  useToastStore.getState().show(message, { ...opts, kind: "success", ms: opts?.ms ?? 2600 });

toastFn.error = (message: string, opts?: Omit<ToastOpts, "kind">) =>
  useToastStore.getState().show(message, { ...opts, kind: "error", ms: opts?.ms ?? 4200 });

/** Neutral notice (not a success, not an error). Same as calling toast(). */
toastFn.info = (message: string, opts?: Omit<ToastOpts, "kind">) =>
  useToastStore.getState().show(message, { ...opts, kind: "default" });

toastFn.dismiss = (id: number) => useToastStore.getState().dismiss(id);

toastFn.update = (
  id: number,
  patch: Parameters<ToastState["update"]>[1],
) => useToastStore.getState().update(id, patch);

/** Progress toast: loading → success/error, then auto-close. */
toastFn.progress = async <T,>(
  work: () => Promise<T>,
  labels: { loading: string; success: string; error: string },
): Promise<T> => {
  const id = toastFn.loading(labels.loading);
  try {
    const result = await work();
    useToastStore.getState().update(id, {
      message: labels.success,
      kind: "success",
      progress: 1,
      ms: 2400,
    });
    return result;
  } catch (err) {
    useToastStore.getState().update(id, {
      message: labels.error,
      kind: "error",
      ms: 3600,
    });
    throw err;
  }
};

export const toast = toastFn;

function ToastIcon({ kind }: { kind: ToastKind }) {
  if (kind === "loading") {
    return <Loader2 size={16} className="shrink-0 animate-spin text-honey" />;
  }
  if (kind === "error") {
    return <AlertCircle size={16} className="shrink-0 text-danger" />;
  }
  if (kind === "success") {
    return <CheckCircle2 size={16} className="shrink-0 text-honey" />;
  }
  return <Info size={16} className="shrink-0 text-blush" />;
}

export function ToastHost() {
  const items = useToastStore((s) => s.items);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed right-3 top-[calc(12px+var(--safe-top))] z-[60] flex w-[min(100%-24px,320px)] flex-col items-end gap-2 sm:right-5">
      <AnimatePresence initial={false}>
        {items.map((item) => (
          <motion.div
            key={item.id}
            layout
            initial={{ opacity: 0, x: 28, y: -6 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: 20, scale: 0.96 }}
            transition={{ duration: 0.4, ease: easeGentle }}
            role={item.kind === "error" ? "alert" : "status"}
            className={cn(
              "pointer-events-auto w-full overflow-hidden rounded-2xl text-sm shadow-[var(--shadow-float)]",
              // Errors: soft red card, red border, dark-red text. Everything else: dark glass.
              item.kind === "error"
                ? "border border-danger/35 bg-[#fdecea] text-[#7a1a12]"
                : "glass-deep text-white",
            )}
          >
            <div className="flex items-start gap-2.5 px-3.5 py-3">
              <span className="mt-0.5">
                <ToastIcon kind={item.kind} />
              </span>
              <span className="min-w-0 flex-1 leading-snug">{item.message}</span>
              {item.actionLabel ? (
                <button
                  type="button"
                  className={cn("shrink-0 font-semibold", item.kind === "error" ? "text-danger underline underline-offset-2" : "text-blush")}
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
                    item.kind === "error"
                      ? "text-danger/60 hover:bg-danger/10 hover:text-danger"
                      : "text-white/50 hover:bg-white/10 hover:text-white",
                  )}
                  onClick={() => dismiss(item.id)}
                >
                  <X size={14} />
                </button>
              )}
            </div>
            {item.kind === "loading" ? (
              <div className="h-0.5 w-full overflow-hidden bg-white/10">
                <motion.div
                  className="h-full w-1/2 rounded-full bg-honey"
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
            ) : item.kind === "success" ? (
              <motion.div
                className="h-0.5 origin-left bg-honey"
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: 2.2, ease: "linear" }}
              />
            ) : item.kind === "error" ? (
              <motion.div
                className="h-0.5 origin-left bg-danger/60"
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: 4, ease: "linear" }}
              />
            ) : null}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
