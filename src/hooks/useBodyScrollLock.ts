import { useEffect } from "react";

/**
 * Locks document scroll while `locked` is true (restores previous overflow on cleanup).
 * Also sets `html` — needed on iOS Safari where `body` alone may not stop background scroll.
 */
export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, [locked]);
}
