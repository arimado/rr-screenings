import { getVenue } from "@/domain/venue";

export function VenueDot({
  venueId,
  name,
  className = "size-2.5",
}: {
  venueId: string;
  name?: string;
  className?: string;
}) {
  const venue = getVenue(venueId);
  const label = name ?? venue?.name ?? venueId;
  return (
    <span
      className={`inline-block shrink-0 rounded-full ${className}`}
      style={{ backgroundColor: venue?.color ?? "#888888" }}
      title={label}
      aria-label={label}
    />
  );
}
