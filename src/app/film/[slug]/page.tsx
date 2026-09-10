import { Badge } from "@/components/ui/badge";
import { FilmBackLink } from "@/components/film-back-link";
import { ShareButton } from "@/components/share-button";
import { weekHref } from "@/components/week-grid";
import {
  filmIsKnown,
  getUpcomingBySlug,
  knownFilmMeta,
} from "@/data/get-screenings";
import {
  filmCanonicalPath,
  filmShareTitle,
  siteTitle,
} from "@/domain/share";
import {
  formatSydneyDayHeading,
  formatSydneyTime,
  instantToSydneyYmd,
} from "@/domain/sydney";
import { getVenue, parseVenueIds } from "@/domain/venue";
import { resolveListingsWeek } from "@/domain/week";
import type { ListingsSearch } from "@/lib/listings-metadata";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const screenings = getUpcomingBySlug(slug);
  const meta = knownFilmMeta(slug);
  const name = screenings[0]?.title ?? meta?.title;
  const year = screenings[0]?.year ?? meta?.year;
  if (!name) return { title: { absolute: siteTitle() } };
  const label = filmShareTitle(name, year);
  const title = siteTitle(label);
  const description = `Upcoming Sydney screenings of ${label}.`;
  return {
    title: { absolute: title },
    description,
    openGraph: { title, description },
    twitter: { card: "summary", title, description },
  };
}

export default async function FilmPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<ListingsSearch>;
}) {
  const { slug } = await params;
  const {
    week: weekParam,
    hide9to5,
    oneLeft,
    venues,
    view,
    day: dayParam,
  } = await searchParams;
  const { week, view: listingsView, day } = resolveListingsWeek({
    weekParam,
    view,
    dayParam,
  });
  const backHref = weekHref(week.monday, {
    venueIds: parseVenueIds(venues),
    hide9to5: hide9to5 === "1",
    oneLeft: oneLeft === "1",
    ...(listingsView === "day" && day ? { view: "day" as const, day } : {}),
  });
  const screenings = getUpcomingBySlug(slug);
  const known = filmIsKnown(slug);
  const meta = knownFilmMeta(slug);

  if (screenings.length === 0 && !known) notFound();

  const title = screenings[0]?.title ?? meta?.title;
  const year = screenings[0]?.year ?? meta?.year;
  const shareLabel = title ? filmShareTitle(title, year) : undefined;

  const byDay = new Map<string, typeof screenings>();
  for (const s of screenings) {
    const ymd = instantToSydneyYmd(s.startsAt);
    const list = byDay.get(ymd) ?? [];
    list.push(s);
    byDay.set(ymd, list);
  }
  const days = [...byDay.keys()].sort();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <p className="text-sm text-muted-foreground">
        <FilmBackLink href={backHref} />
      </p>
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {year != null ? (
            <p className="text-sm text-muted-foreground">{year}</p>
          ) : null}
        </div>
        {shareLabel ? (
          <ShareButton
            title={siteTitle(shareLabel)}
            url={filmCanonicalPath(slug)}
          />
        ) : null}
      </header>
      {screenings.length === 0 ? (
        <p className="text-sm text-muted-foreground">This film has finished.</p>
      ) : (
        days.map((ymd) => (
          <section key={ymd} className="flex flex-col gap-2">
            <h2 className="text-sm font-medium">
              {formatSydneyDayHeading(ymd)}
            </h2>
            <ul className="flex flex-col gap-2">
              {(byDay.get(ymd) ?? [])
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
