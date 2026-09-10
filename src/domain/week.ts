import { addDays, mondayOf, sydneyYmd } from "./sydney";

export type Week = {
  monday: string;
  sunday: string;
  days: string[];
};

export function weekFromMonday(monday: string): Week {
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  return { monday, sunday: days[6], days };
}

export function currentWeek(now: Date = new Date()): Week {
  return weekFromMonday(mondayOf(sydneyYmd(now)));
}

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export function parseWeekParam(week: string | undefined | null): Week {
  if (week && YMD.test(week)) {
    return weekFromMonday(mondayOf(week));
  }
  return currentWeek();
}

export function parseDayParam(day: string | undefined | null): string | undefined {
  if (day && YMD.test(day)) return day;
  return undefined;
}

/**
 * A valid `day` implies day view (even without `view=day`).
 * `view=day` without a date falls back to today or that week's Monday.
 * Day wins over `week` and `view=film` when they disagree.
 * Old `view=day&week=&day=` links still work.
 */
export function resolveListingsWeek({
  weekParam,
  view,
  dayParam,
  today = sydneyYmd(),
}: {
  weekParam?: string;
  view?: string;
  dayParam?: string;
  today?: string;
}): { week: Week; view?: "day" | "film"; day?: string } {
  const parsed = parseDayParam(dayParam);
  if (parsed) {
    return {
      week: weekFromMonday(mondayOf(parsed)),
      view: "day",
      day: parsed,
    };
  }
  if (view === "day") {
    const week = parseWeekParam(weekParam);
    return {
      week,
      view: "day",
      day: week.days.includes(today) ? today : week.monday,
    };
  }
  if (view === "film") {
    return { week: parseWeekParam(weekParam), view: "film" };
  }
  return { week: parseWeekParam(weekParam) };
}

export function prevMonday(monday: string): string {
  return addDays(monday, -7);
}

export function nextMonday(monday: string): string {
  return addDays(monday, 7);
}
