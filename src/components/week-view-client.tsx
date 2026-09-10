"use client";

import { FilmWeekList } from "@/components/film-week-list";
import { GoToToday } from "@/components/go-to-today";
import { Hint } from "@/components/hint";
import { ListingsFade } from "@/components/listings-fade";
import { ShareButton } from "@/components/share-button";
import { UpdatedBadge } from "@/components/updated-badge";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Toggle, toggleVariants } from "@/components/ui/toggle";
import { VenueDot } from "@/components/venue-dot";
import { MonthNav, WeekGrid, WeekNav } from "@/components/week-grid";
import { applyFilters } from "@/data/filter-screenings";
import type { VenueListingStats } from "@/data/get-screenings";
import { groupDayEntries, groupFilmEntries, type DayEntry } from "@/data/group";
import type { ListingsRow } from "@/data/listings-row";
import {
  listingsShareTitle,
  SITE_DESCRIPTION,
  SITE_NAME,
  siteTitle,
  venueCanonicalPath,
} from "@/domain/share";
import {
  firstMondayInMonth,
  monthFromYyyyMm,
  nextMonth,
  yearMonthOf,
  type Month,
} from "@/domain/month";
import {
  addDays,
  formatSydneyDayHeading,
  formatSydneyMonth,
  formatSydneyThrough,
  mondayOf,
} from "@/domain/sydney";
import {
  isAllVenueIds,
  toggleAllVenueIds,
  toggleVenueId,
  venues,
  type Venue,
} from "@/domain/venue";
import { nextMonday, weekFromMonday, type Week } from "@/domain/week";
import { weekHref, type WeekQuery } from "@/lib/week-url";
import { ClapperboardIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  startTransition,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

export type WeekViewQuery = {
  venueIds: string[];
  hide9to5: boolean;
  oneLeft: boolean;
  view?: "day" | "film" | "month";
  day?: string;
  month?: string;
};

function toWeekQuery(q: WeekViewQuery): WeekQuery {
  return {
    venueIds: q.venueIds,
    hide9to5: q.hide9to5,
    oneLeft: q.oneLeft,
    ...(q.view === "day" && q.day ? { view: "day" as const, day: q.day } : {}),
    ...(q.view === "film" ? { view: "film" as const } : {}),
    ...(q.view === "month" && q.month
      ? { view: "month" as const, month: q.month }
      : {}),
  };
}

function parseListingsHref(href: string) {
  const url = new URL(href, "https://example.invalid");
  const day = url.searchParams.get("day");
  const view = url.searchParams.get("view");
  const weekParam = url.searchParams.get("week");
  const month = url.searchParams.get("month");
  return {
    view: day || view === "day" ? "day" : view,
    day,
    monday: day ? mondayOf(day) : weekParam ? mondayOf(weekParam) : undefined,
    month,
  };
}

function queryFromHref(query: WeekViewQuery, href: string): WeekViewQuery {
  const parsed = parseListingsHref(href);
  if (parsed.view === "day" && parsed.day) {
    return { ...query, view: "day", day: parsed.day };
  }
  if (parsed.view === "film") {
    return {
      venueIds: query.venueIds,
      hide9to5: query.hide9to5,
      oneLeft: query.oneLeft,
      view: "film",
    };
  }
  if (parsed.view === "month") {
    return {
      venueIds: query.venueIds,
      hide9to5: query.hide9to5,
      oneLeft: query.oneLeft,
      view: "month",
      month: parsed.month ?? query.month,
    };
  }
  return {
    venueIds: query.venueIds,
    hide9to5: query.hide9to5,
    oneLeft: query.oneLeft,
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

function venueChipHint(
  venue: Venue,
  stats: VenueListingStats | undefined,
  today: string,
): string {
  const where = venue.suburb ? `${venue.suburb}. ` : "";
  if (!stats || stats.sessions === 0) {
    return `${where}No upcoming sessions.`;
  }
  const n =
    stats.sessions === 1 ? "1 session" : `${stats.sessions} sessions`;
  const through = stats.lastDay
    ? ` through ${formatSydneyThrough(stats.lastDay, today)}`
    : "";
  return `${where}${n}${through}.`;
}

function syncListingsUrl(href: string) {
  window.history.replaceState(window.history.state, "", href);
}

function cacheKey(parsed: ReturnType<typeof parseListingsHref>) {
  if (parsed.view === "month") {
    return parsed.month ? `m:${parsed.month}` : undefined;
  }
  return parsed.monday;
}

function seedWeekSlices(
  cache: Map<string, ListingsRow[]>,
  rows: ListingsRow[],
) {
  const byMonday = new Map<string, ListingsRow[]>();
  for (const row of rows) {
    const monday = mondayOf(row.day);
    const list = byMonday.get(monday) ?? [];
    list.push(row);
    byMonday.set(monday, list);
  }
  for (const [monday, list] of byMonday) {
    cache.set(monday, list);
  }
}

export function WeekViewClient({
  week: serverWeek,
  month: serverMonth,
  today,
  currentMonday,
  screenings: serverScreenings,
  nextScreenings: serverNextScreenings,
  oneLeftSlugs,
  venueStats,
  initialQuery,
  updatedAt,
  updatedLabel,
  updatedExact,
  stale,
}: {
  week: Week;
  month?: Month;
  today: string;
  currentMonday: string;
  screenings: ListingsRow[];
  nextScreenings: ListingsRow[];
  oneLeftSlugs: string[];
  venueStats: Record<string, VenueListingStats>;
  initialQuery: WeekViewQuery;
  updatedAt?: string;
  updatedLabel?: string;
  updatedExact?: string;
  stale: boolean;
}) {
  const router = useRouter();
  const serverListings = useMemo(
    () => ({
      week: serverWeek,
      month: serverMonth,
      screenings: serverScreenings,
      nextScreenings: serverNextScreenings,
    }),
    [serverWeek, serverMonth, serverScreenings, serverNextScreenings],
  );
  const serverKey = serverMonth
    ? `m:${serverMonth.yearMonth}`
    : `w:${serverWeek.monday}`;
  const [query, setQuery] = useState(initialQuery);
  const [listings, setListings] = useState(serverListings);
  const [appliedKey, setAppliedKey] = useState(serverKey);
  const [weekPending, startWeekTransition] = useTransition();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const weekCache = useRef(new Map<string, ListingsRow[]>());
  if (serverKey !== appliedKey) {
    setAppliedKey(serverKey);
    setQuery(initialQuery);
    setListings(serverListings);
  }

  const { week, month, screenings, nextScreenings } = listings;
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
  const byFilm = useMemo(() => groupFilmEntries(shownRows), [shownRows]);
  const nextWeekMonday = nextMonday(week.monday);
  const nextWeekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(nextWeekMonday, i)),
    [nextWeekMonday],
  );

  const isDay = query.view === "day";
  const isFilm = query.view === "film";
  const isMonth = query.view === "month";
  const allOn = isAllVenueIds(query.venueIds);
  const selectedDay = query.day ?? week.monday;
  const hasAny = shownRows.length > 0;
  const hasDayAny = (byDay.get(selectedDay)?.length ?? 0) > 0;
  const knownDays = month?.days ?? week.days;
  const todayOnPage = knownDays.includes(today);
  const currentYearMonth = yearMonthOf(today);
  const weekQuery = toWeekQuery(query);
  const todayHref = isDay
    ? weekHref(currentMonday, { ...weekQuery, view: "day", day: today })
    : isFilm
      ? weekHref(currentMonday, weekQuery)
      : isMonth
        ? todayOnPage
          ? "#today"
          : `${weekHref(currentMonday, {
              ...weekQuery,
              view: "month",
              month: currentYearMonth,
            })}#today`
        : todayOnPage
          ? "#today"
          : `${weekHref(currentMonday, weekQuery)}#today`;
  const laterDay =
    isDay
      ? (firstDayWithEntries(knownDays, byDay, selectedDay) ??
        firstDayWithEntries(nextWeekDays, nextByDay))
      : undefined;
  const laterDayHref = laterDay
    ? weekHref(
        knownDays.includes(laterDay) ? mondayOf(laterDay) : nextWeekMonday,
        { ...weekQuery, view: "day", day: laterDay },
      )
    : null;
  const nextMonthYear = month ? nextMonth(month.yearMonth) : undefined;

  function weekAnchorMonday() {
    if (isDay && query.day) return mondayOf(query.day);
    if (isMonth && query.month) {
      return query.month === currentYearMonth
        ? currentMonday
        : firstMondayInMonth(query.month);
    }
    return week.monday;
  }

  function filterQuery(): WeekViewQuery {
    return {
      venueIds: query.venueIds,
      hide9to5: query.hide9to5,
      oneLeft: query.oneLeft,
    };
  }

  function commit(next: WeekViewQuery) {
    syncListingsUrl(weekHref(week.monday, toWeekQuery(next)));
    setQuery(next);
  }

  function goWeek(href: string) {
    const parsed = parseListingsHref(href);
    const key = cacheKey(parsed);
    if (serverMonth) {
      weekCache.current.set(`m:${serverMonth.yearMonth}`, serverScreenings);
      weekCache.current.set(
        `m:${nextMonth(serverMonth.yearMonth)}`,
        serverNextScreenings,
      );
      for (const row of serverMonth.weeks) {
        weekCache.current.set(row.monday, []);
      }
      seedWeekSlices(weekCache.current, serverScreenings);
    } else {
      weekCache.current.set(serverWeek.monday, serverScreenings);
      weekCache.current.set(
        nextMonday(serverWeek.monday),
        serverNextScreenings,
      );
    }
    if (month) {
      weekCache.current.set(`m:${month.yearMonth}`, screenings);
      for (const row of month.weeks) {
        weekCache.current.set(row.monday, []);
      }
      seedWeekSlices(weekCache.current, screenings);
    } else {
      weekCache.current.set(week.monday, screenings);
    }
    if (key != null && weekCache.current.has(key)) {
      const cached = weekCache.current.get(key)!;
      setPendingHref(null);
      setQuery(queryFromHref(query, href));
      if (parsed.view === "month" && parsed.month) {
        const nextKey = `m:${nextMonth(parsed.month)}`;
        setListings({
          week: weekFromMonday(
            parsed.month === currentYearMonth
              ? currentMonday
              : firstMondayInMonth(parsed.month),
          ),
          month: monthFromYyyyMm(parsed.month),
          screenings: cached,
          nextScreenings: weekCache.current.get(nextKey) ?? [],
        });
      } else if (parsed.monday) {
        setListings({
          week: weekFromMonday(parsed.monday),
          month: undefined,
          screenings: cached,
          nextScreenings:
            weekCache.current.get(nextMonday(parsed.monday)) ?? [],
        });
      }
      startTransition(() => {
        router.push(href, { scroll: false });
      });
      return;
    }
    setPendingHref(href);
    startWeekTransition(() => {
      router.push(href, { scroll: false });
    });
  }

  function goListings(href: string) {
    const { view, day } = parseListingsHref(href);
    if (view === "day" && day && knownDays.includes(day)) {
      commit({ ...query, view: "day", day });
      return;
    }
    goWeek(href);
  }

  const weekBusy = weekPending && pendingHref != null;
  const listingsKey = [
    isMonth ? (query.month ?? month?.yearMonth ?? "") : week.monday,
    query.view ?? "week",
    query.day ?? "",
  ].join("|");
  const showTodayFab =
    query.venueIds.length > 0 &&
    !isFilm &&
    (isDay ? selectedDay !== today : hasAny || !todayOnPage);

  const rangeNav = isMonth && month ? (
    <MonthNav
      month={month}
      query={weekQuery}
      currentYearMonth={currentYearMonth}
      pendingHref={weekBusy ? pendingHref : null}
      onNavigate={goListings}
    />
  ) : (
    <WeekNav
      week={week}
      query={weekQuery}
      currentMonday={currentMonday}
      today={today}
      pendingHref={weekBusy ? pendingHref : null}
      onNavigate={goListings}
    />
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-1">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <h1 className="font-heading text-2xl tracking-tight">
            <Link href="/" className="hover:underline">
              {SITE_NAME}
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
        <p className="text-sm text-muted-foreground">
          {SITE_DESCRIPTION}
        </p>
        <nav className="mt-2 flex flex-wrap gap-2" aria-label="Cinemas">
          <Hint
            content={
              allOn
                ? "Deselect all cinemas."
                : "Select every cinema."
            }
          >
            <button
              type="button"
              className={toggleVariants({ variant: "outline", size: "sm" })}
              aria-label={allOn ? "Clear all cinemas" : "All cinemas"}
              onClick={() =>
                commit({
                  ...query,
                  venueIds: toggleAllVenueIds(query.venueIds),
                })
              }
            >
              {allOn ? "Clear" : "All"}
            </button>
          </Hint>
          {venues.map((v) => {
            const pressed = query.venueIds.includes(v.id);
            return (
              <Hint key={v.id} content={venueChipHint(v, venueStats[v.id], today)}>
                <Toggle
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
              </Hint>
            );
          })}
        </nav>
        <nav className="mt-2 flex flex-wrap gap-2" aria-label="Filters">
          <Hint content="Weekends, plus weekdays from 5pm.">
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
          </Hint>
          <Hint content="Films with only one session left to see.">
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
          </Hint>
        </nav>
      </header>
      <div className="flex flex-col gap-2">
        <nav className="flex flex-wrap gap-2" aria-label="View">
          <Hint content="Monday to Sunday in columns.">
            <Toggle
              pressed={!isDay && !isFilm && !isMonth}
              variant="outline"
              size="sm"
              onPressedChange={(pressed) => {
                if (!pressed) return;
                if (month || isMonth) {
                  goWeek(weekHref(weekAnchorMonday(), filterQuery()));
                  return;
                }
                commit(filterQuery());
              }}
            >
              Week
            </Toggle>
          </Hint>
          <Hint content="One Sydney date at a time.">
            <Toggle
              pressed={isDay}
              variant="outline"
              size="sm"
              onPressedChange={(pressed) => {
                if (!pressed) return;
                const day =
                  isMonth && query.month
                    ? today.startsWith(query.month)
                      ? today
                      : `${query.month}-01`
                    : week.days.includes(today)
                      ? today
                      : week.monday;
                commit({
                  ...filterQuery(),
                  view: "day",
                  day,
                });
              }}
            >
              Day
            </Toggle>
          </Hint>
          <Hint content="Titles first, then cinema and times.">
            <Toggle
              pressed={isFilm}
              variant="outline"
              size="sm"
              onPressedChange={(pressed) => {
                if (!pressed) return;
                if (month || isMonth) {
                  goWeek(
                    weekHref(weekAnchorMonday(), {
                      ...filterQuery(),
                      view: "film",
                    }),
                  );
                  return;
                }
                commit({
                  ...filterQuery(),
                  view: "film",
                });
              }}
            >
              Film
            </Toggle>
          </Hint>
          <Hint content="Every week that overlaps this month.">
            <Toggle
              pressed={isMonth}
              variant="outline"
              size="sm"
              onPressedChange={(pressed) => {
                if (!pressed) return;
                const ymd = isDay && query.day ? query.day : week.monday;
                goWeek(
                  weekHref(week.monday, {
                    ...filterQuery(),
                    view: "month",
                    month: yearMonthOf(ymd),
                  }),
                );
              }}
            >
              Month
            </Toggle>
          </Hint>
        </nav>
        <div className="flex items-center gap-1">
          <div id="week-nav" className="min-w-0 flex-1 scroll-mt-3">
            {rangeNav}
          </div>
          <ShareButton
            title={siteTitle(
              listingsShareTitle({
                week,
                view: isDay ? "day" : isMonth ? "month" : undefined,
                day: isDay ? selectedDay : undefined,
                month: isMonth ? query.month : undefined,
              }),
            )}
          />
        </div>
      </div>
      <div
        aria-busy={weekBusy}
        className={
          weekBusy
            ? "pointer-events-none opacity-50 motion-safe:transition-opacity motion-safe:duration-150"
            : "motion-safe:transition-opacity motion-safe:duration-150"
        }
      >
        {query.venueIds.length === 0 ? (
          <ListingsFade id="no-cinemas">
            <Empty className="border py-12">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ClapperboardIcon />
                </EmptyMedia>
                <EmptyTitle>Select a cinema to see listings.</EmptyTitle>
              </EmptyHeader>
            </Empty>
          </ListingsFade>
        ) : (
          <ListingsFade
            id={listingsKey}
            className={
              isDay && !hasDayAny
                ? "w-full max-w-xl rounded-lg border p-6 text-sm"
                : !hasAny
                  ? "rounded-lg border p-6 text-sm"
                  : undefined
            }
          >
            {isDay && !hasDayAny ? (
              <>
                <p>Nothing on this day.</p>
                {laterDay && laterDayHref ? (
                  <p className="mt-2">
                    <Link
                      className="underline"
                      href={laterDayHref}
                      scroll={false}
                      prefetch={false}
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
              </>
            ) : !hasAny ? (
              isMonth && nextMonthYear ? (
                <>
                  <p>Nothing this month.</p>
                  {shownNext.length > 0 ? (
                    <p className="mt-2">
                      <Link
                        className="underline"
                        href={weekHref(week.monday, {
                          ...weekQuery,
                          view: "month",
                          month: nextMonthYear,
                        })}
                        scroll={false}
                        prefetch={false}
                        onClick={(e) => {
                          if (isModifiedClick(e)) return;
                          e.preventDefault();
                          goWeek(
                            weekHref(week.monday, {
                              ...weekQuery,
                              view: "month",
                              month: nextMonthYear,
                            }),
                          );
                        }}
                      >
                        See {formatSydneyMonth(nextMonthYear)}
                      </Link>
                    </p>
                  ) : null}
                </>
              ) : (
                <>
                  <p>Nothing on this week.</p>
                  {shownNext.length > 0 ? (
                    <p className="mt-2">
                      <Link
                        className="underline"
                        href={weekHref(nextWeekMonday, weekQuery)}
                        scroll={false}
                        prefetch={false}
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
                </>
              )
            ) : isFilm ? (
              <FilmWeekList
                entries={byFilm}
                monday={week.monday}
                query={weekQuery}
              />
            ) : isMonth && month ? (
              <div className="flex flex-col gap-8">
                {month.weeks.map((row) => (
                  <WeekGrid
                    key={row.monday}
                    days={row.days}
                    byDay={byDay}
                    today={today}
                    monday={row.monday}
                    query={weekQuery}
                    onNavigate={goListings}
                    yearMonth={month.yearMonth}
                  />
                ))}
              </div>
            ) : (
              <WeekGrid
                days={isDay ? [selectedDay] : week.days}
                byDay={byDay}
                today={today}
                monday={week.monday}
                query={weekQuery}
                onNavigate={goListings}
              />
            )}
          </ListingsFade>
        )}
      </div>
      {showTodayFab ? (
        <GoToToday
          href={todayHref}
          todayOnPage={!isDay && todayOnPage}
          onNavigate={goListings}
        />
      ) : null}
      <div className={isMonth ? "mb-16" : "mb-16 md:hidden"}>{rangeNav}</div>
      <footer className="border-t pt-4 text-sm text-muted-foreground">
        <nav aria-label="Cinema pages">
          <ul className="flex flex-wrap gap-x-3 gap-y-1">
            {venues.map((v) => (
              <li key={v.id}>
                <Link
                  href={venueCanonicalPath(v.id)}
                  className="hover:text-foreground hover:underline"
                >
                  {v.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </footer>
    </div>
  );
}
