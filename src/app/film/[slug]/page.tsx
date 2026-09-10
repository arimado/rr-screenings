import { Badge } from "@/components/ui/badge";
import { FilmBackLink } from "@/components/film-back-link";
import { weekHref } from "@/components/week-grid";
import {
  filmIsKnown,
  getUpcomingBySlug,
  knownFilmMeta,
} from "@/data/get-screenings";
import {
  formatSydneyDayHeading,
  formatSydneyTime,
  instantToSydneyYmd,
} from "@/domain/sydney";
import { getVenue, parseVenueIds } from "@/domain/venue";
import { parseWeekParam } from "@/domain/week";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function FilmPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    week?: string;
    hide9to5?: string;
    oneLeft?: string;
    venues?: string | string[];
  }>;
}) {
  const { slug } = await params;
  const { week: weekParam, hide9to5, oneLeft, venues } = await searchParams;
  const week = parseWeekParam(weekParam);
  const backHref = weekHref(week.monday, {
    venueIds: parseVenueIds(venues),
    hide9to5: hide9to5 === "1",
    oneLeft: oneLeft === "1",
  });
  const screenings = getUpcomingBySlug(slug);
  const known = filmIsKnown(slug);
  const meta = knownFilmMeta(slug);

  if (screenings.length === 0 && !known) notFound();

  const title = screenings[0]?.title ?? meta?.title;
  const year = screenings[0]?.year ?? meta?.year;

  const byDay = new Map<string, typeof screenings>();
  for (const s of screenings) {
    const day = instantToSydneyYmd(s.startsAt);
    const list = byDay.get(day) ?? [];
    list.push(s);
    byDay.set(day, list);
  }
  const days = [...byDay.keys()].sort();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <p className="text-sm text-muted-foreground">
        <FilmBackLink href={backHref} />
      </p>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {year != null ? (
          <p className="text-sm text-muted-foreground">{year}</p>
        ) : null}
      </header>
      {screenings.length === 0 ? (
        <p className="text-sm text-muted-foreground">This film has finished.</p>
      ) : (
        days.map((day) => (
          <section key={day} className="flex flex-col gap-2">
            <h2 className="text-sm font-medium">{formatSydneyDayHeading(day)}</h2>
            <ul className="flex flex-col gap-2">
              {(byDay.get(day) ?? [])
                .slice()
                .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
                .map((s) => {
                  const venue = getVenue(s.venueId);
                  const time = (
                    <span className="flex flex-wrap items-center gap-2">
                      <span>{formatSydneyTime(s.startsAt)}</span>
                      <Badge variant="secondary">
                        {venue?.name ?? s.venueId}
                      </Badge>
                      {s.format ? (
                        <Badge variant="outline">{s.format}</Badge>
                      ) : null}
                    </span>
                  );
                  return (
                    <li key={s.id} className="rounded-lg border p-3 text-sm">
                      {s.bookingUrl ? (
                        <a
                          href={s.bookingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          {time}
                        </a>
                      ) : (
                        time
                      )}
                    </li>
                  );
                })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
