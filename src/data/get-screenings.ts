import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { filmSlug } from "@/domain/film";
import type { Screening, Snapshot } from "@/domain/screening";
import { instantToSydneyYmd } from "@/domain/sydney";

const DATA_DIR = join(process.cwd(), "data");

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

export function filmIsKnown(slug: string): boolean {
  return allScreenings().some((s) => filmSlug(s.title, s.year) === slug);
}

export function knownFilmMeta(
  slug: string,
): { title: string; year?: number } | undefined {
  const s = allScreenings().find((row) => filmSlug(row.title, row.year) === slug);
  return s ? { title: s.title, year: s.year } : undefined;
}
