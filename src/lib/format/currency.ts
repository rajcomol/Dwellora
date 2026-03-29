/**
 * Shared currency formatter for UI.
 * Uses a fixed locale and currency so server-rendered HTML matches client hydration.
 */
const FORMATTER = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) {
    return FORMATTER.format(0);
  }
  return FORMATTER.format(value);
}
