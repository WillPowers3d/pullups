import Link from "next/link";
import { connection } from "next/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { STATUS_LABEL, TYPE_ICON, TYPE_LABEL } from "@/components/train/session-meta";
import { TRAIN_CONFIG } from "@/lib/train/config";
import { getActiveBlock, listBlocks, listSessions, listSets } from "@/lib/train/repo";
import type { ProgressDecision } from "@/lib/train/engine/types";
import { cn } from "cn";

export default async function HistoryPage() {
  await connection();
  const userId = TRAIN_CONFIG.DEFAULT_USER_ID;
  const today = new Date().toISOString().slice(0, 10);
  const blocks = listBlocks(userId);
  const block = getActiveBlock(userId) ?? blocks.at(-1) ?? null;

  if (!block) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">History</h1>
        <p className="text-muted-foreground">Nothing logged yet.</p>
        <Link href="/start" className={cn(buttonVariants(), "w-fit")}>
          Start a block
        </Link>
      </div>
    );
  }

  const past = listSessions(block.id)
    .filter((s) => s.status === "done" || s.date < today)
    .reverse();
  const maxPoints: { label: string; date: string; reps: number }[] = [
    { label: "Baseline", date: block.created_at.slice(0, 10), reps: block.baseline_max },
  ];
  for (const s of [...past].reverse()) {
    if (s.status !== "done" || (s.type !== "max_test" && s.type !== "pr_attempt")) continue;
    const reps = listSets(s.id).find((x) => x.phase === "test")?.actual_reps;
    if (typeof reps === "number") {
      maxPoints.push({ label: s.type === "pr_attempt" ? "PR attempt" : `Week ${s.week_index} test`, date: s.date, reps });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">History</h1>

      <Card>
        <CardHeader>
          <CardTitle>Max reps</CardTitle>
          <CardDescription>Training max now {block.current_max}</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="flex flex-col gap-1 text-sm">
            {maxPoints.map((p) => (
              <li key={`${p.label}-${p.date}`} className="flex justify-between gap-2">
                <span>
                  {p.label} · {p.date}
                </span>
                <strong className="tabular-nums">{p.reps}</strong>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Past sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {past.length === 0 ? (
            <p className="text-sm text-muted-foreground">No past sessions yet.</p>
          ) : (
            <ul className="flex flex-col divide-y text-sm">
              {past.map((s) => {
                const decision = s.decision_json ? (JSON.parse(s.decision_json) as ProgressDecision) : null;
                return (
                  <li key={s.id} className="flex flex-col gap-0.5 py-2">
                    <Link href={`/session/${s.id}`} className="flex justify-between gap-2 hover:underline">
                      <span>
                        {TYPE_ICON[s.type]} {TYPE_LABEL[s.type]} · week {s.week_index}
                      </span>
                      <span className="text-muted-foreground">
                        {s.date} · {STATUS_LABEL[s.status === "planned" ? "missed" : s.status]}
                      </span>
                    </Link>
                    {decision && <span className="text-muted-foreground">{decision.reason}</span>}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {blocks.length > 1 && (
        <Card size="sm">
          <CardHeader>
            <CardTitle>Blocks</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm">
              {blocks.map((b) => (
                <li key={b.id}>
                  {b.start_date} → {b.pr_date} · {b.status} · max {b.baseline_max} → {b.current_max}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
