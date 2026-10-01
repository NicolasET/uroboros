# Goal protocol — the run when `--goal` is active

Goal mode replaces the six-phase SDD pipeline with a **completion condition**: intake produces a small `goal.md` (condition + acceptance criteria) instead of a specify prompt, and the run then works in implement → gate → review rounds until the reviewer returns CLEAN with evidence **and** the real verification gate is green. Spec-kit is not required — never invoke a `speckit-*` skill in this mode. Everything else in the command still applies: the Hard rules, the Model/effort protocol, the question flags (`--auto` / `--only-business` are orthogonal to `--goal`), and the assumption mechanism.

## State layout (replaces FEATURE_DIR)

- `.uroboros/<slug>/goal.md` — the approved goal artifact (see G1).
- `.uroboros/<slug>/loop-state.md` — same role as in the pipeline: ACTIVE FLAGS, DECISION LOG, ASSUMPTION LOG, cached gate commands, per-round records.
- `.uroboros/active-run.json` — the Stop-hook contract (below). One active goal run per repo.

`<slug>` is a short kebab-case name derived from the approved goal (e.g. `pause-listing`).

## Stop-hook contract — how the run survives turn ends

The plugin ships a Stop hook (`hooks/goal-gate.js`) that fires whenever any session in the repo ends a turn. It reads `.uroboros/active-run.json`:

- File absent, unparsable, or `status` ≠ `"active"` → it allows the stop (zero cost in non-goal sessions).
- `session_id` missing or different from the session that is stopping → it allows the stop. Only the session that owns the run is ever kept alive; a marker left behind by a crashed run never traps another session.
- `status: "active"`, the owning session, and `relaunches` < `rounds_max` (or `rounds_max` is `null`) → it **blocks the stop** and relaunches you with a reason pointing at the state files. The hook increments `relaunches` itself.
- `relaunches` ≥ `rounds_max` → it allows the stop. A `null` `rounds_max` never reaches this: the run relaunches until you set a terminal `status`.

Your obligations as orchestrator:

- **Create** the marker in G2: `{"feature": "<slug>", "dir": ".uroboros/<slug>", "session_id": "<this session's id, from the --goal row of the command>", "status": "active", "rounds_used": 0, "relaunches": 0, "rounds_max": <the round cap per step D, or null when step D sets none>}`.
- **Set a terminal `status`** — `"complete"` when the run closes (G5), `"stopped"` when you stop deliberately (round cap exhausted, unrecoverable error, user told you to stop). An `"active"` marker left behind keeps relaunching the session — never end a goal run without updating it.
- When the hook relaunches you mid-run, treat it as a **resume**: re-read `active-run.json` and `loop-state.md`, re-resolve the MODEL GUIDES per the Model/effort protocol, and continue from the recorded point. A fresh `/uroboros:run --goal` with no idea resumes the same way if `active-run.json` shows an active run — first write this session's id into its `session_id` so the hook keeps this session alive from now on. This replaces the Phase −1 check. With no active run but a `.uroboros/intake.md` draft, the run was interrupted during intake: restore it, apply your own model guide, and continue G1 from the recorded frontier.

## G1 — Intake (idea → approved goal.md)

Run Phase 0's intake exactly as written in the command (your own model guide and the standing decisions read first, intake draft in `.uroboros/intake.md`, blind-spot pass, decision tree, frontier rounds, facts looked up rather than asked, invited references, shared-understanding check, run-mode question rules) — but the deliverable is a draft **`goal.md`** instead of a specify prompt. `goal.md` has no clarification phase after it, so a **DEFERRED** decision cannot pass through: before the draft, put each one back to the user with narrower, concrete options, or — if they choose so — move it to **Out of scope**. Nothing deferred remains when `goal.md` is approved.

