# TEMPORARY — handoff for the next session (work branch only; never commit it on main)

Status on 2026-10-23. Read this file, then AGENTS.md of this repo and of NicolasET/uroboros-testbed, before doing anything.

## Where things stand

- uroboros `main` = **0.23.0** (e806b4a), tagged and released. Published in this series: 0.19.0, 0.20.0, 0.21.0, 0.22.0, 0.22.1, 0.23.0 — each with its testbed result linked in CHANGELOG.md.
- uroboros-testbed `main` holds results through `results/0.23.0+c2ac5ff`, scenario **v6**, verifier eval **v2**, reviewer eval **v1**. `UNKNOWN_FROM` in `harness/review-eval.ts` is `0.24.0`.
- Nothing uncommitted anywhere. This branch (`wip/0.19.0-1l41ee`) = main + this file.

## What is left — the goal of the next session

Two plugin paths shipped but were never exercised by the testbed, because scenario v6 cannot reach them:

1. **"I don't know" to a list question** (0.23.0; `skills/run/SKILL.md`, Question protocol, "An empty answer is asked again"): on a minor-cases, values or open-behaviors list, "I don't know" takes the option that changes nothing, recorded as `D<n>` marked `kept on "I don't know"`, listed in the Loop Report section "Kept on 'I don't know'". Before 0.23.0 it was DEFERRED, and in goal mode that stopped a run.
2. **Standing decisions: dedup, replace and retire** (0.22.0; `references/loop-report.md`, "Standing decisions"; `SKILL.md`, "Standing decisions"): the end-of-run offer leaves out a decision an `S<n>` already states, offers *replace S<n> with …*, lists the `S<n>` the run set aside or contradicted (*Keep them as they are* / *Change or retire some*), and moves retired entries to `## Retired`.

Plan: extend the testbed scenario to **v7** so both paths run, then measure a base and 0.23.0 on it. If 0.23.0 misbehaves, fix the plugin as 0.23.x/0.24.0 by the normal process.

## Proposed scenario v7 (needs the maintainer's approval first — testbed AGENTS.md, invariant 1)

### A. A standing decision the idea contradicts, plus one the run would duplicate

Add `fixture/.uroboros/decisions.md`:

```
# Standing decisions

- S1 Only admins change a listing's status. (from 000-moderation, D2, 2026-09-01)
- S2 Refusals use the API's error style: a JSON body { "error": "<snake_case_code>" } with a 4xx status. (from 000-moderation, D5, 2026-09-01)
```

- **S1** contradicts the idea ("que los vendedores puedan pausar"), so the run must ask the Contradiction question (keep / set aside for this feature / change for the project). That is now how P1 reaches the user.
- **S2** states what truth.md already says about errors; the end-of-run offer must not propose it again (dedup).
- Fixture invariant 2 still holds: S1 does not settle P1, it contradicts the idea.

Add to `scenario/truth.md`, under a new heading **Standing decisions (not scored as ambiguities)**:

- Asked about S1 during the run: set it aside for this feature only (owners and admins may pause and resume; P1 is unchanged).
- Asked at the end whether to keep, change or retire the standing decisions this run set aside: change S1 to "Only admins, and the seller who owns it for pause and resume, change a listing's status."
- Asked whether to add new standing decisions: add none.

### B. A minor-cases list the user cannot answer

Add to truth.md, under **Other facts**:

- Rare combinations — two people pausing and resuming the same listing at the same moment, a pause arriving while an order is being placed: "I don't know." (The oracle already answers "No sé" to anything truth.md does not settle; this line makes the intent explicit and stable.)

Whether the reviewer raises these as a `weight: minor` list is not deterministic. Report it as a rate, never as pass/fail.

### C. Harness changes

- `harness/config.ts`: `SCENARIO_VERSION = 7`, with the doc-comment history line ("v7: a standing-decisions file in the fixture (one contradicted by the idea, one already stated by truth.md), and truth.md settles them and leaves rare combinations unknown").
- `harness/checks.ts` / `report.ts`: new rows per pipeline mode (default, goal; `--auto` writes no decisions):
  - **contradiction asked** — an oracle exchange about S1 (from `oracle-log.jsonl`).
  - **decisions.md at the end** — S1 rewritten in place (or retired to `## Retired` plus a new entry) with the truth's wording, no second copy of S2, no new entry.
  - **"No sé" to a list** — count of list questions answered "No sé", and for each: a `kept on "I don't know"` `D<n>` in `loop-state.md` and the run finished (end to end). 0 lists = "not exercised", not a failure.
- `harness/judge.ts`: P1 can now reach the user through the Contradiction question; make sure the judge classifies that as `asked`.
- Check how `previousModes` (`harness/report.ts`) treats `verify` and `review` across a scenario bump: they are versioned by their own eval versions and should keep comparing against 0.23.0's v6 results. If not, fix it there, not by re-running them.
- Docs: testbed README (scenario section, metrics), AGENTS.md if a rule changes.
- `npm run typecheck`, `npm test` (the hidden tests must still fail 11/11 on the bare fixture and pass on the reference), then one real `--modes compat` run (a change to how a session runs).

### D. Measure

- Base: `npm run testbed -- --uroboros v0.22.1 --modes default,auto,goal,compat` (pre-0.23.0: "I don't know" to a list is DEFERRED).
- Candidate: `npm run testbed -- --uroboros v0.23.0 --modes default,auto,goal,compat`.
- Compare per mode with the series' pass criterion (AGENTS.md; ambiguities, hidden tests, runtime ≥; compat covered; cost ≤ +25%), plus the new rows. Expected: both handle A; on a "No sé" list, 0.22.1 defers (and in goal may stop), 0.23.0 keeps and finishes.
- Commit both results in the testbed (`uroboros <version> measured on scenario v7`), no Claude trailers. Cost estimate, not verified: ~$20–25 per four-mode run, so ~$45–50 total.
- If 0.23.0 fails a new row: fix in uroboros (patch or minor per AGENTS.md "Releasing"), re-measure, publish.

## How to run the testbed (lessons from the cloud session)

- Node 24+, git, Claude Code signed in. In the testbed: `npm ci` in the root **and** `cd fixture && npm ci` — without the fixture's dependencies the reviewer eval's gate turns red (this cost one discarded run).
- Workspace root outside the home dir with no `CLAUDE.md`/`AGENTS.md`/`.claude` above it (`UROBOROS_TESTBED_WORKDIR`; `C:\uro-testbed-work` on Windows by default).
- Long runs: launch detached and re-run only the unfinished modes with `--modes` after any cut; the harness keeps the other modes of the same label. Never publish a result with a cut mode.
- The harness fix of 2026-10-22 (`IDLE_CLOSE_MS`, `harness/session.ts`) ended the "Tool permission request failed: Stream closed" cuts after verification.
- A full six-mode run took ~80–90 min and $30–37 at list price.

## Process reminders (AGENTS.md)

- Talk to the maintainer in Spanish; repo text in English.
- Behavior changes: interview with `AskUserQuestion` (recommended option first), show the plan and draft, get approval, then edit; coherence sweep; `node scripts/check-coherence.js` green.
- Release: bump `.claude-plugin/plugin.json` + dated CHANGELOG section (bold lead per bullet, testbed bullet linking the result); commit on `main` as `<summary> (x.y.z)` with a bullet body and **no** Co-Authored-By/Claude-Session trailers; tag `vX.Y.Z`; `gh release create vX.Y.Z --title "X.Y.Z" --latest` with that CHANGELOG section. In the cloud, tag pushes and release creation were blocked — the maintainer did them.
- Delete this file when the work it describes is done; never put it on main.
