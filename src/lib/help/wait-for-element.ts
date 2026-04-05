/**
 * Waits until `selector` matches a connected element, or timeout.
 * Used after route changes and async layout (skeletons).
 */
export async function waitForElement(selector: string, timeoutMs = 8000, pollMs = 50): Promise<HTMLElement | null> {
  const start = Date.now();
  return new Promise((resolve) => {
    function tick() {
      try {
        const el = document.querySelector(selector);
        if (el instanceof HTMLElement && el.isConnected) {
          resolve(el);
          return;
        }
      } catch {
        /* invalid selector */
      }
      if (Date.now() - start >= timeoutMs) {
        resolve(null);
        return;
      }
      window.setTimeout(tick, pollMs);
    }
    tick();
  });
}
