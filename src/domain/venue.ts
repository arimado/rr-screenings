export type Venue = {
  id: string;
  name: string;
  suburb?: string;
  color: string;
  /** When false, omitted from `/` until the cinema chip is turned on. */
  defaultOn?: boolean;
};

export const venues: Venue[] = [
  {
    id: "ritz-randwick",
    name: "Ritz",
    suburb: "Randwick",
    color: "#c45c26",
  },
  {
    id: "golden-age-surry-hills",
    name: "Golden Age",
    suburb: "Surry Hills",
    color: "#c9a227",
  },
  {
    id: "dendy-newtown",
    name: "Dendy",
    suburb: "Newtown",
    color: "#ed1164",
  },
  {
    id: "orpheum-cremorne",
    name: "Orpheum",
    suburb: "Cremorne",
    color: "#801025",
  },
  {
    id: "agnsw-domain",
    name: "AGNSW",
    suburb: "Sydney",
    color: "#1c3d5a",
  },
  {
    id: "mca-the-rocks",
    name: "MCA",
    suburb: "The Rocks",
    color: "#c8102e",
  },
  {
    id: "palace-norton-street",
    name: "Palace Norton St",
    suburb: "Leichhardt",
    color: "#9a7b2f",
    defaultOn: false,
  },
  {
    id: "palace-central-chippendale",
    name: "Palace Central",
    suburb: "Chippendale",
    color: "#c4a35a",
    defaultOn: false,
  },
  {
    id: "palace-moore-park",
    name: "Palace Moore Park",
    suburb: "Moore Park",
    color: "#7a5c1e",
    defaultOn: false,
  },
];

export function defaultVenueIds(): string[] {
  return venues.filter((v) => v.defaultOn !== false).map((v) => v.id);
}

export function isDefaultVenueIds(ids: string[]): boolean {
  const def = defaultVenueIds();
  return ids.length === def.length && ids.every((id, i) => id === def[i]);
}

export function getVenue(id: string): Venue | undefined {
  return venues.find((venue) => venue.id === id);
}

export function parseVenueIds(raw?: string | string[]): string[] {
  if (raw === undefined) return defaultVenueIds();
  const joined = Array.isArray(raw) ? raw.join(",") : raw;
  if (joined.trim() === "" || joined.trim() === "none") return [];
  const wanted = new Set(joined.split(",").map((s) => s.trim()).filter(Boolean));
  return venues.filter((v) => wanted.has(v.id)).map((v) => v.id);
}

export function toggleVenueId(selected: string[], id: string): string[] {
  if (!getVenue(id)) return selected;
  const on = new Set(selected);
  if (on.has(id)) on.delete(id);
  else on.add(id);
  return venues.filter((v) => on.has(v.id)).map((v) => v.id);
}
