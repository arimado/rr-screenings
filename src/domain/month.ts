import { addDays, mondayOf, sydneyYmd } from "./sydney";
import { weekFromMonday, type Week } from "./week";

export type Month = {
  yearMonth: string;
  weeks: Week[];
  days: string[];
};

const YM = /^\d{4}-(0[1-9]|1[0-2])$/;

export function yearMonthOf(ymd: string): string {
  return ymd.slice(0, 7);
}

export function firstDayOfMonth(yearMonth: string): string {
  return `${yearMonth}-01`;
}

export function lastDayOfMonth(yearMonth: string): string {
  const [y, m] = yearMonth.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

/** First Monday whose Sydney date falls inside the month. */
export function firstMondayInMonth(yearMonth: string): string {
  const monday = mondayOf(firstDayOfMonth(yearMonth));
  return monday.startsWith(yearMonth) ? monday : addDays(monday, 7);
}

export function monthFromYyyyMm(yearMonth: string): Month {
  const startMonday = mondayOf(firstDayOfMonth(yearMonth));
  const endMonday = mondayOf(lastDayOfMonth(yearMonth));
  const weeks: Week[] = [];
  const days: string[] = [];
  for (
    let monday = startMonday;
    monday <= endMonday;
    monday = addDays(monday, 7)
  ) {
    const week = weekFromMonday(monday);
    weeks.push(week);
    days.push(...week.days);
  }
  return { yearMonth, weeks, days };
}

export function currentMonth(now: Date = new Date()): Month {
  return monthFromYyyyMm(yearMonthOf(sydneyYmd(now)));
}

export function parseMonthParam(
  month: string | undefined | null,
): Month {
  if (month && YM.test(month)) {
    return monthFromYyyyMm(month);
  }
  return currentMonth();
}

export function prevMonth(yearMonth: string): string {
  const [y, m] = yearMonth.split("-").map(Number);
  return new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7);
}

export function nextMonth(yearMonth: string): string {
  const [y, m] = yearMonth.split("-").map(Number);
  return new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7);
}
