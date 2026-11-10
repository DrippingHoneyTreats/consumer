"use client";

import { useEffect, useState } from "react";

/** False when the tab/app is backgrounded — pause infinite motion to avoid mobile GPU crashes. */
export function usePageVisible() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const sync = () => setVisible(document.visibilityState === "visible");
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  return visible;
}
