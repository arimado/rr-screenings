import { GoToToday } from "@/components/go-to-today";
import { VenueDot } from "@/components/venue-dot";
import { WeekNavLink } from "@/components/week-nav-link";
import type { DayEntry } from "@/data/group";
import { addDays, formatSydneyDayHeading, formatSydneyWeekRange, mondayOf } from "@/domain/sydney";
import { isDefaultVenueIds } from "@/domain/venue";
import { nextMonday, prevMonday, type Week } from "@/domain/week";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";

export type WeekQuery = {
  venueIds?: string[];
  hide9to5?: boolean;
  oneLeft?: boolean;
  view?: "day" | "film";
  day?: string;
};

export function weekSearchParams(monday: string, q: WeekQuery = {}) {
  const params = new URLSearchParams();
  if (q.view === "day" && q.day) {
    params.set("day", q.day);
  } else {
    params.set("week", monday);
    if (q.view === "day") params.set("view", "day");
    if (q.view === "film") params.set("view", "film");
  }
  if (
    q.venueIds &&
    !isDefaultVenueIds(q.venueIds)
  ) {
    params.set("venues", q.venueIds.length > 0 ? q.venueIds.join(",") : "none");
  }
  if (q.hide9to5) params.set("hide9to5", "1");
  if (q.oneLeft) params.set("oneLeft", "1");
  return params;
}

export function weekHref(monday: string, q: WeekQuery = {}) {
  return `/?${weekSearchParams(monday, q).toString()}`;
}

export function filmHref(slug: string, monday: string, q: WeekQuery = {}) {
  return `/film/${slug}?${weekSearchParams(monday, q).toString()}`;
}

export function WeekNav({
  week,
  query,
  currentMonday,
  today,
  pendingHref,
  onNavigate,
}: {
  week: Week;
  query?: WeekQuery;
  currentMonday: string;
  today: string;
  pendingHref?: string | null;
  onNavigate?: (href: string) => void;
}) {
  const isDay = query?.view === "day";
  const day = query?.day ?? week.monday;
  const prevDay = addDays(day, -1);
  const nextDay = addDays(day, 1);
  const prevHref = isDay
    ? weekHref(mondayOf(prevDay), { ...query, view: "day", day: prevDay })
    : weekHref(prevMonday(week.monday), query);
  const nextHref = isDay
    ? weekHref(mondayOf(nextDay), { ...query, view: "day", day: nextDay })
    : weekHref(nextMonday(week.monday), query);
  const range = formatSydneyWeekRange(week.monday, week.sunday);
  const isCurrentWeek = week.monday === currentMonday;
  const heading = formatSydneyDayHeading(day);
  const isToday = day === today;
  const label = isDay
    ? isToday
      ? "Today"
      : heading
    : isCurrentWeek
      ? "This week"
      : range;
  const ariaLabel = isDay
    ? isToday
      ? `Today, ${heading}`
      : heading
    : isCurrentWeek
      ? `This week, ${range}`
      : range;
  return (
    <div
      className={`flex items-center${pendingHref ? " pointer-events-none" : ""}`}
      aria-busy={Boolean(pendingHref)}
    >
      <div className="flex w-full items-center justify-between rounded-lg border border-input bg-background">
        <WeekNavLink
          href={prevHref}
          label={isDay ? "Previous day" : "Previous week"}
          pending={pendingHref === prevHref}
          onNavigate={onNavigate}
        >
          <ChevronLeftIcon />
        </WeekNavLink>
        <p
          className="min-w-0 flex-1 px-1 text-center text-sm font-medium"
          aria-label={ariaLabel}
        >
          {label}
        </p>
        <WeekNavLink
          href={nextHref}
          label={isDay ? "Next day" : "Next week"}
          pending={pendingHref === nextHref}
          onNavigate={onNavigate}
        >
          <ChevronRightIcon />
        </WeekNavLink>
      </div>
    </div>
  );
}

function EntryCard({ entry, href }: { entry: DayEntry; href: string }) {
  const single = entry.times.length === 1 ? entry.times[0] : null;
  const outbound = single?.bookingUrl;

  const body = (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-[11px] leading-none">
        <VenueDot
          venueId={entry.venueId}
          name={entry.venueName}
          className="size-2"
        />
        <span className="min-w-0 truncate text-muted-foreground/55">
          {entry.venueName}
        </span>
      </p>
      <p className="pl-3.5 text-xs font-medium leading-snug">{entry.title}</p>
      <p className="pl-3.5 text-[11px] leading-tight text-muted-foreground/80">
        {entry.times.map((t) => t.label).join(", ")}
      </p>
    </div>
  );

  const className =
    "block rounded-lg bg-card p-2 text-left transition-colors hover:bg-accent/50";

  if (outbound) {
    return (
      <a
        href={outbound}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {body}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {body}
    </Link>
  );
}

function isModifiedClick(e: React.MouseEvent) {
  return (
    e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0
  );
}

export function WeekGrid({
  days,
  byDay,
  today,
  todayHref,
  monday,
  query,
  showTodayFab = true,
  onNavigate,
}: {
  days: string[];
  byDay: Map<string, DayEntry[]>;
  today: string;
  todayHref: string;
  monday: string;
  query: WeekQuery;
  showTodayFab?: boolean;
  onNavigate?: (href: string) => void;
}) {
  const dayLayout = days.length === 1;
  return (
    <>
      <div
        className={
          dayLayout
            ? "w-full max-w-xl"
            : "grid gap-6 md:grid-cols-7 md:gap-3"
        }
      >
        {days.map((day) => {
          const entries = byDay.get(day) ?? [];
          const isToday = day === today;
          const href = weekHref(monday, { ...query, view: "day", day });
          return (
            <section
              key={day}
              id={isToday ? "today" : undefined}
              className="min-w-0 scroll-mt-3"
            >
              {dayLayout ? null : (
                <h2
                  className={`sticky top-0 mb-1.5 bg-background py-1 text-xs font-medium ${
                    isToday ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  <Link
                    href={href}
                    scroll={false}
                    className="hover:text-foreground hover:underline"
                    onClick={(e) => {
                      if (!onNavigate || isModifiedClick(e)) return;
                      e.preventDefault();
                      onNavigate(href);
                    }}
                  >
                    {formatSydneyDayHeading(day)}
                    {isToday ? " · Today" : ""}
                  </Link>
                </h2>
              )}
              {entries.length === 0 ? (
                <p className="text-xs text-muted-foreground">—</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {entries.map((entry) => (
                    <li key={entry.key}>
                      <EntryCard
                        entry={entry}
                        href={filmHref(entry.slug, monday, query)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
      {showTodayFab ? (
        <GoToToday href={todayHref} todayOnPage={days.includes(today)} />
      ) : null}
    </>
  );
}
