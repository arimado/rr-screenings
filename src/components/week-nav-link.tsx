"use client";

import { Button } from "@/components/ui/button";
import { Loader2Icon } from "lucide-react";
import Link from "next/link";

function isModifiedClick(e: React.MouseEvent) {
  return (
    e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0
  );
}

export function WeekNavLink({
  href,
  label,
  pending = false,
  onNavigate,
  children,
}: {
  href: string;
  label: string;
  pending?: boolean;
  onNavigate?: (href: string) => void;
  children: React.ReactNode;
}) {
  return (
    <Button variant="ghost" size="icon-sm" asChild>
      <Link
        href={href}
        scroll={false}
        aria-label={label}
        aria-busy={pending}
        onClick={(e) => {
          if (!onNavigate || isModifiedClick(e)) return;
          e.preventDefault();
          onNavigate(href);
        }}
      >
        {pending ? (
          <Loader2Icon aria-hidden className="size-3.5 animate-spin" />
        ) : (
          children
        )}
      </Link>
    </Button>
  );
}
