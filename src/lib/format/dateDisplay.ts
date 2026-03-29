/**
 * User-facing calendar dates as dd-mm-yyyy.
 * Plain YYYY-MM-DD from the DB is formatted without timezone shifts.
 */
export function formatDisplayDate(value: string | null | undefined): string {
  if (value == null) return "";
  const s = String(value).trim();
  if (s === "") return "";

  const isoDateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (isoDateOnly) {
    const [, y, m, d] = isoDateOnly;
    return `${d}-${m}-${y}`;
  }

  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;

  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  return `${dd}-${mm}-${yyyy}`;
}
