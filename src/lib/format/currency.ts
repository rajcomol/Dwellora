/**
 * Shared currency formatter for UI.
 * Uses a fixed locale and currency so server-rendered HTML matches client hydration.
 * (Using `undefined` locale makes output depend on Node vs browser defaults, e.g. "US$ 0" vs "$0".)
 */
const FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) {
    return FORMATTER.format(0);
  }
  return FORMATTER.format(value);
}
