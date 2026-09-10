import { readFileSync } from "node:fs";
import { join } from "node:path";
import { filmSlug } from "@/domain/film";
import type { Screening, Snapshot } from "@/domain/screening";
import { instantToSydneyYmd } from "@/domain/sydney";

const DATA_DIR = join(process.cwd(), "data");

function readSnapshot(sourceId: string): Snapshot | null {
  for (const name of [`${sourceId}.json`, `${sourceId}.prev.json`]) {
    try {
      const raw = readFileSync(join(DATA_DIR, name), "utf8");
      const parsed = JSON.parse(raw) as Snapshot;
      if (parsed && Array.isArray(parsed.screenings)) {
        return parsed;
      }
    } catch {
      continue;
    }
  }
  return null;
}

export function loadSnapshot(sourceId = "ritz"): Snapshot | null {
  return readSnapshot(sourceId);
}

export function snapshotIsStale(
  snapshot: Snapshot | null,
  now: Date = new Date(),
): boolean {
  if (!snapshot) return false;
  const fetched = Date.parse(snapshot.fetchedAt);
  if (Number.isNaN(fetched)) return true;
  return now.getTime() - fetched > 24 * 60 * 60 * 1000;
}

function upcoming(screenings: Screening[], now: Date): Screening[] {
  const nowMs = now.getTime();
  return screenings.filter((s) => {
    const t = Date.parse(s.startsAt);
    return !Number.isNaN(t) && t >= nowMs;
  });
}

export function getScreenings(
  range: { from: Date; to: Date },
  now: Date = new Date(),
): Screening[] {
  const snapshot = loadSnapshot("ritz");
  if (!snapshot) return [];
  const fromMs = range.from.getTime();
  const toMs = range.to.getTime();
  return upcoming(snapshot.screenings, now).filter((s) => {
    const t = Date.parse(s.startsAt);
    return t >= fromMs && t < toMs;
  });
}

export function getScreeningsForDays(
  days: string[],
  now: Date = new Date(),
): Screening[] {
  const snapshot = loadSnapshot("ritz");
  if (!snapshot) return [];
  const daySet = new Set(days);
  return upcoming(snapshot.screenings, now).filter((s) =>
    daySet.has(instantToSydneyYmd(s.startsAt)),
  );
}

export function getUpcomingBySlug(
  slug: string,
  now: Date = new Date(),
): Screening[] {
  const snapshot = loadSnapshot("ritz");
  if (!snapshot) return [];
  return upcoming(snapshot.screenings, now).filter(
    (s) => filmSlug(s.title, s.year) === slug,
  );
}
