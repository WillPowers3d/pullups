"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/components/train/api-client";
import { STATUS_LABEL, TYPE_ICON, TYPE_LABEL } from "@/components/train/session-meta";
import type { SessionStatus, SessionType } from "@/lib/train/engine/types";
import { cn } from "cn";

export type GridSession = {
  id: string;
  date: string;
  type: SessionType;
  status: SessionStatus;
  weekIndex: number;
  setCount: number;
  taper: boolean;
};

export type GridWeek = { weekIndex: number; days: string[] };

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function ScheduleGrid({
  weeks,
  sessions,
  prDate,
  today,
}: {
  weeks: GridWeek[];
  sessions: GridSession[];
  prDate: string;
  today: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<GridSession | null>(null);
  const [legal, setLegal] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newPr, setNewPr] = useState(prDate);
  const byDate = new Map(sessions.map((s) => [s.date, s]));

  async function select(s: GridSession) {
    setSelected(s);
    setLegal(null);
    setError(null);
    try {
      const res = await apiFetch<{ legalDates: string[] }>(`/sessions/${s.id}`);
      setLegal(res.legalDates);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load move options");
    }
  }

  async function move(date: string) {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/sessions/${selected.id}`, { method: "PATCH", body: JSON.stringify({ date }) });
      setSelected(null);
      setLegal(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Move rejected");
    } finally {
      setBusy(false);
    }
  }

  async function changePr(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/blocks/current`, { method: "PATCH", body: JSON.stringify({ prDate: newPr }) });
      setSelected(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change the PR date");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-separate border-spacing-1 text-center text-xs">
          <thead>
            <tr>
              <th className="text-left font-medium text-muted-foreground">Week</th>
              {DAY_NAMES.map((d) => (
                <th key={d} className="font-medium text-muted-foreground">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((w) => (
              <tr key={w.days[0]}>
                <td className="text-left font-medium">{w.weekIndex}</td>
                {w.days.map((date) => {
                  const s = byDate.get(date);
                  return (
                    <td key={date} className={cn("rounded-md border p-1", date === today && "border-primary")}>
                      {s ? (
                        <button
                          type="button"
                          onClick={() => select(s)}
                          className={cn(
                            "flex w-full flex-col items-center rounded px-0.5 py-0.5 hover:bg-muted",
                            s.status === "done" && "opacity-60",
                            selected?.id === s.id && "bg-muted",
                          )}
                          title={`${TYPE_LABEL[s.type]} · ${date}`}
                        >
                          <span aria-hidden>{TYPE_ICON[s.type]}</span>
                          <span>{TYPE_LABEL[s.type]}</span>
                          <span className="text-muted-foreground">{date.slice(5)}</span>
                        </button>
                      ) : (
                        <span className="text-muted-foreground">{date.slice(5)}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <Card>
          <CardHeader>
            <CardDescription>
              Week {selected.weekIndex} · {STATUS_LABEL[selected.status]}
              {selected.taper ? " · taper" : ""}
            </CardDescription>
            <CardTitle>
              {TYPE_ICON[selected.type]} {TYPE_LABEL[selected.type]} · {selected.date}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <p>{selected.setCount} sets</p>
            <Link href={`/session/${selected.id}`} className={cn(buttonVariants({ variant: "outline" }), "w-fit")}>
              Open session
            </Link>
            {selected.status === "planned" && selected.type !== "pr_attempt" && (
              <div className="flex flex-col gap-2">
                <p className="font-medium">Move to</p>
                {legal === null ? (
                  <p className="text-muted-foreground">Checking legal days…</p>
                ) : legal.length === 0 ? (
                  <p className="text-muted-foreground">No legal day this week keeps every rule.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {legal.map((d) => (
                      <Button key={d} size="sm" variant="outline" disabled={busy} onClick={() => move(d)}>
                        {d}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {selected.type === "pr_attempt" && <p className="text-muted-foreground">PR day moves only by changing the PR date.</p>}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>PR date</CardTitle>
          <CardDescription>Changing it rebuilds future sessions. Completed sessions stay.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={changePr} className="flex flex-wrap items-center gap-2">
            <Input type="date" value={newPr} min={today} onChange={(e) => setNewPr(e.target.value)} className="w-auto" />
            <Button type="submit" disabled={busy || newPr === prDate}>
              Update PR date
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Not saved</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
