import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Snapshot } from "../domain/screening";
import { sources } from "../sources";

const DATA_DIR = join(process.cwd(), "data");
const TIMEOUT_MS = 60_000;

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let t: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    t = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
  });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    if (t) clearTimeout(t);
  }
}

function writeSnapshot(sourceId: string, snapshot: Snapshot) {
  mkdirSync(DATA_DIR, { recursive: true });
  const dest = join(DATA_DIR, `${sourceId}.json`);
  const prev = join(DATA_DIR, `${sourceId}.prev.json`);
  try {
    copyFileSync(dest, prev);
  } catch {
    // no current file yet
  }
  writeFileSync(dest, `${JSON.stringify(snapshot, null, 2)}\n`);
}

async function main() {
  mkdirSync(DATA_DIR, { recursive: true });
  for (const source of sources) {
    try {
      const screenings = await withTimeout(
        source.fetch(),
        TIMEOUT_MS,
        source.id,
      );
      if (!Array.isArray(screenings)) {
        throw new Error("invalid result");
      }
      writeSnapshot(source.id, {
        fetchedAt: new Date().toISOString(),
        screenings,
      });
      console.log(`${source.id}: wrote ${screenings.length} screenings`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`${source.id}: failed (${message}); kept last-good`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
