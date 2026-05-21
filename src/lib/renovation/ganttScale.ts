export type GanttMonth = {
  label: string;
  year: number;
  month: number;
  startDay: number;
  dayCount: number;
};

export type GanttScale = {
  rangeStart: Date;
  rangeEnd: Date;
  totalDays: number;
  months: GanttMonth[];
};

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function daysBetween(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)) + 1);
}

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

const MONTH_NAMES = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

export function buildGanttScale(dateIsos: string[]): GanttScale {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let rangeStart = startOfMonth(today);
  let rangeEnd = addMonths(rangeStart, 3);
  rangeEnd.setDate(0);
  rangeEnd.setDate(rangeEnd.getDate() + 1);

  const parsed = dateIsos.filter(Boolean).map(parseIso);
  if (parsed.length > 0) {
    const min = new Date(Math.min(...parsed.map((d) => d.getTime())));
    const max = new Date(Math.max(...parsed.map((d) => d.getTime())));
    rangeStart = startOfMonth(min);
    rangeEnd = addMonths(startOfMonth(max), 2);
    rangeEnd.setDate(0);
    rangeEnd.setDate(rangeEnd.getDate() + 1);
  }

  const totalDays = daysBetween(rangeStart, rangeEnd);
  const months: GanttMonth[] = [];
  let cursor = new Date(rangeStart);
  let dayOffset = 0;

  while (cursor < rangeEnd) {
    const monthStart = new Date(cursor);
    const nextMonth = addMonths(monthStart, 1);
    const monthEnd = nextMonth < rangeEnd ? nextMonth : rangeEnd;
    const dayCount = daysBetween(monthStart, monthEnd) - (monthEnd.getTime() === nextMonth.getTime() ? 1 : 0);
    const actualDays = Math.max(1, Math.round((monthEnd.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24)));

    months.push({
      label: `${MONTH_NAMES[monthStart.getMonth()]} ${monthStart.getFullYear()}`,
      year: monthStart.getFullYear(),
      month: monthStart.getMonth(),
      startDay: dayOffset,
      dayCount: actualDays,
    });

    dayOffset += actualDays;
    cursor = nextMonth;
  }

  return { rangeStart, rangeEnd, totalDays, months };
}

export function barPositionPercent(
  scale: GanttScale,
  startIso: string | null,
  spanDays: number
): { left: number; width: number } | null {
  if (!startIso) return null;
  const start = parseIso(startIso);
  const startOffset = Math.max(
    0,
    Math.round((start.getTime() - scale.rangeStart.getTime()) / (1000 * 60 * 60 * 24))
  );
  const widthDays = Math.max(1, spanDays);
  const left = (startOffset / scale.totalDays) * 100;
  const width = (widthDays / scale.totalDays) * 100;
  return { left: Math.min(left, 99), width: Math.min(width, 100 - left) };
}
