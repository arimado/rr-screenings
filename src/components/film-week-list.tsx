import { VenueDot } from "@/components/venue-dot";
import { filmHref, type WeekQuery } from "@/components/week-grid";
import type { FilmWeekEntry, FilmWeekTime } from "@/data/group";
import { formatSydneyWeekday } from "@/domain/sydney";
import Link from "next/link";

function venueTimesLine(times: FilmWeekTime[]): string {
  const byDay: { day: string; labels: string[] }[] = [];
  for (const t of times) {
    const last = byDay[byDay.length - 1];
    if (last && last.day === t.day) last.labels.push(t.label);
    else byDay.push({ day: t.day, labels: [t.label] });
  }
  return byDay
    .map((d) => `${formatSydneyWeekday(d.day)} ${d.labels.join(", ")}`)
    .join(" · ");
}

function FilmCard({
  entry,
  href,
}: {
  entry: FilmWeekEntry;
  href: string;
}) {
  const times = entry.venues.flatMap((v) => v.times);
  const single = times.length === 1 ? times[0] : null;
  const outbound = single?.bookingUrl;
  const yearLabel = entry.year != null ? ` (${entry.year})` : "";

  const body = (
    <div className="min-w-0">
      <p className="text-xs font-medium leading-snug">
        {entry.title}
        {yearLabel}
      </p>
      <ul className="mt-1 flex flex-col gap-0.5">
        {entry.venues.map((v) => (
          <li
            key={v.venueId}
            className="flex items-start gap-1.5 text-[11px] leading-tight"
          >
            <VenueDot
              venueId={v.venueId}
              name={v.venueName}
              className="mt-0.5 size-2"
            />
            <span className="min-w-0">
              <span className="text-muted-foreground/55">{v.venueName}</span>
              <span className="text-muted-foreground/80">
                {" "}
                {venueTimesLine(v.times)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );

  const className =
    "block h-full rounded-lg bg-card p-2 text-left transition-colors hover:bg-accent/50";

  if (outbound) {
    return (
      <a
        href={outbound}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {body}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {body}
    </Link>
  );
}

export function FilmWeekList({
  entries,
  monday,
  query,
}: {
  entries: FilmWeekEntry[];
  monday: string;
  query: WeekQuery;
}) {
  return (
    <ul className="grid w-full gap-1.5 md:grid-cols-2 md:gap-3 lg:grid-cols-3">
      {entries.map((entry) => (
        <li key={entry.slug} className="min-w-0">
          <FilmCard
            entry={entry}
            href={filmHref(entry.slug, monday, query)}
          />
        </li>
      ))}
    </ul>
  );
}
