"use client";

import { Loader2Icon } from "lucide-react";
import { useEffect, useRef } from "react";

export function WeekNavLabel({
  label,
  ariaLabel,
  dirKey,
  pending = false,
}: {
  label: string;
  ariaLabel: string;
  dirKey: string;
  pending?: boolean;
}) {
  const prevKey = useRef(dirKey);
  const from = prevKey.current;
  const direction = dirKey > from ? "next" : dirKey < from ? "prev" : null;

  useEffect(() => {
    prevKey.current = dirKey;
  }, [dirKey]);

  const slide =
    direction === "next"
      ? "motion-safe:slide-in-from-right-2"
      : direction === "prev"
        ? "motion-safe:slide-in-from-left-2"
        : "";
  const enter = direction
    ? `motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200 motion-safe:ease-out motion-safe:fill-mode-both ${slide}`
    : "";

  return (
    <p
      key={label}
      className={`flex shrink-0 items-center gap-1.5 px-1 text-center text-sm font-medium ${enter}`}
      aria-label={ariaLabel}
      aria-busy={pending}
    >
      {pending ? (
        <Loader2Icon aria-hidden className="size-3.5 animate-spin" />
      ) : null}
      {label}
    </p>
  );
}
