export type Principle = {
  n: number;
  name: string;
  summary: string;
  why: string;
};

export const PRINCIPLES: Principle[] = [
  {
    n: 1,
    name: "High-Volume Workouts",
    summary: "Each pull session is many working sets, not one or two all-out sets.",
    why: "Weekly set volume has a graded dose-response for hypertrophy (Schoenfeld, Ogborn & Krieger 2017). Starting dose is about 5× your tested max, then +7.5%/week.",
  },
  {
    n: 2,
    name: "Two Pull-Up Workouts Per Week",
    summary: "Exactly two dedicated pull days, at least two full rest days apart.",
    why: "Twice-weekly frequency beats once-weekly when volume is split (Schoenfeld 2016). The 3-calendar-day gap is how we encode ~72 hours of recovery.",
  },
  {
    n: 3,
    name: "Focused Cross-Training",
    summary: "Non-pull days do push, core, scapular, grip, and legs — not extra pulling. At least two of these days every week, including the taper.",
    why: "Concurrent running interferes with strength more than cycling (Wilson 2012). William's rest cap (not a book number): at most 3 rest days per week and no 4-day rest run.",
  },
  {
    n: 4,
    name: "Thorough Warm-Up",
    summary: "Four gated steps: general, mobility, activation, ramp. Skip is logged.",
    why: "Warm-up improved performance in 79% of studied criteria (Fradkin 2010). Phase 1 stays locked until every step is done or explicitly skipped.",
  },
  {
    n: 5,
    name: "Heavy to Light, Low-Rep to High-Rep",
    summary: "Hardest variation first, then easier work at higher reps.",
    why: "Practical, not magical: do the demanding sets while you are fresh. orderSets() is the rule.",
  },
  {
    n: 6,
    name: "Strictly Timed Rest",
    summary: "Fixed countdown per phase. No skip. At most two +30 s extensions.",
    why: "3–5 min rest supports heavy strength work (de Salles 2009). Fixed rest makes progression comparable session to session.",
  },
  {
    n: 7,
    name: "Three Phases to Each Workout",
    summary: "Strength, then volume, then endurance — after the warm-up.",
    why: "The book's phase names are interpretation. The shape follows principles 5, 6, and 10: heavy low-rep, moderate, then high-rep with RIR ≥ 1.",
  },
  {
    n: 8,
    name: "Limited Max-Set Testing",
    summary: "Max tests only at baseline, week 6, and PR day.",
    why: "Pull-up max reps are highly reliable (ICC 0.96–0.99). A 2-rep change is the smallest we treat as real (MDC).",
  },
  {
    n: 9,
    name: "Progressive Loading",
    summary: "2-for-2: hit every set twice in a row, then add a rep or step up the ladder.",
    why: "ACSM 2009 double-progression. Set counts still come from the week's volume target, not from this rule.",
  },
  {
    n: 10,
    name: "Full-Force Reps",
    summary: "Every working rep is pulled as hard as you can. Half reps don't count.",
    why: "Intended velocity, not actual bar speed, drives the adaptation (González-Badillo 2014; Behm & Sale 1993).",
  },
  {
    n: 11,
    name: "Twelve-Week Training Plan",
    summary: "A block aimed at a PR date. Weeks 1–10 build; week 6 re-tests.",
    why: "Periodized programs beat non-periodized ones for maximal strength (Williams 2017). The book's exact week table is unknown; the layout is a cited default.",
  },
  {
    n: 12,
    name: "Two-Week Taper Before Your PR Attempt",
    summary: "Weeks 11–12 cut volume to 70% then 45% of peak. Intensity stays high.",
    why: "A 2-week taper cutting volume ~41–60% is the best-supported recipe (Bosquet 2007).",
  },
];
