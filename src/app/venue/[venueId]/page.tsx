import { WeekView } from "@/components/week-view";
import { getVenue } from "@/domain/venue";
import {
  listingsMetadata,
  type ListingsSearch,
} from "@/lib/listings-metadata";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const revalidate = 60;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ venueId: string }>;
  searchParams: Promise<ListingsSearch>;
}): Promise<Metadata> {
  const { venueId } = await params;
  const { week, view, day, month } = await searchParams;
  return listingsMetadata({ week, view, day, month, venueId });
}

export default async function VenuePage({
  params,
  searchParams,
}: {
  params: Promise<{ venueId: string }>;
  searchParams: Promise<ListingsSearch>;
}) {
  const { venueId } = await params;
  const { week, hide9to5, oneLeft, view, day, month } = await searchParams;
  if (!getVenue(venueId)) notFound();
  return (
    <WeekView
      weekParam={week}
      venueIds={venueId}
      hide9to5={hide9to5 === "1"}
      oneLeft={oneLeft === "1"}
      view={view}
      day={day}
      month={month}
    />
  );
}
