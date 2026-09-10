import type { Screening } from "../domain/screening";

export type SourceKind = "ticketing" | "chain" | "institution" | "manual";

export type SourceAdapter = {
  id: string;
  kind: SourceKind;
  fetch: () => Promise<Screening[]>;
};
