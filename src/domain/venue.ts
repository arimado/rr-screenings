export type Venue = {
  id: string;
  name: string;
  suburb?: string;
};

export const venues: Venue[] = [
  { id: "ritz-randwick", name: "Ritz Cinemas", suburb: "Randwick" },
];

export function getVenue(id: string): Venue | undefined {
  return venues.find((venue) => venue.id === id);
}
