"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useEffect, useState } from "react";

function isModifiedClick(e: React.MouseEvent) {
  return (
    e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0
  );
}

export function GoToToday({
  href,
  todayOnPage,
  onNavigate,
}: {
  href: string;
  todayOnPage: boolean;
  onNavigate?: (href: string) => void;
}) {
  const [hide, setHide] = useState(todayOnPage);

  useEffect(() => {
    if (window.location.hash === "#today") {
      document.getElementById("today")?.scrollIntoView({ block: "start" });
    }
    if (!todayOnPage) {
      setHide(false);
      return;
    }
    const el = document.getElementById("today");
    if (!el) {
      setHide(false);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => setHide(entry.isIntersecting),
      { threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [todayOnPage]);

  const className = `fixed right-4 z-20 shadow-md md:hidden bottom-[max(1rem,env(safe-area-inset-bottom))] motion-safe:transition-[opacity,transform] motion-safe:duration-150 motion-safe:ease-out ${
    hide
      ? "pointer-events-none opacity-0 motion-safe:translate-y-1"
      : "opacity-100"
  }`;

  if (href.startsWith("#")) {
    return (
      <Button
        asChild
        size="sm"
        className={className}
        aria-hidden={hide}
      >
        <a
          href={href}
          onClick={scrollToTodayOnPage}
          aria-label="Go to today"
          tabIndex={hide ? -1 : undefined}
        >
          Today
        </a>
      </Button>
    );
  }

  return (
    <Button
      asChild
      size="sm"
      className={className}
      aria-hidden={hide}
    >
      <Link
        href={href}
        aria-label="Go to today"
        tabIndex={hide ? -1 : undefined}
        onClick={(e) => {
          if (!onNavigate || isModifiedClick(e)) return;
          e.preventDefault();
          onNavigate(href);
        }}
      >
        Today
      </Link>
    </Button>
  );
}

function scrollToTodayOnPage(e: React.MouseEvent<HTMLAnchorElement>) {
  const el = document.getElementById("today");
  if (!el) return;
  e.preventDefault();
  const reduced = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  el.scrollIntoView({
    behavior: reduced ? "auto" : "smooth",
    block: "start",
  });
  history.replaceState(null, "", "#today");
}
