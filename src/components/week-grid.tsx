import { GoToToday } from "@/components/go-to-today";
import { VenueDot } from "@/components/venue-dot";
import { WeekNavLink } from "@/components/week-nav-link";
import type { DayEntry } from "@/data/group";
import { formatSydneyDayHeading } from "@/domain/sydney";
import { isDefaultVenueIds } from "@/domain/venue";
import { nextMonday, prevMonday, type Week } from "@/domain/week";
import Link from "next/link";

export type WeekQuery = {
  venueIds?: string[];
  hide9to5?: boolean;
  oneLeft?: boolean;
};

export function weekSearchParams(monday: string, q: WeekQuery = {}) {
  const params = new URLSearchParams({ week: monday });
  if (
    q.venueIds &&
    q.venueIds.length > 0 &&
    !isDefaultVenueIds(q.venueIds)
  ) {
    params.set("venues", q.venueIds.join(","));
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
  pendingHref,
  onNavigate,
}: {
  week: Week;
  query?: WeekQuery;
  pendingHref?: string | null;
  onNavigate?: (href: string) => void;
}) {
  const prevHref = weekHref(prevMonday(week.monday), query);
  const nextHref = weekHref(nextMonday(week.monday), query);
  return (
    <div
      className={`flex items-center justify-between gap-4${pendingHref ? " pointer-events-none" : ""}`}
      aria-busy={Boolean(pendingHref)}
    >
      <WeekNavLink
        href={prevHref}
        pending={pendingHref === prevHref}
        onNavigate={onNavigate}
      >
        Previous
      </WeekNavLink>
      <p className="text-sm text-muted-foreground">
        {formatSydneyDayHeading(week.monday)} – {formatSydneyDayHeading(week.sunday)}
      </p>
      <WeekNavLink
        href={nextHref}
        pending={pendingHref === nextHref}
        onNavigate={onNavigate}
      >
        Next
      </WeekNavLink>
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
    "block rounded-lg border bg-card p-2 text-left transition-colors hover:bg-accent/50";

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

export function WeekGrid({
  days,
  byDay,
  today,
  todayHref,
  monday,
  query,
}: {
  days: string[];
  byDay: Map<string, DayEntry[]>;
  today: string;
  todayHref: string;
  monday: string;
  query: WeekQuery;
}) {
  return (
    <>
      <div className="grid gap-6 md:grid-cols-7 md:gap-3">
        {days.map((day) => {
          const entries = byDay.get(day) ?? [];
          const isToday = day === today;
          return (
            <section
              key={day}
              id={isToday ? "today" : undefined}
              className="min-w-0 scroll-mt-3"
            >
              <h2
                className={`sticky top-0 mb-1.5 bg-background py-1 text-xs font-medium ${
                  isToday ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {formatSydneyDayHeading(day)}
                {isToday ? " · Today" : ""}
              </h2>
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
      <GoToToday href={todayHref} todayOnPage={days.includes(today)} />
    </>
  );
}
