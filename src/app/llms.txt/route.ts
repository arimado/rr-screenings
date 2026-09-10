import { llmsTxt } from "@/lib/llms-txt";

export const revalidate = 3600;

export function GET() {
  return new Response(llmsTxt(), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
