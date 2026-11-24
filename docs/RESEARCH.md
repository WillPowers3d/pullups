# Research: the 12 training principles

Research notes behind the guided-workout engine in this repo (`WillPowers3d/pullups`, public URL `/app`).
The 12 principles come from Part Two, "Training Principles", of the book *Pull Yourself Up*
(the author's "Pull-Up Method", which uses band-assisted, Australian, chest-to-bar and weighted
pull-up variations). William shared them as screenshots.

This app is a **companion** to [Pullups With Friends](https://github.com/WillPowers3d/pullups-with-friends).
It does not share that app's database or scoring code.

## Read this first: what's known about the book

- I searched the web, Google Books and Open Library (Nov 23, 2026) and couldn't find a public
  listing, preview or summary of this book that gives its numbers. Searches only turned up
  unrelated titles, such as *Pull Yourself Up by Your Bootstraps* and Brett Stewart's
  *7 Weeks to 50 Pull-Ups*.
- So **none of the book's exact numbers are known here**: sets, reps, rest seconds, max-test
  dates or taper percentages.
- Every number below is an **evidence-based default** from the cited sports-science literature
  or position stands. Each one is a named constant in `src/lib/train/config.ts`, so the
  book's real values can replace it later without touching the logic.
- Each principle carries a tag:
  - `BOOK-UNKNOWN`: the book's exact figure is unknown, so the default is evidence-based.
  - `INTERPRETATION`: the principle's name had to be turned into a concrete rule.
- **Open ask for William:** if you have the book, photos of the pages giving the numbers for
  Principles 5, 6, 7, 8, 11 and 12 would let us swap the defaults for the real values.

Evidence caveat: most resistance-training studies use barbells and machines, with load set as a
%1RM. Pull-ups are bodyweight, so we treat **load** as a ladder of variations: band-assisted,
Australian, strict, chest-to-bar, weighted. Within a variation we use **reps relative to a tested
max (%max-reps)**. This translation is our own `INTERPRETATION`.

---

## 1. High-Volume Workouts

**What it means.** Each pull-up session is built around a lot of total pull-up work across many
sets, rather than one or two all-out sets.

**Evidence.**
- Schoenfeld, Ogborn & Krieger (2017), meta-analysis of 15 studies and 34 groups:
  - There is a graded dose-response between weekly sets and hypertrophy.
  - Each extra weekly set added about 0.37% gain.
  - The <5, 5–9 and 10+ sets/week bands averaged 5.4%, 6.6% and 9.8% gains.
  - Source: https://pubmed.ncbi.nlm.nih.gov/27433992/
- Williams et al. (2017): larger strength gains came with longer, higher-frequency programs.
  https://pubmed.ncbi.nlm.nih.gov/28497285/

**Engine rules (defaults, `BOOK-UNKNOWN`).**
- `WEEKLY_PULL_SETS_TARGET`: 10–20 hard pulling sets/week, split across 2 sessions. That's
  about 5–10 working sets per session, warm-up sets excluded.
- Volume is `volumeScore = round1(Σ targetReps × variationFactor)`. Round the **sum**, not each
  term. Factors: negative 0.5, band-heavy 0.4, australian 0.5, band-light 0.6, strict 1.0,
  chest-to-bar 1.15, weighted `1 + addedKg/bodyKg`. Factors are `INTERPRETATION`.
- **Starting dose:** a session volumeScore of about 5× the user's tested max reps, e.g. a max of
  10 gives a score of about 50. That's roughly 8–9 working sets across three phases, which fits
  the 10–20 sets/week band at 2 sessions. The 5× multiplier is our `INTERPRETATION`, tuned so the
  minimum sets per phase fit. Volume then ramps 7.5%/week across the build weeks (see Principle 11).
- **Cap:** no single week may rise more than 10% over the previous non-deload week
  (`WEEKLY_INCREASE_CAP`). The programmed rise is `BUILD_WEEKLY_INCREASE = 0.075`.

## 2. Two Pull-Up Workouts Per Week

**What it means.** Pull-ups get exactly two dedicated sessions a week.

**Evidence.**
- Schoenfeld et al. (2016): training a muscle twice a week beat once a week.
  https://pubmed.ncbi.nlm.nih.gov/27102172/
- Schoenfeld, Grgic & Krieger (2019), meta-analysis of 25 studies: frequency doesn't matter much
  when volume is equated. Frequency is mainly a tool for spreading volume and managing recovery.
  https://doi.org/10.1080/02640414.2018.1555906

**Engine rules.**
- `PULL_DAYS_PER_WEEK = 2`, a hard rule from the book.
- `MIN_DAYS_BETWEEN_PULL_DAYS = 3` (also stored as `MIN_HOURS_BETWEEN_PULL_DAYS = 72`). This is
  **calendar-day** spacing, not wall-clock math: both circular weekday distances must be ≥ 3.
  That is "at least two full rest days." Mon/Thu and Tue/Fri are the suggested pairs. Sat+Mon
  (`[6,1]`) is illegal. This default is our `INTERPRETATION`.
- **Missed session:** it can slide by up to 2 days, as long as the 3-day rule still holds
  (`legalMoveDays`). If it can't slide, it's marked `missed` and the next session repeats its
  prescription. Never stack two pull sessions on back-to-back days.

## 3. Focused Cross-Training

**What it means.** Non-pull-up days do targeted supporting work instead of random extra
training: core, pushing, scapular and grip work, and legs or cardio that doesn't cut into
recovery.

**Evidence.**
- Wilson et al. (2012), concurrent-training meta-analysis:
  - Running impaired strength and hypertrophy more than cycling.
  - Interference grew with endurance frequency and duration.
  - Source: https://pubmed.ncbi.nlm.nih.gov/22002517/
- StrengthLog recommends supporting pulling and grip work: rows, curls, dead hangs and scapular
  retractions. https://www.strengthlog.com/pull-up/

**Engine rules.**
- `CROSS_DAYS_DEFAULT = 2`, adjustable from **2 to 3** (`CROSS_DAYS_MIN` was raised from 1).
  Cross-training goes on non-pull days.
- Preferred cross days are **not** the calendar day before a pull day. If there aren't enough
  such days, fall back to those slots (see `placeCrossDays` tie-break in DESIGN.md).
- **William's rest cap (not a book number, `INTERPRETATION` of his instruction "no more
  than 3 rest days"):**
  - `maxRestDaysPerWeek = MAX_REST_DAYS_PER_WEEK = 3` → at least 4 training days per week
    (2 pull + ≥2 cross).
  - `maxConsecutiveRestDays = MAX_CONSECUTIVE_REST_DAYS = 3` → no 4-day rest run, including
    across week boundaries and through the taper.
  - Worked: Mon/Thu pulls with Tue/Fri cross → rest Wed, Sat, Sun (3 rest days; Sat–Sun
    wrap is 2 consecutive). A 1-cross-day week would have 4 rest days and is illegal.
- This app owns its catalog (`TRAIN_CONFIG.CROSS_EXERCISES`): push-up, ring-dip (needs rings),
  plank, face-pull, hollow-body, air-squat, reverse-lunge, wall-sit. Optional outbound "Record
  for points" links go to Pullups With Friends; they are not required.
- **Cardio guidance (copy only, not scheduled):** prefer cycling or walking, cap at 30 min,
  avoid long runs the day before a pull day.

## 4. Thorough Warm-Up

**What it means.** Every pull session opens with a structured warm-up before any working set.

**Evidence.**
- Fradkin et al. (2010), meta-analysis: warm-up improved performance in 79% of the criteria
  studied, with little evidence of harm. https://pubmed.ncbi.nlm.nih.gov/19996770/
- Ribeiro et al. (2014) found no extra benefit from general or specific warm-ups for sets to
  failure at 80% 1RM. So the benefit is mainly readiness and injury caution, not more reps.
  https://pubmed.ncbi.nlm.nih.gov/25153744/

**Engine rules (defaults, `BOOK-UNKNOWN`).** A 4-step warm-up of about 8–10 min:
1. **General:** 3 min of easy cardio (`WARMUP_GENERAL_SEC = 180`).
2. **Mobility:** arm circles and band pull-aparts, 10 each (`WARMUP_MOBILITY_REPS`).
3. **Activation:** 2×5 scapular pulls and a 20 s dead hang.
4. **Ramp-up sets:** 2 sets of the session's first variation at 30% and 50% of the target
   reps (`WARMUP_RAMP_PCTS`), minimum 1, with 60 s rest. If the first working set is weighted,
   ramp on the next easier variation.

- The UI won't unlock Phase 1 until every warm-up step is checked off or explicitly skipped.
- Skips are logged so streak and "thorough warm-up" badges can use them.

## 5. Heavy to Light / Low-Rep to High-Rep

**What it means.** Within a workout, the hardest variations and lowest rep counts come first,
while you're freshest. Then you move to easier variations at higher reps.

**Evidence.**
- The 2003 DeLorme-vs-Oxford randomized trial (9 weeks): descending (Oxford) and ascending (DeLorme) loading gave statistically
  equivalent strength gains. https://pubmed.ncbi.nlm.nih.gov/14627926/
- The case for heavy-first is practical: you do your most demanding sets before fatigue sets in.

**Engine rules.**
- Sets are ordered by phase (P1 → P2 → P3), then `difficultyRank` descending, then `targetReps`
  ascending. Stable sort. `LADDER_ORDER` breaks rank ties for `stepUp` / `stepDown`.
- `orderSets()` is unit-tested.

## 6. Strictly Timed Rest

**What it means.** Rest between sets is a fixed, prescribed time on a countdown, not "whenever
you feel ready."

**Evidence.**
- de Salles et al. (2009), review: 3–5 min rest lets you complete more reps and gain more
  strength with heavy loads. https://pubmed.ncbi.nlm.nih.gov/19691365/
- Grgic et al. (2017): more than 2 min maximizes strength in trained people, and 60–120 s is
  enough for untrained people. https://pubmed.ncbi.nlm.nih.gov/28933024/
- Self-selected rest gives similar performance:
  - De Salles 2016: https://pubmed.ncbi.nlm.nih.gov/27050709/
  - Ibbott 2019: https://journals.humankinetics.com/view/journals/ijspp/14/7/article-p980.xml
  - So the main value of fixed rest is **consistency and comparability** from session to session,
    which a progression engine relies on.

**Engine rules (defaults, `BOOK-UNKNOWN`).** Rest depends on the phase (`REST_SEC`):

| Phase | Rest | Rule name |
| --- | --- | --- |
| Phase 1 heavy | 180 s | `REST_SEC.p1`, within the 3–5 min band |
| Phase 2 | 120 s | `REST_SEC.p2` |
| Phase 3 high-rep | 60 s | `REST_SEC.p3` |
| Warm-up ramp | 60 s | `REST_SEC.warmup` |
| Max test | 300 s | `REST_SEC.test` |

- The countdown can't be shortened.
- You can extend it by +30 s up to 2 times per session. Each extension is logged, and more than 2
  flags the session as "rest overrun."
- An audible and vibration cue fires at 10 s and at 0.

## 7. Three Phases to Each Workout

**What it means.** After the warm-up, every pull workout has three distinct parts.

**Evidence.** I found no public source describing the book's three phases, so this is
`INTERPRETATION` plus `BOOK-UNKNOWN`. The design follows directly from Principles 5, 6 and 10:
a heavy, low-rep block first, then moderate volume, then a light, high-rep finish. That mirrors
the "heavy plus higher-rep" combination StrengthLog describes (https://www.strengthlog.com/pull-up/).
Williams et al. (2017) found undulating, varied loading beats non-periodized training.

**Engine rules (defaults).**

| Phase | Name | Variation | Sets × reps | Rest | Pacing |
| --- | --- | --- | --- | --- | --- |
| 1 | Strength | Weighted if max ≥ 8 and a belt/vest is available; else chest-to-bar if max ≥ 5; else strict | 3–5 × 2–5 (`round(max × 0.5)` initially) | 180 s | Full-force |
| 2 | Volume | Strict pull-ups | 3–5 × `round(max × 0.6)` initially, cap `round(max × 0.7)` | 120 s | |
| 3 | Endurance | Band-light, or Australian if no bands | 2–3 × 8–15, RIR ≥ 1 | 60 s | |

- **Beginners** (`maxReps ≤ 2`): Phase 1 negatives, Phase 2 band-heavy or Australian, Phase 3 Australian.
- Set *counts* are chosen to hit the week's volume target (min-set floor wins). The 2-for-2 rule
  never adds a P3 set; extra P3 volume comes only from the weekly ramp.

## 8. Limited Max-Set Testing

**What it means.** All-out max-rep sets are rare and scheduled. They aren't done every workout.

**Evidence.**
- Max pull-up reps are a very reliable test:
  - ICC 0.96–0.99 at a 7-day retest (JASC): https://www.strengthandconditioning.org/jasc-23-4/136-original-scientific-research-study-reliability-of-pull-up-and-dip-maximal-strength-tests
  - Modified pull-ups had a minimal detectable change of about 2 reps: https://pubmed.ncbi.nlm.nih.gov/21088548/
  - So frequent testing adds little information.
- Vieira et al. (2021): training to failure isn't needed for strength.
  https://pmc.ncbi.nlm.nih.gov/articles/PMC9068575/
- Pareja-Blanco et al.: stopping sets short (20% velocity loss) gave similar strength gains with
  less fatigue than going much closer to failure. https://pubmed.ncbi.nlm.nih.gov/32049887/

**Engine rules (defaults, `BOOK-UNKNOWN`).**
- Max tests happen at **week 0** (onboarding baseline, not produced by `generatePlan`), **week 6
  slot 1** (replaces that week's second pull day), and on **PR day** at the end of week 12
  (`pr_attempt`, extra session).
- All other sets cap at RIR ≥ 1 (`DEFAULT_RIR_FLOOR` / `P3_RIR_FLOOR`). RIR uses the Zourdos et al.
  (2016) scale: https://pubmed.ncbi.nlm.nih.gov/26049792/
- **Test protocol:** a full warm-up, then one strict max set (`targetReps = 0`), 300 s rest, and an
  optional chest-to-bar or weighted single.
- Optional outbound video link. A re-test result changes targets only when `|Δ| ≥ MDC_REPS = 2`.

## 9. Progressive Loading

**What it means.** The workload keeps rising from session to session and week to week.

**Evidence.**
- ACSM position stand (2009): raise the load 2–10% once you can do 1–2 reps over target on two
  consecutive sessions. https://pubmed.ncbi.nlm.nih.gov/19204579/
- Plotkin et al. (2022): adding reps and adding load gave similar adaptations.
  https://peerj.com/articles/14142/

**Engine rules.** Double progression, applied per variation on the **track**.
- **Progress:** if every prescribed set hit target reps with RIR ≥ 1 in 2 consecutive sessions
  (the ACSM "2-for-2" rule), apply the next step in this order:
  1. +1 rep per set, until the top of the phase's rep range.
  2. Then move the variation up a rung, resetting to the bottom of the rep range:
     negative → band-heavy → australian → band-light → strict → chest-to-bar → weighted +2.5 kg.
  - Added weight goes up 2.5 kg at a time (`WEIGHT_STEP_KG`).
- **Hold:** if fewer than all sets hit target, keep the same prescription. First session of a
  slot (`prev === null`) always holds.
- **Regress:** if 2 consecutive sessions miss target by 2 or more reps in at least half the sets,
  drop one step.
- Weekly volume caps from Principle 1 still apply. Set counts are **not** progressed here.

## 10. Full-Force Reps

**What it means.** Every working rep is pulled as fast and hard as possible on the way up, with
controlled form and no lazy reps.

**Evidence.**
- González-Badillo et al. (2014): maximal-intended-velocity training gave an 18.2% 1RM gain,
  against 9.7% for deliberately half-speed training. https://pubmed.ncbi.nlm.nih.gov/24734902/
- Behm & Sale (1993): it's the intent, not the actual speed, that drives the adaptation.
  Narrative review: https://cdnsciencepub.com/doi/full/10.1139/apnm-2024-0136

**Engine rules.**
- **Cue screens:** `FULL_FORCE_CUES` (6 strings) in config.
- **Stop rule:** when a rep slows sharply or turns into a half rep, end the set.
- When a companion video is used, `verifiedFullReps` below target makes the set a miss for
  progression.
- The user logs a 1–5 "rep quality" self-rating per set (display / badges, not the 2-for-2 math).

## 11. Twelve-Week Training Plan

**What it means.** Training runs in a 12-week block aimed at a PR date.

**Evidence.**
- Williams et al. (2017): periodized programs beat non-periodized ones for maximal strength,
  with ES 0.43. https://pubmed.ncbi.nlm.nih.gov/28497285/
- Twelve weeks is within the range of the studies pooled.

**Engine rules (defaults, `BOOK-UNKNOWN` for the exact week-by-week layout).**

| Week | Content |
| --- | --- |
| 0 | Onboarding baseline max test (outside `generatePlan`) |
| 1–5 | Build: volume +7.5% per week |
| 6 | Second pull slot is the mid-block max test, then re-target |
| 7–9 | Build 2 |
| 10 | Peak volume week |
| 11–12 | Taper (Principle 12) |
| PR day | Extra `pr_attempt` on `prDate` |

- **Plan generation:** the PR date sets week 12. Week 1 starts on the Monday that makes the PR
  attempt fall in week 12.
- The PR date should be at least 12 weeks out. If it's sooner, the engine **compresses**: keep
  weeks by priority `[12, 11, 6, 10, 9, 8, 7, 5, 4, 3, 2, 1]`, and **renormalize** multipliers so
  the first remaining build week is 1.0 (otherwise a late joiner would start at week-6 volume).
  Always show a compressed-plan warning.

## 12. Two-Week Taper Before Your PR Attempt

**What it means.** For the last two weeks, volume comes down so fatigue clears and strength shows
on PR day.

**Evidence.**
- Bosquet et al. (2007), meta-analysis: the best results came from a 2-week taper with volume
  cut 41–60%, keeping intensity and frequency the same.
  https://pubmed.ncbi.nlm.nih.gov/17762369/
- Pritchard et al. (2015), strength-sport review: cut volume about 30–70%, keep or slightly raise
  intensity, taper for 1–4 weeks, and stop training 2–4 days before the event.
  https://journals.lww.com/nsca-scj/fulltext/2015/04000/effects_and_mechanisms_of_tapering_in_maximizing.3.aspx
- Elite raw powerlifters' tapering practices (JSCR 2016):
  https://journals.lww.com/nsca-jscr/fulltext/2016/07000/tapering_practices_of_new_zealand_s_elite_raw.2.aspx
- "Less Is More" review of tapering across endurance, strength and power athletes (Sports, 2015):
  https://www.mdpi.com/2075-4663/3/3/209

**Engine rules (defaults, `BOOK-UNKNOWN` for the exact percentages).**

| Week | Volume vs. week 10 peak | Other rules |
| --- | --- | --- |
| 11 | 70% (−30%) | Same variations and same 2 pull days, intensity unchanged |
| 12 | 45% (−55%) | Same 2 pull days. Last weekly-pull ≥ 3 calendar days before PR. P3 sets = 0 |
| PR day | | Full warm-up, then the max test protocol |

- Cross-training **days stay on the calendar** in weeks 11–12 (William's rest cap). Volume
  drops to 2 rounds (`CROSS_ROUNDS_TAPER`) — low intensity, not rest. Constants:
  `TAPER_WEEKS = 2`, `TAPER_VOLUME = [0.7, 0.45]`.
