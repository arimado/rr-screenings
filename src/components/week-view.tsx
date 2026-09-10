import { WeekViewClient } from "@/components/week-view-client";
import {
  formatUpdatedAgo,
  getScreeningsForDays,
  loadSnapshots,
  oldestFetchedAt,
  slugsWithOneUpcoming,
  snapshotIsStale,
  venueListingStats,
} from "@/data/get-screenings";
import { toListingsRows } from "@/data/listings-row";
import { monthFromYyyyMm, nextMonth } from "@/domain/month";
import { addDays, sydneyYmd } from "@/domain/sydney";
import { parseVenueIds } from "@/domain/venue";
import { currentWeek, nextMonday, resolveListingsWeek } from "@/domain/week";

export function WeekView({
  weekParam,
  venueIds: venueIdsRaw,
  hide9to5 = false,
  oneLeft = false,
  view: viewRaw,
  day: dayRaw,
  month: monthRaw,
}: {
  weekParam?: string;
  venueIds?: string | string[];
  hide9to5?: boolean;
  oneLeft?: boolean;
  view?: string;
  day?: string;
  month?: string;
}) {
  const { week, view, day, month: yearMonth } = resolveListingsWeek({
    weekParam,
    view: viewRaw,
    dayParam: dayRaw,
    monthParam: monthRaw,
  });
  const today = sydneyYmd();
  const snapshots = loadSnapshots();
  const stale = snapshots.some(({ snapshot }) => snapshotIsStale(snapshot));
  const updatedAt = oldestFetchedAt(snapshots);
  const venueIds = parseVenueIds(venueIdsRaw);
  const month =
    view === "month" && yearMonth ? monthFromYyyyMm(yearMonth) : undefined;
  const listingDays = month ? month.days : week.days;
  const nextDays = month
    ? monthFromYyyyMm(nextMonth(month.yearMonth)).days
    : Array.from({ length: 7 }, (_, i) => addDays(nextMonday(week.monday), i));

  return (
    <WeekViewClient
      week={week}
      month={month}
      today={today}
      currentMonday={currentWeek().monday}
      screenings={toListingsRows(getScreeningsForDays(listingDays))}
      nextScreenings={toListingsRows(getScreeningsForDays(nextDays))}
      oneLeftSlugs={[...slugsWithOneUpcoming()]}
      venueStats={venueListingStats()}
      initialQuery={{
        venueIds,
        hide9to5,
        oneLeft,
        ...(view === "day" && day ? { view, day } : {}),
        ...(view === "film" ? { view } : {}),
        ...(view === "month" && yearMonth ? { view, month: yearMonth } : {}),
      }}
      updatedAt={updatedAt}
      updatedLabel={updatedAt ? formatUpdatedAgo(updatedAt) : undefined}
      updatedExact={
        updatedAt
          ? new Date(updatedAt).toLocaleString("en-AU", {
              timeZone: "Australia/Sydney",
              weekday: "short",
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            }) + " Sydney"
          : undefined
      }
      stale={stale}
    />
  );
}
