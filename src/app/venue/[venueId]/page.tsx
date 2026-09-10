import { WeekView } from "@/components/week-view";
import { getVenue } from "@/domain/venue";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function VenuePage({
  params,
  searchParams,
}: {
  params: Promise<{ venueId: string }>;
  searchParams: Promise<{ week?: string }>;
}) {
  const { venueId } = await params;
  const { week } = await searchParams;
  if (!getVenue(venueId)) notFound();
  return <WeekView weekParam={week} venueId={venueId} />;
}
