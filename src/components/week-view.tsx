import { VenueDot } from "@/components/venue-dot";
import { WeekGrid, WeekNav, weekHref } from "@/components/week-grid";
import {
  getScreeningsForDays,
  loadSnapshots,
  snapshotIsStale,
} from "@/data/get-screenings";
import { groupDayEntries } from "@/data/group";
import {
  addDays,
  formatSydneyDayHeading,
  isWeekdayNineToFive,
} from "@/domain/sydney";
import { getVenue, venues } from "@/domain/venue";
import { nextMonday, parseWeekParam } from "@/domain/week";
import Link from "next/link";

export async function WeekView({
  weekParam,
  venueId,
  hide9to5 = false,
}: {
  weekParam?: string;
  venueId?: string;
  hide9to5?: boolean;
}) {
  const week = parseWeekParam(weekParam);
  const snapshots = loadSnapshots();
  const stale = snapshots.some(({ snapshot }) => snapshotIsStale(snapshot));
  const staleFetchedAt = snapshots
    .filter(({ snapshot }) => snapshotIsStale(snapshot))
    .map(({ snapshot }) => snapshot.fetchedAt)
    .sort()[0];
  const venue = venueId ? getVenue(venueId) : undefined;
  let screenings = getScreeningsForDays(week.days);
  if (venueId) {
    screenings = screenings.filter((s) => s.venueId === venueId);
  }
  if (hide9to5) {
    screenings = screenings.filter((s) => !isWeekdayNineToFive(s.startsAt));
  }
  const byDay = groupDayEntries(screenings);
  const hasAny = screenings.length > 0;

  const nextWeekDays = Array.from({ length: 7 }, (_, i) =>
    addDays(nextMonday(week.monday), i),
  );
  let nextScreenings = getScreeningsForDays(nextWeekDays);
  if (venueId) {
    nextScreenings = nextScreenings.filter((s) => s.venueId === venueId);
  }
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
            rr-movies
          </Link>
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">This week</h1>
        <p className="text-sm text-muted-foreground">
          {venue
            ? `Screenings at ${venue.name}${venue.suburb ? `, ${venue.suburb}` : ""}.`
            : "Screenings at the Ritz and Golden Age."}
        </p>
        <nav className="flex flex-wrap items-center gap-3 text-sm" aria-label="Cinemas">
          <Link
            href={weekHref(week.monday, undefined, hide9to5)}
            className={`underline-offset-4 hover:underline ${
              venueId ? "text-muted-foreground" : "font-medium"
            }`}
            aria-current={!venueId ? "page" : undefined}
          >
            All
          </Link>
          {venues.map((v) => (
            <Link
              key={v.id}
              href={weekHref(week.monday, v.id, hide9to5)}
              className={`inline-flex items-center gap-1.5 underline-offset-4 hover:underline ${
                venueId === v.id ? "font-medium" : "text-muted-foreground"
              }`}
              aria-current={venueId === v.id ? "page" : undefined}
            >
              <VenueDot venueId={v.id} />
              {v.name}
            </Link>
          ))}
        </nav>
        <p className="text-sm">
          <Link
            href={weekHref(week.monday, venueId, !hide9to5)}
            className={`underline-offset-4 hover:underline ${
              hide9to5 ? "font-medium" : "text-muted-foreground"
            }`}
            aria-pressed={hide9to5}
          >
            {hide9to5 ? "Showing after 5pm weekdays" : "Hide weekday 9–5"}
          </Link>
        </p>
        {stale && staleFetchedAt ? (
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Listings may be stale (last fetched{" "}
            {new Date(staleFetchedAt).toLocaleString("en-AU", {
              timeZone: "Australia/Sydney",
            })}
            ).
          </p>
        ) : null}
      </header>
      <WeekNav week={week} venueId={venueId} hide9to5={hide9to5} />
      {!hasAny ? (
        <div className="rounded-lg border p-6 text-sm">
          <p>Nothing on this week.</p>
          {nextScreenings.length > 0 ? (
            <p className="mt-2">
              <Link
                className="underline"
                href={weekHref(nextMonday(week.monday), venueId, hide9to5)}
              >
                See {formatSydneyDayHeading(nextMonday(week.monday))} week
              </Link>
            </p>
          ) : null}
        </div>
      ) : (
        <WeekGrid days={week.days} byDay={byDay} />
      )}
    </div>
  );
}
