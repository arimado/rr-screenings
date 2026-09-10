export function normalizeTitle(title: string, year?: number): string {
  let t = title.trim().toLowerCase().replace(/\s+/g, " ");
  if (year != null) {
    t = t.replace(new RegExp(`\\s*\\(${year}\\)\\s*$`), "").trim();
  }
  return t;
}

export function filmSlug(title: string, year?: number): string {
  const base = normalizeTitle(title, year)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return year != null ? `${base}-${year}` : base;
}

export function sameFilm(
  a: { title: string; year?: number },
  b: { title: string; year?: number },
): boolean {
  return (
    normalizeTitle(a.title, a.year) === normalizeTitle(b.title, b.year) &&
    a.year === b.year
  );
}
