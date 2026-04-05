/**
 * Matches react-joyride's visibility check: any ancestor with display:none or visibility:hidden fails.
 */
export function isTourTargetVisible(element: HTMLElement): boolean {
  let parent: HTMLElement | null = element;
  while (parent && parent !== document.body) {
    const { display, visibility } = getComputedStyle(parent);
    if (display === "none" || visibility === "hidden") {
      return false;
    }
    parent = parent.parentElement;
  }
  return true;
}

/** First matching selector hit that is visible (responsive duplicates e.g. desktop vs mobile nav). */
export function getFirstVisibleTourTarget(selector: string): HTMLElement | null {
  let nodes: NodeListOf<Element>;
  try {
    nodes = document.querySelectorAll(selector);
  } catch {
    return null;
  }
  for (let i = 0; i < nodes.length; i++) {
    const el = nodes[i];
    if (el instanceof HTMLElement && el.isConnected && isTourTargetVisible(el)) {
      return el;
    }
  }
  return null;
}
