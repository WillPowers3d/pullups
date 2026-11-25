"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/components/train/api-client";
import { TRAIN_CONFIG } from "@/lib/train/config";
import { buildWarmup } from "@/lib/train/engine/prescribe";

/** Baseline (week 0) max test: warm-up, one strict max set, then create the block. */
export function MaxTestForm({ prDate }: { prDate: string | null }) {
  const router = useRouter();
  const [maxReps, setMaxReps] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const warmup = buildWarmup({
    phase: "test",
    variation: "strict",
    targetReps: 5,
    addedKg: 0,
    restSec: TRAIN_CONFIG.REST_SEC.test,
    rirFloor: 0,
  });
  const reps = Number(maxReps);
  const invalid = !Number.isInteger(reps) || reps < 0;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (invalid || !prDate) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/blocks", { method: "POST", body: JSON.stringify({ prDate, maxReps: reps }) });
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create your block");
      setSaving(false);
    }
  }

  if (!prDate) {
    return (
      <Alert>
        <AlertTitle>Set up first</AlertTitle>
        <AlertDescription>
          Pick your equipment, pull days and PR date on{" "}
          <Link href="/start" className="underline">the start page</Link>.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>1. Warm up</CardTitle>
          <CardDescription>Same four steps every session.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal pl-5 text-sm">
            {warmup.map((s) => (
              <li key={s.id}>
                {s.label}
                {s.seconds ? ` · ${s.seconds} s` : ""}
                {s.reps ? ` · ${s.reps} reps` : ""}
                {s.sets ? ` × ${s.sets}` : ""}
                {s.rampReps ? ` · ${s.rampReps.join(", ")} easy reps` : ""}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>2. One strict max set</CardTitle>
          <CardDescription>
            Dead hang to chin over bar, no kipping. Stop when reps turn into half reps.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Label htmlFor="maxReps">Strict reps</Label>
          <Input
            id="maxReps"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={maxReps}
            onChange={(e) => setMaxReps(e.target.value)}
            aria-invalid={invalid}
          />
          {reps <= TRAIN_CONFIG.BEGINNER_MAX_INCLUSIVE && !invalid && (
            <p className="text-sm text-muted-foreground">
              {reps === 0
                ? "Zero is a fine start: your plan begins with negatives and Australian rows."
                : "Your plan starts on the beginner path (negatives and assisted rows)."}
            </p>
          )}
        </CardContent>
      </Card>
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Could not create your block</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" disabled={invalid || saving}>
        {saving ? "Building your plan…" : `Build my plan to ${prDate}`}
      </Button>
    </form>
  );
}
