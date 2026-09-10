"use client";

import { useEffect, useRef } from "react";

export function WeekNavLabel({
  label,
  ariaLabel,
  dirKey,
}: {
  label: string;
  ariaLabel: string;
  dirKey: string;
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
      className={`min-w-0 flex-1 px-1 text-center text-sm font-medium ${enter}`}
      aria-label={ariaLabel}
    >
      {label}
    </p>
  );
}
