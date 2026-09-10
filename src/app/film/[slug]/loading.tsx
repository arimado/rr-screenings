export default function FilmLoading() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <div className="h-4 w-16 rounded bg-muted" />
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <div className="h-8 w-48 rounded bg-muted" />
          <div className="h-4 w-12 rounded bg-muted" />
        </div>
        <div className="size-7 rounded bg-muted" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="h-4 w-28 rounded bg-muted" />
        <div className="h-14 rounded-lg border bg-card" />
        <div className="h-14 rounded-lg border bg-card" />
      </div>
    </div>
  );
}
