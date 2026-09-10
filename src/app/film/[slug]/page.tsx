import { Badge } from "@/components/ui/badge";
import { getUpcomingBySlug, loadSnapshot } from "@/data/get-screenings";
import { filmSlug } from "@/domain/film";
import {
  formatSydneyDayHeading,
  formatSydneyTime,
  instantToSydneyYmd,
} from "@/domain/sydney";
import { getVenue } from "@/domain/venue";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function FilmPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const screenings = getUpcomingBySlug(slug);
  const snapshot = loadSnapshot("ritz");
  const known =
    snapshot?.screenings.some((s) => filmSlug(s.title, s.year) === slug) ??
    false;

  if (screenings.length === 0 && !known) notFound();

  const title = screenings[0]?.title ??
    snapshot?.screenings.find((s) => filmSlug(s.title, s.year) === slug)?.title;
  const year = screenings[0]?.year ??
    snapshot?.screenings.find((s) => filmSlug(s.title, s.year) === slug)?.year;

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
        <Link href="/" className="hover:underline">
          This week
        </Link>
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
