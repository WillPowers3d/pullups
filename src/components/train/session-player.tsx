"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/components/train/api-client";
import { companionRecordUrl } from "@/lib/companion";
import { TRAIN_CONFIG } from "@/lib/train/config";
import { volumeScore } from "@/lib/train/engine/prescribe";
import { setHit } from "@/lib/train/engine/progress";
import { createMachine, reducer } from "@/lib/train/engine/session-machine";
import type {
  LoggedSet,
  MachineEvent,
  MachineState,
  PrescribedSet,
  ProgressDecision,
  SessionPlan,
  SessionStatus,
  SessionType,
} from "@/lib/train/engine/types";
import { INITIAL_MACHINE_STATE } from "@/lib/train/engine/types";
import { cn } from "cn";

type SessionDto = {
  id: string;
  type: SessionType;
  status: SessionStatus;
  date: string;
  weekIndex: number;
  plan: SessionPlan;
  decision: ProgressDecision | null;
};

type SetDto = {
  id: string;
  idx: number;
  actualReps: number | null;
  rir: number | null;
  quality: number | null;
  verifiedFullReps: number | null;
};

type Loaded = { session: SessionDto; sets: SetDto[] };

/** Pull variations that can be graded by video in the companion app. */
const VIDEO_VARIATIONS = new Set(["strict", "chest-to-bar", "weighted", "negative"]);
const BEEP_AT_SEC = [10, 0];
const RIR_CHOICES = [0, 1, 2, 3, 4];
const QUALITY_CHOICES = [1, 2, 3, 4, 5];
const CUE_ROTATE_MS = 5000;
const TICK_MS = 250;

type Action = { type: "LOAD"; state: MachineState } | MachineEvent;

function playerReducer(state: MachineState, action: Action): MachineState {
  if (action.type === "LOAD") return action.state;
  return reducer(state, action);
}

function phaseLabel(set: PrescribedSet): string {
  switch (set.phase) {
    case "p1":
      return "Phase 1 · strength";
    case "p2":
      return "Phase 2 · volume";
    case "p3":
      return "Phase 3 · finisher";
    case "test":
      return "Max test";
    default:
      return "Warm-up";
  }
}

function beep() {
  try {
    const AudioCtx = window.AudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    osc.frequency.value = 880;
    osc.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
    osc.onended = () => void ctx.close();
  } catch {
    // Audio is best-effort.
  }
  navigator.vibrate?.(200);
}

function toLogged(set: PrescribedSet, row: SetDto): LoggedSet {
  return {
    ...set,
    actualReps: row.actualReps ?? 0,
    rir: row.rir ?? 0,
    quality: row.quality ?? 0,
    verifiedFullReps: row.verifiedFullReps,
  };
}

/** Rebuild machine state for a session that was already in progress. */
function resumeState(plan: SessionPlan, rows: SetDto[]): MachineState {
  const base = createMachine(plan);
  const logged = rows.filter((r) => r.actualReps !== null).sort((a, b) => a.idx - b.idx);
  if (logged.length === 0) return base;
  const logs = logged.map((r) => toLogged(plan.sets[r.idx]!, r));
  const done = logged.length >= plan.sets.length;
  return {
    ...base,
    stage: done ? "summary" : "set",
    warmupIdx: plan.warmup.length,
    setIdx: Math.min(logged.length, plan.sets.length - 1),
    logs,
  };
}

