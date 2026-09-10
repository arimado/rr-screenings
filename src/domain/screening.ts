export type Screening = {
  id: string;
  sourceId: string;
  venueId: string;
  title: string;
  startsAt: string;
  bookingUrl?: string;
  format?: string;
  year?: number;
  runtimeMins?: number;
};

export type Snapshot = {
  fetchedAt: string;
  screenings: Screening[];
};
