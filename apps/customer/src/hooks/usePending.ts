"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * For custom (non-<Button>) controls: `track(promise)` shows a pending state
 * until it settles and ignores taps meanwhile.
 *
 *   const [pending, track] = usePending();
 *   <button disabled={pending} onClick={() => track(save())}>{pending ? <Spinner /> : "Save"}</button>
 */
export function usePending(): [boolean, (work: void | Promise<unknown>) => void] {
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true; // re-mounts (React dev/StrictMode) must turn this back on
    return () => {
      alive.current = false;
    };
  }, []);
  const track = useCallback((work: void | Promise<unknown>) => {
    if (!work || typeof (work as Promise<unknown>).then !== "function" || busy.current) return;
    busy.current = true;
    setPending(true);
    (work as Promise<unknown>)
      .catch(() => {})
      .finally(() => {
        busy.current = false;
        if (alive.current) setPending(false);
      });
  }, []);
  return [pending, track];
}

/** Small round spinner that inherits the text colour. */
export const spinnerClass = "inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent";
