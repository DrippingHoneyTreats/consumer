"use client";

import { MotionConfig } from "framer-motion";
import { ToastHost } from "@/components/ui/Toast";

/** Admin shell already refreshes auth; this stays available for isolated pages. */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      {children}
      <ToastHost />
    </MotionConfig>
  );
}