- **Goal condition** — one measurable end state with a **stated check**, verifiable from command output or observable behavior (e.g. "`npm test` exits 0 and `GET /listings/:id` returns `paused: true` after the pause call"), not from intent.
- **Acceptance criteria** — numbered `AC-1`, `AC-2`, …; each measurable and user-sourced. These are what the reviewer demands evidence for.
- **Constraints** — what must not change on the way there.
- **Out of scope** — explicit.
- **References** — the code/mockups/libraries the user pointed at.

Show the draft in full, verbatim, and get approval via `AskUserQuestion` (Approve / Edit; self-approve + `A<n>` under `--auto`). Then **BLOCKING — settle the reviewer's model/effort per the Model/effort protocol.**

## G2 — Branch + state + marker

- Create a feature branch with plain git (`git checkout -b goal/<slug>`); if git is unavailable, continue branchless. Do not use `speckit-git-feature`.
- Create `.uroboros/<slug>/goal.md` and `loop-state.md` (ACTIVE FLAGS, approved goal, DECISION LOG so far, ASSUMPTION LOG so far — copied from `.uroboros/intake.md` — empty per-round section). Delete `.uroboros/intake.md` once the copy is written.
- Write `.uroboros/active-run.json` per the contract above. From this point the hook keeps this session alive until you set a terminal status.

## G3 — Review the goal artifact

Dispatch the reviewer (the variant of the chosen effort, the chosen model, waited for — hard rule 7) with its `INSTRUCTIONS:` line (step B), `PHASE: goal`, `RUN_MODE`, `STATE_FILE`, `STANDING_DECISIONS` (if the file exists), the path to `goal.md`, the DECISION LOG, and its `MODEL GUIDE:` block if one applies. Every subagent dispatch in goal mode carries its role's `INSTRUCTIONS:` line, `STANDING_DECISIONS` when the file exists, and, when one applies, its `MODEL GUIDE:` block, and every report goes through the Model check before it is used (Model/effort protocol). Relay findings and fold answers per steps C–D of the loop, with the round cap and repeated items of step D (`goal.md` counts as a design phase there). Do not start implementation before CLEAN-with-evidence on `goal.md`.

## G4 — The goal loop (replaces phases 1–6)

**BLOCKING — settle the implementer's model/effort per the Model/effort protocol** (flag or question; under `--auto` it was settled at the start of the run). Then loop; at the start of each round increment `rounds_used` in `active-run.json` and open a `### Round <n>` record in `loop-state.md`:

1. **Implement.** Dispatch the implementer (the variant of the chosen effort, the chosen model, waited for) with its `INSTRUCTIONS:` line (implement protocol, step 2), `GOAL_FILE` (the path to `goal.md`) in place of the spec/plan/tasks paths, plus `STATE_FILE`, the DECISION LOG, its `MODEL GUIDE:` block if one applies, and — on a re-dispatch — the fixes/answers to fold. Handle `BLOCKED` exactly as in `implement-protocol.md`. You never hand-edit code; every fold goes through the implementer.
2. **Gate.** Run the real verification commands (discover once, record in `loop-state.md`, reuse — same as step A2). A red gate means the round is not done.
3. **Review.** Dispatch the reviewer with `PHASE: goal-implement`, the changed-file list (`git diff --name-only` / `--stat`), the gate result, `GOAL_FILE`, `STATE_FILE`, the DECISION LOG, and its `MODEL GUIDE:` block if one applies. CLEAN requires evidence per acceptance criterion (`AC-<n>`) plus a green gate.
4. **Fold.** Relay findings/risks per the run mode; record every resolution; re-dispatch the implementer with them; re-run the gate; re-dispatch the reviewer.

Exit the loop on CLEAN-with-evidence + green gate. Round cap and repeated items follow step D (the rounds here count as implement). If a cap is exhausted first, follow the command's failure handling: set `status: "stopped"` in `active-run.json`, record everything in `loop-state.md`, and surface the remaining items plainly.

## G5 — Close

Set `status: "complete"` in `.uroboros/active-run.json`, write the closing record in `loop-state.md`, then read `references/loop-report.md` and produce the Loop Report with per-**round** sections in place of per-phase ones. Do not commit anything.
