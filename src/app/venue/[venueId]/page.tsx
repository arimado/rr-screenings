import { WeekView } from "@/components/week-view";
import { getVenue } from "@/domain/venue";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function VenuePage({
  params,
  searchParams,
}: {
  params: Promise<{ venueId: string }>;
  searchParams: Promise<{ week?: string; hide9to5?: string }>;
}) {
  const { venueId } = await params;
  const { week, hide9to5 } = await searchParams;
  if (!getVenue(venueId)) notFound();
  return (
    <WeekView
      weekParam={week}
      venueId={venueId}
      hide9to5={hide9to5 === "1"}
    />
  );
}
