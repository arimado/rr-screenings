import { WeekView } from "@/components/week-view";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; hide9to5?: string }>;
}) {
  const { week: weekParam, hide9to5 } = await searchParams;
  return (
    <WeekView weekParam={weekParam} hide9to5={hide9to5 === "1"} />
  );
}
