"use client";

import { useEffect, useRef, useState } from "react";

const listingsEnter =
  "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-1 motion-safe:duration-200 motion-safe:ease-out motion-safe:fill-mode-both";

function FadeInner({
  animate,
  className,
  children,
}: {
  animate: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const [play] = useState(animate);
  return (
    <div
      className={play ? `${listingsEnter}${className ? ` ${className}` : ""}` : className}
    >
      {children}
    </div>
  );
}

export function ListingsFade({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: React.ReactNode;
}) {
  const prevId = useRef<string | null>(null);
  const shouldAnimate = prevId.current !== null && prevId.current !== id;

  useEffect(() => {
    prevId.current = id;
  }, [id]);

  return (
    <FadeInner key={id} animate={shouldAnimate} className={className}>
      {children}
    </FadeInner>
  );
}
