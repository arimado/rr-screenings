import { SITE_NAME, venueCanonicalPath } from "@/domain/share";
import { venues } from "@/domain/venue";
import { siteUrl } from "@/lib/site-url";

function loc(path: string) {
  return new URL(path, siteUrl()).href;
}

export function llmsTxt() {
  const origin = siteUrl().href.replace(/\/$/, "");
  const cinemaLines = venues.map((v) => {
    const where = v.suburb ? `, ${v.suburb}` : "";
    const onHome =
      v.defaultOn === false
        ? "Off on `/` until the chip is on."
        : "On by default on `/`.";
    return `- [${v.name}${where}](${loc(venueCanonicalPath(v.id))}): ${onHome}`;
  });

  return `# ${SITE_NAME}

> Public week calendar of upcoming cinema screenings in Sydney. Not a ticket shop — Book always means leave this site for the cinema’s own page.

Sydney only. Days and times are Australia/Sydney. There are no accounts, no maps, and no editorial picks. Listings come from the cinemas. The only fact is a screening: this film, at this cinema, starting at this instant. The week is Monday–Sunday. Past sessions are dropped, so earlier days of the current week may be empty.

Palace (Norton St, Central, Moore Park) is included but off on \`/\` until you turn a chip on. Chauvel is closed; it is not a source.

Useful query params on \`/\` and \`/venue/{id}\`: \`day=YYYY-MM-DD\` (one Sydney date), \`view=film\` (group the week by title), \`venues=id,id\` (cinema filter), \`hide9to5=1\` (weekends plus weekdays from 5pm), \`oneLeft=1\` (films with one remaining session). Film pages are \`${origin}/film/{slug}\`.

## Pages

- [This week](${loc("/")}): Current Monday–Sunday grid. Default cinemas omit Palace.

## Cinemas

${cinemaLines.join("\n")}

## Optional

- [Sitemap](${loc("/sitemap.xml")}): \`/\`, every venue, and every upcoming \`/film/{slug}\`. Film pages include JSON-LD (\`Movie\` + \`ScreeningEvent\`) with booking URLs.
`;
}
