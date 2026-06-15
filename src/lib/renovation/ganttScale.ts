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

function daysBetweenInclusive(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)) + 1);
}

function addCalendarDaysIso(iso: string, deltaDays: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  dt.setDate(dt.getDate() + deltaDays);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function dayOffsetFrom(rangeStart: Date, date: Date): number {
  return Math.max(0, Math.round((date.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)));
}

const MONTH_NAMES = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

function buildMonthsInRange(rangeStart: Date, rangeEnd: Date): GanttMonth[] {
  const months: GanttMonth[] = [];
  let cursor = new Date(rangeStart);
  let dayOffset = 0;

  while (cursor < rangeEnd) {
    const monthStart = new Date(cursor);
    const nextMonth = addMonths(monthStart, 1);
    const monthEnd = nextMonth < rangeEnd ? nextMonth : rangeEnd;
    const actualDays = Math.max(
      1,
      Math.round((monthEnd.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24))
    );

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

  return months;
}

/** @deprecated Prefer buildGanttScaleFromWindow for planning hub. */
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

  const totalDays = daysBetweenInclusive(rangeStart, new Date(rangeEnd.getTime() - 1));
  return { rangeStart, rangeEnd, totalDays, months: buildMonthsInRange(rangeStart, rangeEnd) };
}

/**
 * Gantt window anchored on project planning start: [startIso, startIso + totalDays).
 * Month columns span this full window.
 */
export function buildGanttScaleFromWindow(startIso: string, totalDays: number): GanttScale {
  const spanDays = Math.max(totalDays, 1);
  const rangeStart = parseIso(startIso);
  const rangeEnd = parseIso(addCalendarDaysIso(startIso, spanDays));
  const totalWindowDays = daysBetweenInclusive(rangeStart, new Date(rangeEnd.getTime() - 86400000));
  return {
    rangeStart,
    rangeEnd,
    totalDays: totalWindowDays,
    months: buildMonthsInRange(rangeStart, rangeEnd),
  };
}

export function barPositionPercent(
  scale: GanttScale,
  startIso: string | null,
  spanDays: number
): { left: number; width: number } | null {
  if (!startIso) return null;
  const endIso = addCalendarDaysIso(startIso, Math.max(spanDays, 1) - 1);
  return barPositionPercentForDates(scale, startIso, endIso);
}

export function barPositionPercentForDates(
  scale: GanttScale,
  startIso: string,
  endIso: string
): { left: number; width: number } {
  const startOffset = dayOffsetFrom(scale.rangeStart, parseIso(startIso));
  const endOffset = dayOffsetFrom(scale.rangeStart, parseIso(endIso));
  const widthDays = Math.max(1, endOffset - startOffset + 1);
  const left = (startOffset / scale.totalDays) * 100;
  const width = (widthDays / scale.totalDays) * 100;
  return { left: Math.min(left, 99), width: Math.min(width, 100 - left) };
}