export function SessionPlayer({ id }: { id: string }) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [state, dispatch] = useReducer(playerReducer, INITIAL_MACHINE_STATE);
  const [now, setNow] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [result, setResult] = useState<{ decision: ProgressDecision; badges: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load (and start if planned).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let data = await apiFetch<Loaded>(`/sessions/${id}`);
        if (data.session.status === "planned" || (data.session.status === "in_progress" && data.sets.length === 0)) {
          const started = await apiFetch<Loaded>(`/sessions/${id}/start`, { method: "POST" });
          data = started;
        }
        if (cancelled) return;
        setLoaded(data);
        if (data.session.status === "done") return;
        const resumed = resumeState(data.session.plan, data.sets);
        dispatch({ type: "LOAD", state: resumed });
        if (resumed.stage === "idle") dispatch({ type: "START", nowMs: Date.now() });
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Could not load session");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Rest clock: computed from restEndsAt so a background tab doesn't reset it.
  const lastBeep = useRef<number | null>(null);
  useEffect(() => {
    if (state.stage !== "rest") return;
    const timer = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      dispatch({ type: "REST_TICK", nowMs: t });
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [state.stage]);

  const remainingSec =
    state.stage === "rest" && state.restEndsAt !== null
      ? Math.max(0, Math.ceil((state.restEndsAt - (now || state.nowMs)) / 1000))
      : 0;

  useEffect(() => {
    if (state.stage !== "rest") {
      lastBeep.current = null;
      return;
    }
    if (BEEP_AT_SEC.includes(remainingSec) && lastBeep.current !== remainingSec) {
      lastBeep.current = remainingSec;
      beep();
    }
  }, [remainingSec, state.stage]);

  // Screen wake lock while the session is live.
  useEffect(() => {
    if (state.stage === "idle" || state.stage === "summary") return;
    let lock: WakeLockSentinel | null = null;
    navigator.wakeLock
      ?.request("screen")
      .then((l) => {
        lock = l;
      })
      .catch(() => undefined);
    return () => {
      void lock?.release();
    };
  }, [state.stage]);

  // When a rest ends and the next set appears, remember when.
  const setStartedAt = useRef<number | null>(null);
  const prevDoneAt = useRef<number | null>(null);
  useEffect(() => {
    if (state.stage === "set") setStartedAt.current = state.nowMs || Date.now();
  }, [state.stage, state.setIdx, state.nowMs]);

  const logSet = useCallback(
    async (values: { actualReps: number; rir: number; quality: number; verifiedFullReps: number | null }) => {
      if (!loaded) return;
      const prescribed = state.sets[state.setIdx];
      const row = loaded.sets.find((r) => r.idx === state.setIdx);
      if (!prescribed || !row) return;
      const restTakenSec =
        prevDoneAt.current !== null && setStartedAt.current !== null
          ? Math.max(0, Math.round((setStartedAt.current - prevDoneAt.current) / 1000))
          : 0;
      setError(null);
      try {
        await apiFetch(`/sets`, {
          method: "POST",
          body: JSON.stringify({ setId: row.id, ...values, restTakenSec }),
        });
        const t = Date.now();
        prevDoneAt.current = t;
        dispatch({ type: "SET_DONE", log: { ...prescribed, ...values }, nowMs: t });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save that set");
      }
    },
    [loaded, state.sets, state.setIdx],
  );

  async function finish() {
    setFinishing(true);
    setError(null);
    try {
      const res = await apiFetch<{ decision: ProgressDecision; badges: string[] }>(`/sessions/${id}/complete`, {
        method: "POST",
        body: JSON.stringify({ restExtensions: state.extensionsUsed, warmupSkipped: state.skipped }),
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not finish the session");
    } finally {
      setFinishing(false);
    }
  }

  if (loadError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Session unavailable</AlertTitle>
        <AlertDescription>
          {loadError}. <Link href="/" className="underline">Back to today</Link>
        </AlertDescription>
      </Alert>
    );
  }
  if (!loaded) return <p className="text-muted-foreground">Loading session…</p>;

  const { session } = loaded;
  const plan = session.plan;
  const title =
    session.type === "pull"
      ? `Pull · Week ${session.weekIndex}`
      : session.type === "cross"
        ? "Cross training"
        : session.type === "max_test"
          ? "Max test"
          : "PR attempt";

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{session.date}</p>
      </header>

      {plan.taper && (
        <Alert>
          <AlertTitle>Taper week</AlertTitle>
          <AlertDescription>Taper week: lower volume is intentional.</AlertDescription>
        </Alert>
      )}

      {session.status === "done" ? (
        <DoneView loaded={loaded} />
      ) : state.stage === "warmup" ? (
        <WarmupView state={state} dispatch={dispatch} />
      ) : state.stage === "set" ? (
        <SetView key={state.setIdx} state={state} sessionId={id} rows={loaded.sets} onLog={logSet} />
      ) : state.stage === "rest" ? (
        <RestView state={state} remainingSec={remainingSec} dispatch={dispatch} />
      ) : state.stage === "summary" ? (
        <SummaryView state={state} plan={plan} result={result} finishing={finishing} onFinish={finish} />
      ) : (
        <p className="text-muted-foreground">Starting…</p>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

function WarmupView({ state, dispatch }: { state: MachineState; dispatch: (a: Action) => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Warm-up</CardTitle>
        <CardDescription>Phase 1 unlocks when every step is done or skipped.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {state.warmup.map((step, i) => {
          const current = i === state.warmupIdx;
          const finished = i < state.warmupIdx;
          const skipped = state.skipped.includes(step.id);
          return (
            <div key={step.id} className={cn("flex items-center justify-between gap-3 rounded-lg border p-2", current && "border-primary")}>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={finished && !skipped}
                  disabled={!current}
                  onChange={() => dispatch({ type: "WARMUP_DONE", stepId: step.id })}
                />
                <span className={cn(skipped && "line-through text-muted-foreground")}>
                  {step.label}
                  {step.seconds ? ` · ${step.seconds} s` : ""}
                  {step.reps ? ` · ${step.reps} reps` : ""}
                  {step.sets ? ` × ${step.sets}` : ""}
                  {step.rampReps ? ` · ${step.rampReps.join(", ")} reps` : ""}
                </span>
              </label>
              {current && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (window.confirm(`Skip “${step.label}”? Skips are logged.`)) {
                      dispatch({ type: "WARMUP_SKIP", stepId: step.id });
                    }
                  }}
                >
                  Skip
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function SetView({
  state,
  sessionId,
  rows,
  onLog,
}: {
  state: MachineState;
  sessionId: string;
  rows: SetDto[];
  onLog: (v: { actualReps: number; rir: number; quality: number; verifiedFullReps: number | null }) => Promise<void>;
}) {
  const set = state.sets[state.setIdx]!;
  const isMax = set.phase === "test" && set.targetReps === 0;
  const [logging, setLogging] = useState(false);
  const [reps, setReps] = useState(set.targetReps);
  const [rir, setRir] = useState(set.rirFloor);
  const [quality, setQuality] = useState(4);
  const [verified, setVerified] = useState("");
  const [saving, setSaving] = useState(false);
  const [cueIdx, setCueIdx] = useState(state.setIdx % TRAIN_CONFIG.FULL_FORCE_CUES.length);
  useEffect(() => {
    const t = window.setInterval(() => setCueIdx((i) => (i + 1) % TRAIN_CONFIG.FULL_FORCE_CUES.length), CUE_ROTATE_MS);
    return () => window.clearInterval(t);
  }, []);
  const row = rows.find((r) => r.idx === state.setIdx);
  const videoUrl =
    row && VIDEO_VARIATIONS.has(set.variation) ? companionRecordUrl({ trainSetId: row.id, sessionId }) : null;

  return (
    <Card>
      <CardHeader>
        <CardDescription>
          Set {state.setIdx + 1} of {state.sets.length} · {phaseLabel(set)}
        </CardDescription>
        <CardTitle className="text-2xl">
          {set.variation}
          {set.addedKg > 0 ? ` +${set.addedKg} kg` : ""}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-4xl font-semibold tabular-nums">{isMax ? "Max reps" : `${set.targetReps} reps`}</p>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {TRAIN_CONFIG.FULL_FORCE_CUES[cueIdx]}
        </p>
        {!logging ? (
          <Button size="lg" onClick={() => setLogging(true)}>
            Done
          </Button>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Label className="w-20">Reps</Label>
              <Button variant="outline" size="icon" onClick={() => setReps((r) => Math.max(0, r - 1))} aria-label="One fewer rep">
                −
              </Button>
              <span className="w-10 text-center text-lg tabular-nums">{reps}</span>
              <Button variant="outline" size="icon" onClick={() => setReps((r) => r + 1)} aria-label="One more rep">
                +
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Label className="w-20">RIR</Label>
              {RIR_CHOICES.map((n) => (
                <Button key={n} size="sm" variant={rir === n ? "default" : "outline"} onClick={() => setRir(n)}>
                  {n}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Label className="w-20">Quality</Label>
              {QUALITY_CHOICES.map((n) => (
                <Button key={n} size="sm" variant={quality === n ? "default" : "outline"} onClick={() => setQuality(n)}>
                  {n}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="verified" className="w-20">Verified</Label>
              <Input
                id="verified"
                type="number"
                min={0}
                placeholder="Full reps by video (optional)"
                value={verified}
                onChange={(e) => setVerified(e.target.value)}
              />
            </div>
            {videoUrl && (
              <a href={videoUrl} className={cn(buttonVariants({ variant: "outline" }))} target="_blank" rel="noreferrer">
                Grade with video
              </a>
            )}
            <Button
              size="lg"
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                const v = verified.trim() === "" ? null : Math.max(0, Math.floor(Number(verified)));
                await onLog({
                  actualReps: reps,
                  rir,
                  quality,
                  verifiedFullReps: v !== null && Number.isFinite(v) ? v : null,
                });
                setSaving(false);
              }}
            >
              {saving ? "Saving…" : "Save set"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RestView({
  state,
  remainingSec,
  dispatch,
}: {
  state: MachineState;
  remainingSec: number;
  dispatch: (a: Action) => void;
}) {
  const next = state.sets[state.setIdx + 1];
  const mm = Math.floor(remainingSec / 60);
  const ss = String(remainingSec % 60).padStart(2, "0");
  const extensionsLeft = TRAIN_CONFIG.REST_EXTENSIONS_MAX - state.extensionsUsed;
  return (
    <Card>
      <CardHeader>
        <CardDescription>Rest — the next set starts automatically</CardDescription>
        <CardTitle className="text-6xl tabular-nums">
          {mm}:{ss}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {next && (
          <p className="text-sm text-muted-foreground">
            Next: {next.variation}
            {next.addedKg > 0 ? ` +${next.addedKg} kg` : ""} · {next.targetReps === 0 ? "max" : `${next.targetReps} reps`}
          </p>
        )}
        <Button variant="outline" disabled={extensionsLeft <= 0} onClick={() => dispatch({ type: "REST_EXTEND" })}>
          +{TRAIN_CONFIG.REST_EXTENSION_SEC} s ({extensionsLeft} left)
        </Button>
      </CardContent>
    </Card>
  );
}

function SummaryView({
  state,
  plan,
  result,
  finishing,
  onFinish,
}: {
  state: MachineState;
  plan: SessionPlan;
  result: { decision: ProgressDecision; badges: string[] } | null;
  finishing: boolean;
  onFinish: () => void;
}) {
  const totalReps = state.logs.reduce((sum, l) => sum + l.actualReps, 0);
  const hits = state.logs.filter(setHit).length;
  const achieved = volumeScore(state.logs.map((l) => ({ ...l, targetReps: l.actualReps })));
  return (
    <Card>
      <CardHeader>
        <CardTitle>Session summary</CardTitle>
        <CardDescription>
          {state.logs.length} of {state.sets.length} sets logged
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <ul className="grid grid-cols-2 gap-2">
          <li>Total reps: <strong>{totalReps}</strong></li>
          <li>Sets on target: <strong>{hits}/{state.logs.length}</strong></li>
          <li>Volume: <strong>{achieved}</strong> (planned {plan.volumeScore})</li>
          <li>Rest extensions: <strong>{state.extensionsUsed}</strong></li>
          <li>Warm-up skips: <strong>{state.skipped.length}</strong></li>
        </ul>
        {result ? (
          <Alert>
            <AlertTitle>Decision: {result.decision.action}</AlertTitle>
            <AlertDescription>
              {result.decision.reason}
              {result.badges.length > 0 && (
                <span className="mt-2 flex flex-wrap gap-1">
                  {result.badges.map((b) => (
                    <Badge key={b}>{b.replaceAll("_", " ")}</Badge>
                  ))}
                </span>
              )}
            </AlertDescription>
          </Alert>
        ) : (
          <Button size="lg" disabled={finishing} onClick={onFinish}>
            {finishing ? "Saving…" : "Finish session"}
          </Button>
        )}
        {result && (
          <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>
            Back to today
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

function DoneView({ loaded }: { loaded: Loaded }) {
  const { session, sets } = loaded;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Completed</CardTitle>
        <CardDescription>{sets.filter((s) => s.actualReps !== null).length} sets logged</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm">
        <ol className="list-decimal pl-5">
          {sets.map((s) => {
            const p = session.plan.sets[s.idx];
            return (
              <li key={s.id}>
                {p?.variation} · {s.actualReps ?? "–"}/{p?.targetReps === 0 ? "max" : p?.targetReps} reps
                {s.rir !== null ? ` · RIR ${s.rir}` : ""}
              </li>
            );
          })}
        </ol>
        {session.decision && (
          <p>
            <strong>Decision:</strong> {session.decision.reason}
          </p>
        )}
        <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>
          Back to today
        </Link>
      </CardContent>
    </Card>
  );
}
