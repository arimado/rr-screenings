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
  side,
  children,
}: {
  href: string;
  label: string;
  pending?: boolean;
  onNavigate?: (href: string) => void;
  side: "prev" | "next";
  children: React.ReactNode;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      asChild
      className={
        side === "prev"
          ? "min-w-0 flex-1 justify-start rounded-r-none"
          : "min-w-0 flex-1 justify-end rounded-l-none"
      }
    >
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
