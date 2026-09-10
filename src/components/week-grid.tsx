import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DayEntry } from "@/data/group";
import { formatSydneyDayHeading } from "@/domain/sydney";
import { nextMonday, prevMonday, type Week } from "@/domain/week";
import Link from "next/link";

function weekHref(monday: string, venueId?: string) {
  const q = `?week=${monday}`;
  return venueId ? `/venue/${venueId}${q}` : `/${q}`;
}

export function WeekNav({
  week,
  venueId,
}: {
  week: Week;
  venueId?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Button variant="ghost" size="sm" asChild>
        <Link href={weekHref(prevMonday(week.monday), venueId)}>Previous</Link>
      </Button>
      <p className="text-sm text-muted-foreground">
        {formatSydneyDayHeading(week.monday)} – {formatSydneyDayHeading(week.sunday)}
      </p>
      <Button variant="ghost" size="sm" asChild>
        <Link href={weekHref(nextMonday(week.monday), venueId)}>Next</Link>
      </Button>
    </div>
  );
}

function EntryCard({ entry }: { entry: DayEntry }) {
  const single = entry.times.length === 1 ? entry.times[0] : null;
  const outbound = single?.bookingUrl;

  const body = (
    <>
      <p className="font-medium leading-snug">{entry.title}</p>
      <Badge variant="secondary">{entry.venueName}</Badge>
      <p className="text-sm text-muted-foreground">
        {entry.times.map((t) => t.label).join(", ")}
      </p>
    </>
  );

  const className =
    "block rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent/50";

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
    <Link href={`/film/${entry.slug}`} className={className}>
      {body}
    </Link>
  );
}

export function WeekGrid({
  days,
  byDay,
}: {
  days: string[];
  byDay: Map<string, DayEntry[]>;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-7 md:gap-3">
      {days.map((day) => {
        const entries = byDay.get(day) ?? [];
        return (
          <section key={day} className="min-w-0">
            <h2 className="mb-2 text-sm font-medium sticky top-0 bg-background py-1">
              {formatSydneyDayHeading(day)}
            </h2>
            {entries.length === 0 ? (
              <p className="text-sm text-muted-foreground">—</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {entries.map((entry) => (
                  <li key={entry.key}>
                    <EntryCard entry={entry} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
