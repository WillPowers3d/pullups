"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch, WEEKDAYS } from "@/components/train/api-client";
import { TRAIN_CONFIG } from "@/lib/train/config";
import { addDays, diffDays, nextMondayAfter } from "@/lib/dates";
import { availableLadder } from "@/lib/train/engine/ladder";
import { validatePullDays } from "@/lib/train/engine/schedule";
import type { Bands } from "@/lib/train/engine/types";

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const FULL_BLOCK_DAYS = TRAIN_CONFIG.BLOCK_WEEKS * 7;

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Default PR date: the Sunday that ends a full block starting next Monday. */
function defaultPrDate(today: string): string {
  return addDays(nextMondayAfter(today), FULL_BLOCK_DAYS - 1);
}

export function SetupForm() {
  const router = useRouter();
  const [today] = useState(todayUtc);
  const [hasBar, setHasBar] = useState(true);
  const [bands, setBands] = useState<Bands>("none");
  const [hasWeight, setHasWeight] = useState(false);
  const [hasRings, setHasRings] = useState(false);
  const [bodyKg, setBodyKg] = useState("");
  const [dayA, setDayA] = useState<number>(TRAIN_CONFIG.DEFAULT_PULL_DAYS[0]);
  const [dayB, setDayB] = useState<number>(TRAIN_CONFIG.DEFAULT_PULL_DAYS[1]);
  const [crossDays, setCrossDays] = useState<number>(TRAIN_CONFIG.CROSS_DAYS_DEFAULT);
  const [prDate, setPrDate] = useState(() => defaultPrDate(todayUtc()));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const ladder = useMemo(
    () => availableLadder({ hasBar, bands, hasWeight, hasRings }),
    [hasBar, bands, hasWeight, hasRings],
  );
  const pullCheck = validatePullDays([dayA, dayB]);
  const daysOut = /^\d{4}-\d{2}-\d{2}$/.test(prDate) ? diffDays(today, prDate) : NaN;
  const prInvalid = !Number.isFinite(daysOut) || daysOut <= 0;
  const compressed = !prInvalid && daysOut < FULL_BLOCK_DAYS;
  const kg = bodyKg.trim() === "" ? null : Number(bodyKg);
  const kgInvalid = kg !== null && (!Number.isFinite(kg) || kg <= 0);
  const canSubmit = ladder.length > 0 && pullCheck.ok && !prInvalid && !kgInvalid && !saving;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/profile", {
        method: "PUT",
        body: JSON.stringify({
          hasBar,
          bands,
          hasWeight,
          hasRings,
          bodyKg: kg,
          pullDays: [dayA, dayB],
          crossDaysPerWeek: crossDays,
        }),
      });
      router.push(`/test?prDate=${encodeURIComponent(prDate)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your setup");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Equipment</CardTitle>
          <CardDescription>Your ladder of pull-up variations comes from this.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Label>
            <input type="checkbox" checked={hasBar} onChange={(e) => setHasBar(e.target.checked)} />
            Pull-up bar
          </Label>
          <Label>
            <input type="checkbox" checked={hasWeight} onChange={(e) => setHasWeight(e.target.checked)} />
            Weight belt or vest
          </Label>
          <Label>
            <input type="checkbox" checked={hasRings} onChange={(e) => setHasRings(e.target.checked)} />
            Rings (adds ring dips on cross days)
          </Label>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bands">Assistance bands</Label>
            <select id="bands" className={selectClass} value={bands} onChange={(e) => setBands(e.target.value as Bands)}>
              <option value="none">None</option>
              <option value="light">Light</option>
              <option value="heavy">Heavy</option>
              <option value="both">Light and heavy</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bodyKg">Bodyweight (kg, optional)</Label>
            <Input
              id="bodyKg"
              type="number"
              inputMode="decimal"
              min={1}
              step="0.1"
              value={bodyKg}
              placeholder={`${TRAIN_CONFIG.DEFAULT_BODY_KG}`}
              onChange={(e) => setBodyKg(e.target.value)}
              aria-invalid={kgInvalid}
            />
          </div>
        </CardContent>
      </Card>

      {ladder.length === 0 && (
        <Alert variant="destructive">
          <AlertTitle>You need a bar</AlertTitle>
          <AlertDescription>Every session uses a pull-up bar. Tick “Pull-up bar” to continue.</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Week layout</CardTitle>
          <CardDescription>Two pull days at least 72 hours apart, plus 1–3 cross-training days.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dayA">Pull day 1</Label>
            <select id="dayA" className={selectClass} value={dayA} onChange={(e) => setDayA(Number(e.target.value))}>
              {WEEKDAYS.map((d, i) => (
                <option key={d} value={i}>{d}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dayB">Pull day 2</Label>
            <select id="dayB" className={selectClass} value={dayB} onChange={(e) => setDayB(Number(e.target.value))}>
              {WEEKDAYS.map((d, i) => (
                <option key={d} value={i}>{d}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cross">Cross days per week</Label>
            <select id="cross" className={selectClass} value={crossDays} onChange={(e) => setCrossDays(Number(e.target.value))}>
              {Array.from(
                { length: TRAIN_CONFIG.CROSS_DAYS_MAX - TRAIN_CONFIG.CROSS_DAYS_MIN + 1 },
                (_, i) => TRAIN_CONFIG.CROSS_DAYS_MIN + i,
              ).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          {!pullCheck.ok && (
            <p className="text-sm text-destructive sm:col-span-3" role="alert">{pullCheck.error}</p>
          )}
          <p className="text-xs text-muted-foreground sm:col-span-3">
            Extra cross days are added only when needed to avoid more than{" "}
            {TRAIN_CONFIG.MAX_CONSECUTIVE_REST_DAYS} rest days in a row.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>PR date</CardTitle>
          <CardDescription>The day you go for a new max. A full block is {TRAIN_CONFIG.BLOCK_WEEKS} weeks.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Input type="date" value={prDate} min={addDays(today, 1)} onChange={(e) => setPrDate(e.target.value)} aria-invalid={prInvalid} />
          {prInvalid && <p className="text-sm text-destructive">Pick a date after today.</p>}
          {compressed && (
            <Alert>
              <AlertTitle>Compressed plan</AlertTitle>
              <AlertDescription>
                That is under {TRAIN_CONFIG.BLOCK_WEEKS} weeks away, so some build weeks are dropped. The taper
                and the mid-block test are kept.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Could not save</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={!canSubmit}>
          {saving ? "Saving…" : "Next: baseline max test"}
        </Button>
        <Link href="/principles" className="text-sm underline underline-offset-4">
          Why these rules?
        </Link>
      </div>
    </form>
  );
}
