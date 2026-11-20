"use client";

import { useEffect } from "react";

/**
 * If any image fails (Cloudinary/network down, deleted photo), hide it so the
 * container's plain grey background shows instead of a broken-image icon.
 * Un-hides it again if a later src loads (e.g. gallery swipes).
 */
export function useHideBrokenImages() {
  useEffect(() => {
    const onError = (e: Event) => {
      if (e.target instanceof HTMLImageElement) e.target.style.visibility = "hidden";
    };
    const onLoad = (e: Event) => {
      if (e.target instanceof HTMLImageElement && e.target.style.visibility === "hidden") {
        e.target.style.visibility = "";
      }
    };
    // Image load/error events don't bubble, so listen in the capture phase.
    window.addEventListener("error", onError, true);
    window.addEventListener("load", onLoad, true);
    return () => {
      window.removeEventListener("error", onError, true);
      window.removeEventListener("load", onLoad, true);
    };
  }, []);
}
