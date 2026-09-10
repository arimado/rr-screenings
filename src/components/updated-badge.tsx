"use client";

import { Badge } from "@/components/ui/badge";
import { AlertCircleIcon, ClockIcon } from "lucide-react";

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
    <Badge variant={stale ? "destructive" : "secondary"} asChild>
      <button type="button" title={exact}>
        <Icon data-icon="inline-start" />
        <time dateTime={dateTime}>{label}</time>
      </button>
    </Badge>
  );
}
