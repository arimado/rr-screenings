import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { filmSlug } from "@/domain/film";
import type { Screening, Snapshot } from "@/domain/screening";
import { instantToSydneyYmd } from "@/domain/sydney";

const DATA_DIR = join(process.cwd(), "data");

let snapshotsCache: { sourceId: string; snapshot: Snapshot }[] | null = null;

function readSnapshotFile(filename: string): Snapshot | null {
  try {
    const raw = readFileSync(join(DATA_DIR, filename), "utf8");
    const parsed = JSON.parse(raw) as Snapshot;
    if (parsed && Array.isArray(parsed.screenings)) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

export function loadSnapshot(sourceId: string): Snapshot | null {
  return (
    readSnapshotFile(`${sourceId}.json`) ??
    readSnapshotFile(`${sourceId}.prev.json`)
  );
}

export function loadSnapshots(): { sourceId: string; snapshot: Snapshot }[] {
  if (snapshotsCache && process.env.NODE_ENV !== "development") {
    return snapshotsCache;
  }
  let names: string[] = [];
  try {
    names = readdirSync(DATA_DIR);
  } catch {
    return [];
  }
  const current = names.filter(
    (n) => n.endsWith(".json") && !n.endsWith(".prev.json"),
  );
  const out: { sourceId: string; snapshot: Snapshot }[] = [];
  const seen = new Set<string>();
  for (const name of current) {
    const sourceId = name.replace(/\.json$/, "");
    const snapshot = loadSnapshot(sourceId);
    if (snapshot) {
      seen.add(sourceId);
      out.push({ sourceId, snapshot });
    }
  }
  for (const name of names.filter((n) => n.endsWith(".prev.json"))) {
    const sourceId = name.replace(/\.prev\.json$/, "");
    if (seen.has(sourceId)) continue;
    const snapshot = loadSnapshot(sourceId);
    if (snapshot) out.push({ sourceId, snapshot });
  }
  snapshotsCache = out;
  return out;
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

/** Oldest `fetchedAt` among snapshots — how fresh the grid as a whole is. */
export function oldestFetchedAt(
  snapshots: { snapshot: Snapshot }[],
): string | undefined {
  const times = snapshots
    .map(({ snapshot }) => snapshot.fetchedAt)
    .filter((iso) => !Number.isNaN(Date.parse(iso)))
    .sort();
  return times[0];
}

export function formatUpdatedAgo(iso: string, now: Date = new Date()): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "Updated unknown";
  const deltaMs = then - now.getTime();
  const abs = Math.abs(deltaMs);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (abs < minute) return "Updated just now";
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (abs < hour) {
    return `Updated ${rtf.format(Math.round(deltaMs / minute), "minute")}`;
  }
  if (abs < day) {
    return `Updated ${rtf.format(Math.round(deltaMs / hour), "hour")}`;
  }
  return `Updated ${rtf.format(Math.round(deltaMs / day), "day")}`;
}

function allScreenings(): Screening[] {
  return loadSnapshots().flatMap(({ snapshot }) => snapshot.screenings);
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
  const fromMs = range.from.getTime();
  const toMs = range.to.getTime();
  return upcoming(allScreenings(), now).filter((s) => {
    const t = Date.parse(s.startsAt);
    return t >= fromMs && t < toMs;
  });
}

export function getScreeningsForDays(
  days: string[],
  now: Date = new Date(),
): Screening[] {
  const daySet = new Set(days);
  return upcoming(allScreenings(), now).filter((s) =>
    daySet.has(instantToSydneyYmd(s.startsAt)),
  );
}

export function slugsWithOneUpcoming(now: Date = new Date()): Set<string> {
  const counts = new Map<string, number>();
  for (const s of upcoming(allScreenings(), now)) {
    const slug = filmSlug(s.title, s.year);
    counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }
  const slugs = new Set<string>();
  for (const [slug, n] of counts) {
    if (n === 1) slugs.add(slug);
  }
  return slugs;
}

export function getUpcomingBySlug(
  slug: string,
  now: Date = new Date(),
): Screening[] {
  return upcoming(allScreenings(), now).filter(
    (s) => filmSlug(s.title, s.year) === slug,
  );
}

export function upcomingFilmSlugs(now: Date = new Date()): string[] {
  const slugs = new Set<string>();
  for (const s of upcoming(allScreenings(), now)) {
    slugs.add(filmSlug(s.title, s.year));
  }
  return [...slugs].sort();
}

export function filmIsKnown(slug: string): boolean {
  return allScreenings().some((s) => filmSlug(s.title, s.year) === slug);
}

export function knownFilmMeta(
  slug: string,
): { title: string; year?: number } | undefined {
  const s = allScreenings().find((row) => filmSlug(row.title, row.year) === slug);
  return s ? { title: s.title, year: s.year } : undefined;
}
