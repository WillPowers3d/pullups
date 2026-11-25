import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ScheduleGrid, type GridSession, type GridWeek } from "@/components/train/schedule-grid";
import { TRAIN_CONFIG } from "@/lib/train/config";
import { addDays, startOfWeekMonday } from "@/lib/dates";
import { getActiveBlock, listSessions } from "@/lib/train/repo";
import type { SessionPlan } from "@/lib/train/engine/types";

export default async function SchedulePage() {
  await connection();
  const block = getActiveBlock(TRAIN_CONFIG.DEFAULT_USER_ID);
  if (!block) redirect("/start");
  const rows = listSessions(block.id);
  const sessions: GridSession[] = rows.map((r) => {
    const plan = JSON.parse(r.plan_json) as SessionPlan;
    return {
      id: r.id,
      date: r.date,
      type: r.type,
      status: r.status,
      weekIndex: r.week_index,
      setCount: plan.sets.length,
      taper: plan.taper,
    };
  });

  const weeks: GridWeek[] = [];
  const seen = new Set<string>();
  for (const s of sessions) {
    const monday = startOfWeekMonday(s.date);
    if (seen.has(monday)) continue;
    seen.add(monday);
    weeks.push({ weekIndex: s.weekIndex, days: Array.from({ length: 7 }, (_, i) => addDays(monday, i)) });
  }
  weeks.sort((a, b) => a.days[0]!.localeCompare(b.days[0]!));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Schedule</h1>
      <p className="text-sm text-muted-foreground">
        {block.start_date} → PR day {block.pr_date}
        {block.compressed === 1 ? " · compressed plan" : ""}. Tap a session to see it or move it.
      </p>
      <ScheduleGrid
        weeks={weeks}
        sessions={sessions}
        prDate={block.pr_date}
        today={new Date().toISOString().slice(0, 10)}
      />
    </div>
  );
}
