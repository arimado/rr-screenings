import { WeekView } from "@/components/week-view";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{
    week?: string;
    hide9to5?: string;
    oneLeft?: string;
    venues?: string | string[];
    view?: string;
    day?: string;
  }>;
}) {
  const {
    week: weekParam,
    hide9to5,
    oneLeft,
    venues,
    view,
    day,
  } = await searchParams;
  return (
    <WeekView
      weekParam={weekParam}
      venueIds={venues}
      hide9to5={hide9to5 === "1"}
      oneLeft={oneLeft === "1"}
      view={view}
      day={day}
    />
  );
}
