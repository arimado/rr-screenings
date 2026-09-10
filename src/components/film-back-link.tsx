"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

function isModifiedClick(e: React.MouseEvent) {
  return (
    e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0
  );
}

export function FilmBackLink({ href }: { href: string }) {
  const router = useRouter();
  return (
    <Link
      href={href}
      className="hover:underline"
      onClick={(e) => {
        if (isModifiedClick(e)) return;
        if (window.history.length <= 1) return;
        e.preventDefault();
        router.back();
      }}
    >
      <span className="md:hidden">Back</span>
      <span className="hidden md:inline">This week</span>
    </Link>
  );
}
