import { WeekViewClient } from "@/components/week-view-client";
import {
  formatUpdatedAgo,
  getScreeningsForDays,
  loadSnapshots,
  oldestFetchedAt,
  slugsWithOneUpcoming,
  snapshotIsStale,
} from "@/data/get-screenings";
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
}: {
  weekParam?: string;
  venueIds?: string | string[];
  hide9to5?: boolean;
  oneLeft?: boolean;
  view?: string;
  day?: string;
}) {
  const { week, view, day } = resolveListingsWeek({
    weekParam,
    view: viewRaw,
    dayParam: dayRaw,
  });
  const today = sydneyYmd();
  const snapshots = loadSnapshots();
  const stale = snapshots.some(({ snapshot }) => snapshotIsStale(snapshot));
  const updatedAt = oldestFetchedAt(snapshots);
  const venueIds = parseVenueIds(venueIdsRaw);
  const nextWeekDays = Array.from({ length: 7 }, (_, i) =>
    addDays(nextMonday(week.monday), i),
  );

  return (
    <WeekViewClient
      week={week}
      today={today}
      currentMonday={currentWeek().monday}
      screenings={getScreeningsForDays(week.days)}
      nextScreenings={getScreeningsForDays(nextWeekDays)}
      oneLeftSlugs={[...slugsWithOneUpcoming()]}
      initialQuery={{
        venueIds,
        hide9to5,
        oneLeft,
        ...(view === "day" && day ? { view, day } : {}),
        ...(view === "film" ? { view } : {}),
      }}
      updatedAt={updatedAt}
      updatedLabel={updatedAt ? formatUpdatedAgo(updatedAt) : undefined}
      updatedExact={
        updatedAt
          ? new Date(updatedAt).toLocaleString("en-AU", {
              timeZone: "Australia/Sydney",
            })
          : undefined
      }
      stale={stale}
    />
  );
}
