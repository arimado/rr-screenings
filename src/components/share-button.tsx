"use client";

import { Hint } from "@/components/hint";
import { Button } from "@/components/ui/button";
import { Share2Icon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const LISTINGS_HINT =
  "Shares this view, filters and all, so your mate sees the same listings.";

export function ShareButton({
  title,
  url,
  hint = LISTINGS_HINT,
}: {
  title: string;
  /** Absolute or root-relative. Omit to share the current address bar. */
  url?: string;
  hint?: string;
}) {
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    };
  }, []);

  async function onShare() {
    const href = url
      ? new URL(url, window.location.origin).href
      : window.location.href;
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title, url: href });
        return;
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can fail without a permission or secure context.
    }
  }

  return (
    <Hint content={copied ? "Copied" : hint}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onShare}
        aria-label={copied ? "Copied" : hint}
      >
        {copied ? (
          <span className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-150 motion-safe:ease-out motion-safe:fill-mode-both">
            Copied
          </span>
        ) : (
          <Share2Icon />
        )}
      </Button>
    </Hint>
  );
}
