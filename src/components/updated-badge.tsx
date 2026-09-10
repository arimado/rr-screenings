"use client";

import { Hint } from "@/components/hint";
import { badgeVariants } from "@/components/ui/badge";
import { AlertCircleIcon, ClockIcon } from "lucide-react";

const REFRESH_HINT =
  "Listings refresh three times a day, morning, midday, and evening.";

export function UpdatedBadge({
  dateTime,
  label,
  exact,
  stale,
}: {
  dateTime: string;
  label: string;
  exact: string;
  stale: boolean;
}) {
  const Icon = stale ? AlertCircleIcon : ClockIcon;
  return (
    <Hint content={REFRESH_HINT}>
      <button
        type="button"
        className={badgeVariants({
          variant: stale ? "destructive" : "secondary",
        })}
        aria-label={`${label}. Last fetched ${exact}. ${REFRESH_HINT}`}
      >
        <Icon data-icon="inline-start" />
        <time dateTime={dateTime}>{label}</time>
      </button>
    </Hint>
  );
}
