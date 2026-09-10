export type Venue = {
  id: string;
  name: string;
  suburb?: string;
  color: string;
};

export const venues: Venue[] = [
  {
    id: "ritz-randwick",
    name: "Ritz Cinemas",
    suburb: "Randwick",
    color: "#c45c26",
  },
  {
    id: "golden-age-surry-hills",
    name: "Golden Age",
    suburb: "Surry Hills",
    color: "#c9a227",
  },
];

export function getVenue(id: string): Venue | undefined {
  return venues.find((venue) => venue.id === id);
}
