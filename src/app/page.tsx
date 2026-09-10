import { WeekView } from "@/components/week-view";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week: weekParam } = await searchParams;
  return <WeekView weekParam={weekParam} />;
}
