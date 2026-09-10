import { WeekGrid, WeekNav } from "@/components/week-grid";
import { getScreeningsForDays, loadSnapshot, snapshotIsStale } from "@/data/get-screenings";
import { groupDayEntries } from "@/data/group";
import { addDays, formatSydneyDayHeading } from "@/domain/sydney";
import { nextMonday, parseWeekParam } from "@/domain/week";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week: weekParam } = await searchParams;
  return <WeekView weekParam={weekParam} />;
}

export async function WeekView({
  weekParam,
  venueId,
}: {
  weekParam?: string;
  venueId?: string;
}) {
  const week = parseWeekParam(weekParam);
  const snapshot = loadSnapshot("ritz");
  const stale = snapshotIsStale(snapshot);
  let screenings = getScreeningsForDays(week.days);
  if (venueId) {
    screenings = screenings.filter((s) => s.venueId === venueId);
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
          Screenings at the Ritz, Randwick.
        </p>
        {stale && snapshot ? (
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Listings may be stale (last fetched{" "}
            {new Date(snapshot.fetchedAt).toLocaleString("en-AU", {
              timeZone: "Australia/Sydney",
            })}
            ).
          </p>
        ) : null}
      </header>
      <WeekNav week={week} venueId={venueId} />
      {!hasAny ? (
        <div className="rounded-lg border p-6 text-sm">
          <p>Nothing on this week.</p>
          {nextScreenings.length > 0 ? (
            <p className="mt-2">
              <Link
                className="underline"
                href={
                  venueId
                    ? `/venue/${venueId}?week=${nextMonday(week.monday)}`
                    : `/?week=${nextMonday(week.monday)}`
                }
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
