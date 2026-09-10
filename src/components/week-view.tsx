import { GoToToday } from "@/components/go-to-today";
import { UpdatedBadge } from "@/components/updated-badge";
import { VenueDot } from "@/components/venue-dot";
import { WeekGrid, WeekNav, weekHref } from "@/components/week-grid";
import { Toggle } from "@/components/ui/toggle";
import {
  getScreeningsForDays,
  formatUpdatedAgo,
  loadSnapshots,
  oldestFetchedAt,
  slugsWithOneUpcoming,
  snapshotIsStale,
} from "@/data/get-screenings";
import { groupDayEntries } from "@/data/group";
import { filmSlug } from "@/domain/film";
import type { Screening } from "@/domain/screening";
import {
  addDays,
  formatSydneyDayHeading,
  isWeekdayNineToFive,
  sydneyYmd,
} from "@/domain/sydney";
import { getVenue, parseVenueIds, toggleVenueId, venues } from "@/domain/venue";
import { currentWeek, nextMonday, parseWeekParam } from "@/domain/week";
import Link from "next/link";

function screeningsAtLabel(venueIds: string[]): string {
  if (venueIds.length === 0) {
    return "Screenings at the Ritz, Golden Age, Dendy Newtown, the Orpheum, AGNSW, Palace Norton St, Palace Central, and Palace Moore Park.";
  }
  const named = venueIds.map((id) => getVenue(id)).filter((v) => v != null);
  if (named.length === 1) {
    const v = named[0];
    return `Screenings at ${v.name}${v.suburb ? `, ${v.suburb}` : ""}.`;
  }
  const names = named.map((v) => v.name);
  if (names.length === 2) return `Screenings at ${names[0]} and ${names[1]}.`;
  return `Screenings at ${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}.`;
}

export async function WeekView({
  weekParam,
  venueIds: venueIdsRaw,
  hide9to5 = false,
  oneLeft = false,
}: {
  weekParam?: string;
  venueIds?: string | string[];
  hide9to5?: boolean;
  oneLeft?: boolean;
}) {
  const week = parseWeekParam(weekParam);
  const today = sydneyYmd();
  const todayOnPage = week.days.includes(today);
  const snapshots = loadSnapshots();
  const stale = snapshots.some(({ snapshot }) => snapshotIsStale(snapshot));
  const updatedAt = oldestFetchedAt(snapshots);
  const venueIds = parseVenueIds(venueIdsRaw);
  const query = { venueIds, hide9to5, oneLeft };
  const todayHref = todayOnPage
    ? "#today"
    : `${weekHref(currentWeek().monday, query)}#today`;
  const oneLeftSlugs = oneLeft ? slugsWithOneUpcoming() : null;

  function applyFilters(rows: Screening[]) {
    let next = rows;
    if (venueIds.length > 0) {
      const allowed = new Set(venueIds);
      next = next.filter((s) => allowed.has(s.venueId));
    }
    if (oneLeftSlugs) {
      next = next.filter((s) =>
        oneLeftSlugs.has(filmSlug(s.title, s.year)),
      );
    }
    return next;
  }

  let screenings = applyFilters(getScreeningsForDays(week.days));
  if (hide9to5) {
    screenings = screenings.filter((s) => !isWeekdayNineToFive(s.startsAt));
  }
  const shown = screenings.length;
  const byDay = groupDayEntries(screenings);
  const hasAny = shown > 0;
  const workdayLabel =
    hide9to5 && shown > 0
      ? `Evenings & weekends (${shown})`
      : "Evenings & weekends";
  const oneLeftLabel =
    oneLeft && shown > 0
      ? `One screening left (${shown})`
      : "One screening left";

  const nextWeekDays = Array.from({ length: 7 }, (_, i) =>
    addDays(nextMonday(week.monday), i),
  );
  let nextScreenings = applyFilters(getScreeningsForDays(nextWeekDays));
  if (hide9to5) {
    nextScreenings = nextScreenings.filter(
      (s) => !isWeekdayNineToFive(s.startsAt),
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">
          <Link href="/" className="hover:underline">
            Films In Syd
          </Link>
          <span className="text-muted-foreground/70"> · by Reading Room</span>
        </p>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">This week</h1>
          {updatedAt ? (
            <UpdatedBadge
              dateTime={updatedAt}
              label={formatUpdatedAgo(updatedAt)}
              exact={new Date(updatedAt).toLocaleString("en-AU", {
                timeZone: "Australia/Sydney",
              })}
              stale={stale}
            />
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">
          {screeningsAtLabel(venueIds)}
        </p>
        <nav className="mt-2 flex flex-wrap gap-2" aria-label="Cinemas">
          {venues.map((v) => {
            const pressed = venueIds.includes(v.id);
            return (
              <Toggle
                key={v.id}
                asChild
                pressed={pressed}
                variant="outline"
                size="sm"
              >
                <Link
                  href={weekHref(week.monday, {
                    ...query,
                    venueIds: toggleVenueId(venueIds, v.id),
                  })}
                >
                  <VenueDot venueId={v.id} />
                  {v.name}
                </Link>
              </Toggle>
            );
          })}
        </nav>
        <nav className="mt-2 flex flex-wrap gap-2" aria-label="Filters">
          <Toggle asChild pressed={hide9to5} variant="outline" size="sm">
            <Link href={weekHref(week.monday, { ...query, hide9to5: !hide9to5 })}>
              {workdayLabel}
            </Link>
          </Toggle>
          <Toggle asChild pressed={oneLeft} variant="outline" size="sm">
            <Link href={weekHref(week.monday, { ...query, oneLeft: !oneLeft })}>
              {oneLeftLabel}
            </Link>
          </Toggle>
        </nav>
      </header>
      <WeekNav week={week} query={query} />
      {!hasAny ? (
        <div className="rounded-lg border p-6 text-sm">
          <p>Nothing on this week.</p>
          {nextScreenings.length > 0 ? (
            <p className="mt-2">
              <Link
                className="underline"
                href={weekHref(nextMonday(week.monday), query)}
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
          query={query}
        />
      )}
    </div>
  );
}
