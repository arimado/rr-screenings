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

export function parseWeekParam(week: string | undefined | null): Week {
  if (week && /^\d{4}-\d{2}-\d{2}$/.test(week)) {
    return weekFromMonday(mondayOf(week));
  }
  return currentWeek();
}

export function prevMonday(monday: string): string {
  return addDays(monday, -7);
}

export function nextMonday(monday: string): string {
  return addDays(monday, 7);
}
