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
  const color = venue?.color ?? "#888888";
  const outline = venueId.startsWith("palace-");
  return (
    <span
      className={`inline-block box-border shrink-0 rounded-full ${className}`}
      style={
        outline
          ? { boxShadow: `inset 0 0 0 1.5px ${color}` }
          : { backgroundColor: color }
      }
      title={label}
      aria-hidden
    />
  );
}
