import { agnsw } from "./agnsw";
import { dendy } from "./dendy";
import { goldenAge } from "./golden-age";
import { orpheum } from "./orpheum";
import { palace } from "./palace";
import { ritz } from "./ritz";
import type { SourceAdapter } from "./types";

export const sources: SourceAdapter[] = [
  ritz,
  goldenAge,
  dendy,
  orpheum,
  agnsw,
  palace,
];
