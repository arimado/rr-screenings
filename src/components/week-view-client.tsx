"use client";

import { GoToToday } from "@/components/go-to-today";
import { ShareButton } from "@/components/share-button";
import { UpdatedBadge } from "@/components/updated-badge";
import { Toggle } from "@/components/ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { VenueDot } from "@/components/venue-dot";
import {
  WeekGrid,
  WeekNav,
  weekHref,
  type WeekQuery,
} from "@/components/week-grid";
import { applyFilters } from "@/data/filter-screenings";
import { groupDayEntries, type DayEntry } from "@/data/group";
import type { Screening } from "@/domain/screening";
import { listingsShareTitle, siteTitle } from "@/domain/share";
import { addDays, formatSydneyDayHeading } from "@/domain/sydney";
import { toggleVenueId, venues } from "@/domain/venue";
import { nextMonday, type Week } from "@/domain/week";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useMemo, useOptimistic, useState, useTransition } from "react";

export type WeekViewQuery = {
  venueIds: string[];
  hide9to5: boolean;
  oneLeft: boolean;
  view?: "day";
  day?: string;
};

function toWeekQuery(q: WeekViewQuery): WeekQuery {
  return {
    venueIds: q.venueIds,
    hide9to5: q.hide9to5,
    oneLeft: q.oneLeft,
    ...(q.view === "day" && q.day ? { view: "day" as const, day: q.day } : {}),
  };
}

function parseListingsHref(href: string) {
  const url = new URL(href, "https://example.invalid");
  const day = url.searchParams.get("day");
  const view = url.searchParams.get("view");
  return {
    view: day || view === "day" ? "day" : view,
    day,
  };
}

function firstDayWithEntries(
  days: string[],
  grouped: Map<string, DayEntry[]>,
  after?: string,
): string | undefined {
  for (const d of days) {
    if (after && d <= after) continue;
    if ((grouped.get(d)?.length ?? 0) > 0) return d;
  }
}

function isModifiedClick(e: React.MouseEvent) {
  return e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;
}

