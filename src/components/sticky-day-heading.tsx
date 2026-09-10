"use client";

import { useEffect, useRef, useState } from "react";

export function StickyDayHeading({
  children,
  isToday,
}: {
  children: React.ReactNode;
  isToday: boolean;
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setStuck(entry.intersectionRatio < 1),
      { threshold: [1], rootMargin: "-1px 0px 0px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <h2
      ref={ref}
      className={`sticky top-0 z-10 mb-1.5 bg-background py-1 text-xs font-medium motion-safe:transition-[box-shadow] motion-safe:duration-150 motion-safe:ease-out ${
        isToday ? "text-foreground" : "text-muted-foreground"
      } ${stuck ? "shadow-[0_1px_0_0_var(--border)]" : "shadow-none"}`}
    >
      {children}
    </h2>
  );
}
