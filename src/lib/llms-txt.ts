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

> Week calendar of screenings at Sydney’s independent, repertory, and museum cinemas. Not multiplexes. Not a ticket shop — Book always means leave this site for the cinema’s own page.

The cinema list is the product. Ritz, Golden Age, Dendy Newtown, the Orpheum, AGNSW Cinémathèque, MCA film programmes — rooms people actually leave the house for. Default on \`/\` is Golden Age, AGNSW, and MCA. Ritz, Dendy, the Orpheum, and Palace are off until you turn a chip on. Not Event, not Hoyts, not every cinema in Sydney. Chauvel is closed; it is not a source.

Sydney only. Days and times are Australia/Sydney. No accounts, no maps, no editorial film picks — taste is which rooms we include. Listings come from those cinemas. The only fact is a screening: this film, at this cinema, starting at this instant. The week is Monday–Sunday. Past sessions are dropped, so earlier days of the current week may be empty.

Useful query params on \`/\` and \`/venue/{id}\`: \`day=YYYY-MM-DD\` (one Sydney date), \`view=film\` (group the week by title), \`venues=id,id\` (cinema filter), \`hide9to5=1\` (weekends plus weekdays from 5pm), \`oneLeft=1\` (films with one remaining session). Film pages are \`${origin}/film/{slug}\`.

## Pages

- [This week](${loc("/")}): Current Monday–Sunday grid. Default cinemas are Golden Age, AGNSW, and MCA.

## Cinemas

${cinemaLines.join("\n")}

## Optional

- [Sitemap](${loc("/sitemap.xml")}): \`/\`, every venue, and every upcoming \`/film/{slug}\`. Film pages include JSON-LD (\`Movie\` + \`ScreeningEvent\`) with booking URLs.
`;
}
