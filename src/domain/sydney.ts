export const SYDNEY = "Australia/Sydney";

export function sydneyYmd(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SYDNEY,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function instantToSydneyYmd(iso: string): string {
  return sydneyYmd(new Date(iso));
}

export function formatSydneyTime(iso: string): string {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: SYDNEY,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

export function formatSydneyDayHeading(ymd: string): string {
  const utcNoon = ymdToUtcNoon(ymd);
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: SYDNEY,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(utcNoon);
}

function ymdToUtcNoon(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

export function sydneyWeekdayMon0(ymd: string): number {
  const name = new Intl.DateTimeFormat("en-US", {
    timeZone: SYDNEY,
    weekday: "short",
  }).format(ymdToUtcNoon(ymd));
  const map: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };
  return map[name] ?? 0;
}

export function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function mondayOf(ymd: string): string {
  return addDays(ymd, -sydneyWeekdayMon0(ymd));
}

/** Civil time in Sydney → ISO instant. */
export function sydneyLocalToIso(
  ymd: string,
  hour: number,
  minute: number,
): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const utcGuess = Date.UTC(y, m - 1, d, hour, minute, 0);
  const offsetMs = tzOffsetMs(new Date(utcGuess), SYDNEY);
  const instant = new Date(utcGuess - offsetMs);
  const offsetMs2 = tzOffsetMs(instant, SYDNEY);
  if (offsetMs2 !== offsetMs) {
    return new Date(utcGuess - offsetMs2).toISOString();
  }
  return instant.toISOString();
}

export function sydneyMinutesPastMidnight(iso: string): number {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: SYDNEY,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const hour = Number(parts.find((p) => p.type === "hour")?.value);
  const minute = Number(parts.find((p) => p.type === "minute")?.value);
  return hour * 60 + minute;
}

/** Mon–Fri, 9:00 inclusive to 17:00 exclusive (Sydney). */
export function isWeekdayNineToFive(iso: string): boolean {
  const dow = sydneyWeekdayMon0(instantToSydneyYmd(iso));
  if (dow > 4) return false;
  const mins = sydneyMinutesPastMidnight(iso);
  return mins >= 9 * 60 && mins < 17 * 60;
}

function tzOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value);
  const asUTC = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return asUTC - date.getTime();
}
