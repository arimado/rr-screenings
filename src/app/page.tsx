import { WeekView } from "@/components/week-view";
import {
  listingsMetadata,
  type ListingsSearch,
} from "@/lib/listings-metadata";
import type { Metadata } from "next";

export const revalidate = 60;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<ListingsSearch>;
}): Promise<Metadata> {
  const { week, view, day } = await searchParams;
  return listingsMetadata({ week, view, day });
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<ListingsSearch>;
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
