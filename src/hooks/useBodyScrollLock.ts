import { useEffect } from "react";

let lockCount = 0;
let savedScrollY = 0;
let prevBodyOverflow = "";
let prevHtmlOverflow = "";
let prevBodyPosition = "";
let prevBodyTop = "";
let prevBodyWidth = "";
let prevBodyLeft = "";

function applyScrollLock() {
  const body = document.body;
  const html = document.documentElement;
  savedScrollY = window.scrollY || html.scrollTop || 0;

  prevBodyOverflow = body.style.overflow;
  prevHtmlOverflow = html.style.overflow;
  prevBodyPosition = body.style.position;
  prevBodyTop = body.style.top;
  prevBodyWidth = body.style.width;
  prevBodyLeft = body.style.left;

  body.style.overflow = "hidden";
  html.style.overflow = "hidden";
  body.style.position = "fixed";
  body.style.top = `-${savedScrollY}px`;
  body.style.left = "0";
  body.style.width = "100%";
}

function releaseScrollLock() {
  const body = document.body;
  const html = document.documentElement;
  const y = savedScrollY;

  body.style.position = prevBodyPosition;
  body.style.top = prevBodyTop;
  body.style.width = prevBodyWidth;
  body.style.left = prevBodyLeft;
  body.style.overflow = prevBodyOverflow;
  html.style.overflow = prevHtmlOverflow;

  window.scrollTo(0, y);
}

/**
 * Coordinates document scroll lock across overlays (help, mobile nav, chat).
 * Reference counting: first lock applies iOS-safe fixed-body + scroll restore; last unlock restores.
 */
export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;

    lockCount += 1;
    if (lockCount === 1) {
      applyScrollLock();
    }

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        releaseScrollLock();
      }
    };
  }, [locked]);
}