export function WeekViewClient({
  week,
  today,
  currentMonday,
  screenings,
  nextScreenings,
  oneLeftSlugs,
  initialQuery,
  updatedAt,
  updatedLabel,
  updatedExact,
  stale,
}: {
  week: Week;
  today: string;
  currentMonday: string;
  screenings: Screening[];
  nextScreenings: Screening[];
  oneLeftSlugs: string[];
  initialQuery: WeekViewQuery;
  updatedAt?: string;
  updatedLabel?: string;
  updatedExact?: string;
  stale: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useOptimistic(initialQuery);
  const [weekPending, startWeekTransition] = useTransition();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const oneLeftSet = useMemo(() => new Set(oneLeftSlugs), [oneLeftSlugs]);

  const shownRows = useMemo(
    () =>
      applyFilters(screenings, {
        venueIds: query.venueIds,
        hide9to5: query.hide9to5,
        oneLeftSlugs: query.oneLeft ? oneLeftSet : null,
      }),
    [screenings, query.venueIds, query.hide9to5, query.oneLeft, oneLeftSet],
  );
  const shownNext = useMemo(
    () =>
      applyFilters(nextScreenings, {
        venueIds: query.venueIds,
        hide9to5: query.hide9to5,
        oneLeftSlugs: query.oneLeft ? oneLeftSet : null,
      }),
    [nextScreenings, query.venueIds, query.hide9to5, query.oneLeft, oneLeftSet],
  );
  const byDay = useMemo(() => groupDayEntries(shownRows), [shownRows]);
  const nextByDay = useMemo(() => groupDayEntries(shownNext), [shownNext]);
  const nextWeekMonday = nextMonday(week.monday);
  const nextWeekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(nextWeekMonday, i)),
    [nextWeekMonday],
  );

  const isDay = query.view === "day";
  const selectedDay = query.day ?? week.monday;
  const hasAny = shownRows.length > 0;
  const hasDayAny = (byDay.get(selectedDay)?.length ?? 0) > 0;
  const todayOnPage = week.days.includes(today);
  const weekQuery = toWeekQuery(query);
  const todayHref = isDay
    ? weekHref(currentMonday, { ...weekQuery, view: "day", day: today })
    : todayOnPage
      ? "#today"
      : `${weekHref(currentMonday, weekQuery)}#today`;
  const laterDay =
    isDay
      ? (firstDayWithEntries(week.days, byDay, selectedDay) ??
        firstDayWithEntries(nextWeekDays, nextByDay))
      : undefined;
  const laterDayHref = laterDay
    ? weekHref(
        week.days.includes(laterDay) ? week.monday : nextWeekMonday,
        { ...weekQuery, view: "day", day: laterDay },
      )
    : null;

  function commit(next: WeekViewQuery) {
    startTransition(() => {
      setQuery(next);
      router.replace(weekHref(week.monday, toWeekQuery(next)), {
        scroll: false,
      });
    });
  }

  function goWeek(href: string) {
    setPendingHref(href);
    startWeekTransition(() => {
      router.push(href, { scroll: false });
    });
  }

  function goListings(href: string) {
    const { view, day } = parseListingsHref(href);
    if (view === "day" && day && week.days.includes(day)) {
      commit({ ...query, view: "day", day });
      return;
    }
    goWeek(href);
  }

  const weekBusy = weekPending && pendingHref != null;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-1">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            <Link href="/" className="hover:underline">
              Film in Syd
            </Link>
          </h1>
          {updatedAt && updatedLabel && updatedExact ? (
            <UpdatedBadge
              dateTime={updatedAt}
              label={updatedLabel}
              exact={updatedExact}
              stale={stale}
            />
          ) : null}
        </div>
        <nav className="mt-2 flex flex-wrap gap-2" aria-label="Cinemas">
          {venues.map((v) => {
            const pressed = query.venueIds.includes(v.id);
            return (
              <Toggle
                key={v.id}
                pressed={pressed}
                variant="outline"
                size="sm"
                onPressedChange={() =>
                  commit({
                    ...query,
                    venueIds: toggleVenueId(query.venueIds, v.id),
                  })
                }
              >
                <VenueDot venueId={v.id} />
                {v.name}
              </Toggle>
            );
          })}
        </nav>
        {query.venueIds.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Select a cinema to see listings.
          </p>
        ) : null}
        <nav className="mt-2 flex flex-wrap gap-2" aria-label="Filters">
          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle
                pressed={query.hide9to5}
                variant="outline"
                size="sm"
                onPressedChange={() =>
                  commit({ ...query, hide9to5: !query.hide9to5 })
                }
              >
                Evenings & weekends
              </Toggle>
            </TooltipTrigger>
            <TooltipContent>
              Weekends, plus weekdays from 5pm.
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle
                pressed={query.oneLeft}
                variant="outline"
                size="sm"
                onPressedChange={() =>
                  commit({ ...query, oneLeft: !query.oneLeft })
                }
              >
                One screening left
              </Toggle>
            </TooltipTrigger>
            <TooltipContent>
              Films with only one session left to see.
            </TooltipContent>
          </Tooltip>
        </nav>
      </header>
      <div className="flex flex-col gap-2">
        <nav className="flex flex-wrap gap-2" aria-label="View">
          <Toggle
            pressed={!isDay}
            variant="outline"
            size="sm"
            onPressedChange={(pressed) => {
              if (!pressed) return;
              commit({
                venueIds: query.venueIds,
                hide9to5: query.hide9to5,
                oneLeft: query.oneLeft,
              });
            }}
          >
            Week
          </Toggle>
          <Toggle
            pressed={isDay}
            variant="outline"
            size="sm"
            onPressedChange={(pressed) => {
              if (!pressed) return;
              commit({
                ...query,
                view: "day",
                day: week.days.includes(today) ? today : week.monday,
              });
            }}
          >
            Day
          </Toggle>
        </nav>
        <div className="flex items-center gap-1">
          <div className="min-w-0 flex-1">
            <WeekNav
              week={week}
              query={weekQuery}
              currentMonday={currentMonday}
              today={today}
              pendingHref={weekBusy ? pendingHref : null}
              onNavigate={goListings}
            />
          </div>
          <ShareButton
            title={siteTitle(
              listingsShareTitle({
                week,
                view: isDay ? "day" : undefined,
                day: isDay ? selectedDay : undefined,
              }),
            )}
          />
        </div>
      </div>
      <div
        aria-busy={weekBusy}
        className={
          weekBusy
            ? "pointer-events-none opacity-50 transition-opacity"
            : "transition-opacity"
        }
      >
        {query.venueIds.length === 0 ? null : isDay && !hasDayAny ? (
          <div className="w-full max-w-xl rounded-lg border p-6 text-sm">
            <p>Nothing on this day.</p>
            {laterDay && laterDayHref ? (
              <p className="mt-2">
                <Link
                  className="underline"
                  href={laterDayHref}
                  scroll={false}
                  onClick={(e) => {
                    if (isModifiedClick(e)) return;
                    e.preventDefault();
                    goListings(laterDayHref);
                  }}
                >
                  See {formatSydneyDayHeading(laterDay)}
                </Link>
              </p>
            ) : null}
          </div>
        ) : !isDay && !hasAny ? (
          <div className="rounded-lg border p-6 text-sm">
            <p>Nothing on this week.</p>
            {shownNext.length > 0 ? (
              <p className="mt-2">
                <Link
                  className="underline"
                  href={weekHref(nextWeekMonday, weekQuery)}
                  scroll={false}
                  onClick={(e) => {
                    if (isModifiedClick(e)) return;
                    e.preventDefault();
                    goWeek(weekHref(nextWeekMonday, weekQuery));
                  }}
                >
                  See {formatSydneyDayHeading(nextWeekMonday)} week
                </Link>
              </p>
            ) : null}
            {!todayOnPage ? (
              <GoToToday href={todayHref} todayOnPage={false} />
            ) : null}
          </div>
        ) : (
          <WeekGrid
            days={isDay ? [selectedDay] : week.days}
            byDay={byDay}
            today={today}
            todayHref={todayHref}
            monday={week.monday}
            query={weekQuery}
            showTodayFab={!isDay}
            onNavigate={goListings}
          />
        )}
      </div>
      {isDay && selectedDay !== today ? (
        <GoToToday
          href={todayHref}
          todayOnPage={false}
          onNavigate={goListings}
        />
      ) : null}
      <div className="mb-16 md:hidden">
        <WeekNav
          week={week}
          query={weekQuery}
          currentMonday={currentMonday}
          today={today}
          pendingHref={weekBusy ? pendingHref : null}
          onNavigate={goListings}
        />
      </div>
    </div>
  );
}
