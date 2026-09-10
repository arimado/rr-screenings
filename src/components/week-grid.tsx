import { StickyDayHeading } from "@/components/sticky-day-heading";
import { VenueDot } from "@/components/venue-dot";
import { WeekNavLabel } from "@/components/week-nav-label";
import { WeekNavLink } from "@/components/week-nav-link";
import type { DayEntry } from "@/data/group";
import { addDays, formatSydneyDayHeading, formatSydneyWeekRange, mondayOf } from "@/domain/sydney";
import { nextMonday, prevMonday, type Week } from "@/domain/week";
import { filmHref, weekHref, type WeekQuery } from "@/lib/week-url";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";

export type { WeekQuery } from "@/lib/week-url";
export { filmHref, weekHref, weekSearchParams } from "@/lib/week-url";

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
          <span className="inline-flex motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out motion-safe:group-hover/button:-translate-x-px">
            <ChevronLeftIcon />
          </span>
        </WeekNavLink>
        <WeekNavLabel
          label={label}
          ariaLabel={ariaLabel}
          dirKey={isDay ? day : week.monday}
        />
        <WeekNavLink
          href={nextHref}
          label={isDay ? "Next day" : "Next week"}
          pending={pendingHref === nextHref}
          onNavigate={onNavigate}
        >
          <span className="inline-flex motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out motion-safe:group-hover/button:translate-x-px">
            <ChevronRightIcon />
          </span>
        </WeekNavLink>
      </div>
    </div>
  );
}

const cardClassName =
  "block rounded-lg bg-card p-2 text-left motion-safe:transition-[background-color,transform] motion-safe:duration-150 motion-safe:ease-out hover:bg-accent/50 motion-safe:hover:-translate-y-px";

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

  if (outbound) {
    return (
      <a
        href={outbound}
        target="_blank"
        rel="noopener noreferrer"
        className={cardClassName}
      >
        {body}
      </a>
    );
  }

  return (
    <Link href={href} prefetch={false} className={cardClassName}>
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
  monday,
  query,
  onNavigate,
}: {
  days: string[];
  byDay: Map<string, DayEntry[]>;
  today: string;
  monday: string;
  query: WeekQuery;
  onNavigate?: (href: string) => void;
}) {
  const dayLayout = days.length === 1;
  return (
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
            className={
              dayLayout
                ? "min-w-0 scroll-mt-3"
                : "min-w-0 scroll-mt-3 [content-visibility:auto] [contain-intrinsic-size:auto_12rem] md:[content-visibility:visible]"
            }
          >
            {dayLayout ? null : (
              <StickyDayHeading isToday={isToday}>
                <Link
                  href={href}
                  scroll={false}
                  prefetch={false}
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
              </StickyDayHeading>
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
  );
}
