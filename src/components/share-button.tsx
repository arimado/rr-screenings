"use client";

import { Button } from "@/components/ui/button";
import { Share2Icon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function ShareButton({
  title,
  url,
}: {
  title: string;
  /** Absolute or root-relative. Omit to share the current address bar. */
  url?: string;
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
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onShare}
      aria-label={copied ? "Copied" : "Share"}
    >
      {copied ? "Copied" : <Share2Icon />}
    </Button>
  );
}
