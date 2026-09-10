"use client";

import { GoToToday } from "@/components/go-to-today";
import { UpdatedBadge } from "@/components/updated-badge";
import { Toggle } from "@/components/ui/toggle";
import { VenueDot } from "@/components/venue-dot";
import {
  WeekGrid,
  WeekNav,
  weekHref,
  type WeekQuery,
} from "@/components/week-grid";
import { applyFilters } from "@/data/filter-screenings";
import { groupDayEntries } from "@/data/group";
import type { Screening } from "@/domain/screening";
import { formatSydneyDayHeading } from "@/domain/sydney";
import { toggleVenueId, venues } from "@/domain/venue";
import { nextMonday, type Week } from "@/domain/week";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useMemo, useOptimistic, useState, useTransition } from "react";

export type WeekViewQuery = {
  venueIds: string[];
  hide9to5: boolean;
  oneLeft: boolean;
};

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

  const hasAny = shownRows.length > 0;
  const todayOnPage = week.days.includes(today);
  const weekQuery: WeekQuery = query;
  const todayHref = todayOnPage
    ? "#today"
    : `${weekHref(currentMonday, weekQuery)}#today`;

  function commit(next: WeekViewQuery) {
    startTransition(() => {
      setQuery(next);
      router.replace(weekHref(week.monday, next), { scroll: false });
    });
  }

  function goWeek(href: string) {
    setPendingHref(href);
    startWeekTransition(() => {
      router.push(href, { scroll: false });
    });
  }

  const weekBusy = weekPending && pendingHref != null;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-1">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              <Link href="/" className="hover:underline">
                Film in Syd
              </Link>
            </h1>
            <p className="text-xs text-muted-foreground">by Reading Room</p>
          </div>
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
        </nav>
      </header>
      <WeekNav
        week={week}
        query={weekQuery}
        currentMonday={currentMonday}
        pendingHref={weekBusy ? pendingHref : null}
        onNavigate={goWeek}
      />
      <div
        aria-busy={weekBusy}
        className={
          weekBusy
            ? "pointer-events-none opacity-50 transition-opacity"
            : "transition-opacity"
        }
      >
        {query.venueIds.length === 0 ? null : !hasAny ? (
          <div className="rounded-lg border p-6 text-sm">
            <p>Nothing on this week.</p>
            {shownNext.length > 0 ? (
              <p className="mt-2">
                <Link
                  className="underline"
                  href={weekHref(nextMonday(week.monday), weekQuery)}
                  scroll={false}
                  onClick={(e) => {
                    if (
                      e.metaKey ||
                      e.ctrlKey ||
                      e.shiftKey ||
                      e.altKey ||
                      e.button !== 0
                    ) {
                      return;
                    }
                    e.preventDefault();
                    goWeek(weekHref(nextMonday(week.monday), weekQuery));
                  }}
                >
                  See {formatSydneyDayHeading(nextMonday(week.monday))} week
                </Link>
              </p>
            ) : null}
            {!todayOnPage ? (
              <GoToToday href={todayHref} todayOnPage={false} />
            ) : null}
          </div>
        ) : (
          <WeekGrid
            days={week.days}
            byDay={byDay}
            today={today}
            todayHref={todayHref}
            monday={week.monday}
            query={weekQuery}
          />
        )}
      </div>
      <div className="mb-16 md:hidden">
        <WeekNav
          week={week}
          query={weekQuery}
          currentMonday={currentMonday}
          pendingHref={weekBusy ? pendingHref : null}
          onNavigate={goWeek}
        />
      </div>
    </div>
  );
}
