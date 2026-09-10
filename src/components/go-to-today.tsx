"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useEffect, useState } from "react";

export function GoToToday({
  href,
  todayOnPage,
}: {
  href: string;
  todayOnPage: boolean;
}) {
  const [hide, setHide] = useState(false);

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

  const className =
    "fixed right-4 z-20 shadow-md md:hidden bottom-[max(1rem,env(safe-area-inset-bottom))]";

  if (hide) return null;

  if (href.startsWith("#")) {
    return (
      <Button asChild size="sm" className={className}>
        <a href={href} onClick={scrollToTodayOnPage} aria-label="Go to today">
          Today
        </a>
      </Button>
    );
  }

  return (
    <Button asChild size="sm" className={className}>
      <Link href={href} aria-label="Go to today">
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
