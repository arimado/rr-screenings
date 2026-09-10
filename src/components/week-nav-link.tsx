"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2Icon } from "lucide-react";
import Link from "next/link";

function isModifiedClick(e: React.MouseEvent) {
  return (
    e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0
  );
}

export function WeekNavLink({
  href,
  children,
  pending = false,
  onNavigate,
}: {
  href: string;
  children: React.ReactNode;
  pending?: boolean;
  onNavigate?: (href: string) => void;
}) {
  return (
    <Button variant="ghost" size="sm" asChild>
      <Link
        href={href}
        scroll={false}
        aria-busy={pending}
        onClick={(e) => {
          if (!onNavigate || isModifiedClick(e)) return;
          e.preventDefault();
          onNavigate(href);
        }}
      >
        {children}
        <Loader2Icon
          data-icon="inline-end"
          aria-hidden
          className={cn(
            "size-3.5",
            pending ? "animate-spin opacity-100" : "opacity-0",
          )}
        />
      </Link>
    </Button>
  );
}
