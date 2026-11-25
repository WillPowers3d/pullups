import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { STATUS_LABEL, TYPE_ICON, TYPE_LABEL } from "@/components/train/session-meta";
import { TRAIN_CONFIG } from "@/lib/train/config";
import { addDays, startOfWeekMonday } from "@/lib/dates";
import { getActiveBlock, listBadges, listSessions, trainStats } from "@/lib/train/repo";
import type { SessionPlan } from "@/lib/train/engine/types";
import { cn } from "cn";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default async function DashboardPage() {
  await connection();
  const block = getActiveBlock(TRAIN_CONFIG.DEFAULT_USER_ID);
  if (!block) redirect("/start");

  const today = new Date().toISOString().slice(0, 10);
  const sessions = listSessions(block.id);
  const stats = trainStats(block);
  const badges = listBadges(block.user_id);

  const next =
    sessions.find((s) => s.status === "in_progress") ??
    sessions.find((s) => s.status === "planned" && s.date >= today);
  const anchor = today < block.start_date ? block.start_date : today;
  const monday = startOfWeekMonday(anchor);
  const week = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  // Prefer this week's latest-indexed session: after a PR-date change the
  // plan is regenerated (possibly compressed) while completed sessions keep
  // their original week index.
  const inWeek = sessions.filter((s) => s.date >= monday && s.date <= week[6]!);
  const weekIndex = inWeek.length ? Math.max(...inWeek.map((s) => s.week_index)) : null;
  const taper = weekIndex !== null && weekIndex > TRAIN_CONFIG.BLOCK_WEEKS - TRAIN_CONFIG.TAPER_WEEKS;
  const due = sessions.filter((s) => s.date < today || s.status === "done");
  const doneCount = due.filter((s) => s.status === "done").length;
  const adherence = due.length > 0 ? Math.round((doneCount / due.length) * 100) : null;
  const nextPlan = next ? (JSON.parse(next.plan_json) as SessionPlan) : null;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">
          {today < block.start_date ? `Block starts ${block.start_date}` : `Today · ${today}`}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {weekIndex !== null
            ? `Week ${weekIndex} of ${TRAIN_CONFIG.BLOCK_WEEKS} · ${taper ? "Taper" : "Build"}`
            : "Your block"}
        </h1>
        <p className="text-sm text-muted-foreground">
          PR day {block.pr_date} · max {block.baseline_max}
          {block.current_max !== block.baseline_max ? ` → ${block.current_max}` : ""}
          {block.compressed === 1 ? " · compressed plan" : ""}
        </p>
      </header>

      {taper && (
        <Alert>
          <AlertTitle>Taper: trust the process</AlertTitle>
          <AlertDescription>Volume drops on purpose so you peak on PR day.</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardDescription>Next session</CardDescription>
          <CardTitle>
            {next ? `${TYPE_ICON[next.type]} ${TYPE_LABEL[next.type]} · ${next.date}` : "Block complete"}
          </CardTitle>
        </CardHeader>
        {next && nextPlan && (
          <CardContent className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {nextPlan.sets.length} sets{nextPlan.taper ? " · taper" : ""} · {STATUS_LABEL[next.status]}
            </span>
            <Link href={`/session/${next.id}`} className={cn(buttonVariants())}>
              {next.status === "in_progress" ? "Resume" : "Start"}
            </Link>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardDescription>This week</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="grid grid-cols-7 gap-1 text-center text-xs">
            {week.map((date, i) => {
              const s = sessions.find((x) => x.date === date);
              return (
                <li
                  key={date}
                  className={cn(
                    "flex flex-col gap-1 rounded-lg border p-1.5",
                    date === today && "border-primary",
                    s?.status === "done" && "bg-muted",
                  )}
                >
                  <span className="font-medium">{DAY_NAMES[i]}</span>
                  <span aria-hidden>{s ? TYPE_ICON[s.type] : "·"}</span>
                  <span className="text-muted-foreground">{s ? TYPE_LABEL[s.type] : "Rest"}</span>
                  {s?.status === "done" && <span className="text-muted-foreground">✓</span>}
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardContent className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          {adherence !== null && (
            <span>
              Adherence <strong>{adherence}%</strong>
            </span>
          )}
          <span>
            Sessions done <strong>{stats.sessionsCompleted}</strong>
          </span>
          <span>
            Rest overruns <strong>{stats.restOverrunCount}</strong>
          </span>
        </CardContent>
      </Card>

      {badges.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {badges.map((b) => (
            <Badge key={b.badge_id} variant="secondary">
              {b.badge_id.replaceAll("_", " ")}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
