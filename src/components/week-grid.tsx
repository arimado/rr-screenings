import { Button } from "@/components/ui/button";
import { VenueDot } from "@/components/venue-dot";
import type { DayEntry } from "@/data/group";
import { formatSydneyDayHeading } from "@/domain/sydney";
import { nextMonday, prevMonday, type Week } from "@/domain/week";
import Link from "next/link";

export function weekHref(
  monday: string,
  venueId?: string,
  hide9to5?: boolean,
) {
  const q = new URLSearchParams({ week: monday });
  if (hide9to5) q.set("hide9to5", "1");
  const qs = `?${q.toString()}`;
  return venueId ? `/venue/${venueId}${qs}` : `/${qs}`;
}

export function WeekNav({
  week,
  venueId,
  hide9to5,
}: {
  week: Week;
  venueId?: string;
  hide9to5?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Button variant="ghost" size="sm" asChild>
        <Link href={weekHref(prevMonday(week.monday), venueId, hide9to5)}>
          Previous
        </Link>
      </Button>
      <p className="text-sm text-muted-foreground">
        {formatSydneyDayHeading(week.monday)} – {formatSydneyDayHeading(week.sunday)}
      </p>
      <Button variant="ghost" size="sm" asChild>
        <Link href={weekHref(nextMonday(week.monday), venueId, hide9to5)}>
          Next
        </Link>
      </Button>
    </div>
  );
}

function EntryCard({ entry }: { entry: DayEntry }) {
  const single = entry.times.length === 1 ? entry.times[0] : null;
  const outbound = single?.bookingUrl;

  const body = (
    <div className="flex items-start gap-1.5">
      <VenueDot venueId={entry.venueId} name={entry.venueName} className="mt-1 size-2" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium leading-snug">{entry.title}</p>
        <p className="text-[11px] leading-tight text-muted-foreground">
          {entry.times.map((t) => t.label).join(", ")}
        </p>
      </div>
    </div>
  );

  const className =
    "block rounded-lg border bg-card p-2 text-left transition-colors hover:bg-accent/50";

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
            <h2 className="sticky top-0 mb-1.5 bg-background py-1 text-xs font-medium text-muted-foreground">
              {formatSydneyDayHeading(day)}
            </h2>
            {entries.length === 0 ? (
              <p className="text-xs text-muted-foreground">—</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
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
