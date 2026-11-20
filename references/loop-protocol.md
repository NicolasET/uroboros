# Loop protocol — review, fold, advance

Read when `goal.md` is written, before the first review, and again on every resume after intake.

## Contents

- The phases — who makes what, and who judges it
- Step A2 — the hard gate
- Step B — dispatch the reviewer
- Step C — parse the report
- Step D — relay, fold, and the round cap
- Step E — advance
- The build rounds
- A size that proves too small
- Working-tree snapshots
- Open dispatches and stale results
- Closing the run

## The phases

| Phase | What B judges | Who makes it | Runs on |
|---|---|---|---|
| `goal` | `goal.md` | you, at intake | medium, large |
| `plan` | `plan.md` | you (plan protocol) | large |
| `implement` | the run's diff, each build round | the implementer (implement protocol) | every size |

Every phase goes the same way: the gate (A2), the review (B), the parsed report (C), the relay and the fold (D) — repeated until CLEAN-with-evidence — and then you advance (E). On a medium or large run no implementer is dispatched before `goal.md` is CLEAN-with-evidence; on a large run, nor before `plan.md` is.

**A small run has no `goal` phase.** `goal.md` is not reviewed on its own. Every review of the build rounds carries `GOAL_REVIEW: pending` until one returns `CLEAN` with it: the reviewer applies the goal profile and the implement profile in one pass, and that `CLEAN` needs evidence for every `I<n>` and every `AC-<n>`. Record `GOAL_REVIEW: done` in `loop-state.md` then. A finding it raises about `goal.md` is folded into `goal.md` by you; the implementer brings the code in line on its next dispatch.

## Step A2 — The hard gate (the part that can actually fail)

- **`implement`:** run the project's checks — the commands the project itself configures to test, lint, and type-check or build its code, in whatever language it uses. **Discover them once** (the project notes first, then the check steps of its CI workflow, its task runner or manifest scripts — e.g. a `Makefile`, `package.json` or `pyproject.toml` — and, on a large run, the plan's *How to run it*), **record the exact commands in `loop-state.md`, and reuse that recorded list on every later round and on resume** — do not re-derive them each time; running a known command is cheaper than reasoning it out again. A kind of check the project does not configure — no linter, no type checker (in a compiled language the build is that check) — is recorded as `none` with where you looked; never install or invent a tool to fill it. A check the run itself sets up (a criterion adds a test runner or a linter) joins the recorded list from then on. No command at all is asked about (implement protocol, step A). Capture pass/fail and the failing output. A red check is run once more, unchanged, only to tell a flaky one from a broken one; it never turns the gate green (implement protocol, Flaky checks). A failure means the round is **not done** no matter how good the code looks — record it and treat it as a blocking item in step D. Never advance past a red gate. Three kinds of failure do not count toward it: a check dropped under `--auto` per step D, a failure the gate baseline recorded before the run and the user (or `--auto`) left out of the gate (implement protocol, step A), and a flaky check the user (or `--auto`) left out of the gate (implement protocol, Flaky checks).
- **`goal` and `plan`:** the gate is B's `CLEAN`-*with-evidence* in step C. There is no suite to run, so the proof is B citing positive evidence for every criterion the phase defines.

## Step B — Dispatch the reviewer

Use the Agent tool to call `uroboros-reviewer` with the model and effort from the model protocol (the per-phase mapping if the user gave one). Put in its prompt:

- `INSTRUCTIONS:` `${CLAUDE_PLUGIN_ROOT}/references/reviewer-instructions.md` — first line.
- `PHASE:` `goal`, `plan` or `implement`.
- `ROUND:` this phase's round number. From round 2, also `FOLDS:` every resolution folded since B's last report — its run-global id, the answer in plain words, and each file and section edited.
- `RUN_MODE:` the active flags (or `default`).
- `STATE_FILE:` the path to `loop-state.md` (tell B to read it first), and `PRIVATE_RECORD:` the private record's absolute path (hard rule 9).
- `EARLIER_FEATURES:` the paths listed under `EARLIER FEATURES` (question protocol, Earlier features), if any.
- `GOAL_FILE:` the absolute path of `goal.md`; on a large run, `PLAN_FILE:` the absolute path of `plan.md` once it exists.
- `DECISION LOG:` the live summary of everything the user has already decided.
- On `implement`: the run's diff per Working-tree snapshots — `RUN_DIFF:` (and `FOLD_DIFF:` from round 2), `git diff --stat <BASE TREE> <ROUND TREE n>` and the changed-file list; the **gate result** from A2 (pass/fail and any failing output); `REVIEW_RULES:` when the project has review rules (implement protocol, Review rules); and, on a small run, `GOAL_REVIEW: pending` until a review returned CLEAN with it (The phases).
- `MODEL GUIDE:` the reviewer section of the guide for its resolved release, verbatim — only if one applies (model protocol).
- Instruction: "Read the state file first; interrogate per your profile (from round 2, verify the folds only); CLEAN requires evidence; do not re-report anything already resolved in the state file, DECISION LOG, or ASSUMPTION LOG."

Every subagent dispatch of the run carries its role's `INSTRUCTIONS:` line, `EARLIER_FEATURES` when there are any and, when one applies, its `MODEL GUIDE:` block.

## Step C — Parse B's report

Run the Model check on its `model:` line and the Contract check first (model protocol). Give its findings and risks run-global ids as you log them (question protocol).

- If `status: CLEAN` *with a satisfactory `evidence` block* — one entry per criterion (Contract check), each naming its `source` and citing where; on `implement` none rests on the implementer's word alone — and, on `implement`, a green gate → go to E (`implement` first passes verification — verify protocol).
- Else collect `findings` (and `risks` on `plan` and `implement`), plus any gate failure from A2.
- **Derived findings are folded, not asked.** A finding with `derived_from:` names a recorded decision (the idea and the user's messages as written, DECISION LOG, an earlier feature's decision this run leaves untouched, a project review rule no decision of this run contradicts — implement protocol, Review rules) that leaves one consistent answer. Check that the cited decision leaves no other answer; if it does, fold that answer without asking and log it as `F<n> → derived from <id>`; if another answer is still consistent, it is an ordinary finding. The next review round verifies the fold like any other.
- **Proof findings are fixed, not asked.** A finding with `weight: proof` (`implement` only) is a gap in the evidence with one fix and no decision in it. It is a gate failure: it skips the refuter and goes to step D to be fixed.
- **Refute before asking** (question protocol, The record answers first): the remaining findings (any `weight` but `proof`) and the risks go to the refuter with the inputs B received in step B except `ROUND`/`FOLDS`/`FOLD_DIFF` and B's instruction line, plus `FINDINGS:` those findings and risks verbatim from B's report.
- **Defects are fixed, not offered for acceptance.** A risk left after the refuter with `kind: defect` (reviewer instructions) is mitigated. When the reviewer gives one fix, fold it without asking (on `implement`, the implementer applies it in the code on its next dispatch; one that lands in a judging source is yours), log it as `R<n> → mitigated: <the fix>`, and list it with the refuted items (question protocol, The record answers first); the next review round verifies it like any fold. When it gives several, ask which one per the question protocol: the options are the fixes, never accepting the risk or leaving it out. *(When the run mode suppresses that question, the assumption mechanism chooses among the fixes.)* A `kind: limitation` risk is asked like any other.

## Step D — Relay to the user and fold

- Turn each finding/risk (and any gate failure) into an `AskUserQuestion` question per the question protocol — one decision per question (findings on the same point merged, a rule before its instances, `weight: minor` and `weight: value` findings each in the round's one list), B's `current:` paraphrased as what the artifact says today, the current value as an explicit option, ids only as trailing trace tags (use its `options`, always allow a free-form "Other"; batch <=4 questions per call; no option recommended). A limitation's options (`accept`, `mitigate`, `gate`, `out-of-scope`) are labels, not outcomes: phrase each as what it means for that risk (e.g. "Ship as is; the risk is recorded", "Add a check that fails when it happens"). Questions in the user's language. **Order by impact: findings whose answer changes architecture or data shape go in the first batch; wording-level gaps last.** A gate failure — a `weight: proof` finding included — is not a question of taste: fix it; only ask the user when the fix involves a product/design choice. *(Under `--auto`: resolve every finding/risk via the assumption mechanism instead of asking. Under `--only-business`: ask business findings, assume technical ones.)*
- **A point the review raised can be left out.** A `leave_out: yes` finding (reviewer instructions) is asked with one more option, *Leave it out of this feature*, unless an option that builds nothing is already offered. Chosen, it is a `D<n>` marked out of scope: what brought the point in leaves the artifact or moves to its **Out of scope**, and nothing is built for it. A suppressed question never takes it: the assumption mechanism chooses among the finding's own options.
- Record every answer per the question protocol (Record what was answered) and append its restatement to `loop-state.md` under this phase (finding → resolution; assumptions go to the ASSUMPTION LOG).
- **You** edit the artifact to fold the answers in: replace inferred values and delete obsoleted assumptions. B never edits. On `implement` the fold goes through the implementer (implement protocol, The fold).
- **Sweep before re-review.** After folding, Grep `goal.md` and `plan.md` for each concept the fold changed and bring every mention in line, so the next round does not find the old text. On `implement`, the implementer sweeps the code and tests on its re-dispatch.
- Re-run the gate (A2) if code changed, then re-dispatch B (step B) to verify. Repeat C–D until CLEAN-with-evidence and, on `implement`, a green gate.
- **Round cap and repeated items — the single definition; every other file refers here.**
  - **Cap:** the round cap of SKILL.md (The run, by size) — by size, replaced by `--rounds=N`, none under `--auto` without it — counted per phase. Round 1 audits the phase; every later round only verifies the folds (reviewer instructions, Round 2 and later).
  - **Exhausted cap:** when the cap is exhausted with items left, nothing is asked about the cap itself. Each item that needs a decision is asked as above, with one more option unless it is already offered, *Leave it out of this feature* (a user decision, `D<n>`, out of scope); folds, gate failures and `proof` findings need no question and are never left out. Review rounds then go on, at most **two** beyond the cap, each adding one to `rounds_max` in the marker so the Stop hook keeps relaunching. If items are still left after them, stop and report (SKILL.md, Failure handling), each item in plain words. Record the extra rounds and their outcome in `loop-state.md`.
  - **Under `--auto`, repeated items are skipped, not retried.** An item that comes back unchanged in the round right after its fold is skipped: a finding or risk (same location, same undecided point) becomes an `A<n>` marked `skipped — repeated`, settled-by-policy for every later dispatch of B; a gate check that fails the same way two rounds in a row is dropped from the gate for the rest of the run — the narrowest unit its output names (the failing test, else the command) — as an `A<n>` marked `skipped — red`. A `proof` finding that comes back unchanged in the round right after its fix is skipped the same way (`skipped — red`). The rest of the gate must still pass. The run keeps going.
  - **Under `--auto` with an explicit `--rounds=N` exhausted:** on `goal` and `plan`, **advance** — record every resolution from the last fold that B has not verified as an `A<n>` marked `unverified`, record the exhausted cap in `loop-state.md`, and continue; on `implement`, **stop and report** — never advance code past an exhausted cap or a red gate.

## Step E — Advance

Write the phase's closing record to `loop-state.md` (status: done, inferences caught, items the refuter answered, questions answered, defects mitigated, risks accepted, assumptions made, gate result, verification result for `implement`, files changed). Emit a one-line summary, followed by the items the refuter answered and the defects mitigated without a question (question protocol, The record answers first), and continue automatically. Do not ask permission to advance.

After the review of `goal.md` and after the review of `plan.md` — on a small run, after the first build round's review — the summary ends with the **growth line**, in the user's language: how many things the idea asked for (`IDEA ITEMS`), how many acceptance criteria `goal.md` holds, on a large run how many groups the plan holds, and how many `leave_out: yes` questions so far were answered with something to build and how many left out. Record it as `GROWTH:` under the phase.

## The build rounds

Before the first one, read `${CLAUDE_PLUGIN_ROOT}/references/implement-protocol.md` and take the base and the gate baseline as its step A, item 2, says. Then loop; at the start of each round increment `rounds_used` in the marker and open a `### Round <n>` record in `loop-state.md`:

1. **Implement.** Dispatch the implementer and handle its report as the implement protocol says (step A). You never hand-edit code; every fold goes through the implementer.
2. **Gate.** Run the recorded gate commands (A2). A red gate means the round is not done.
3. **Review.** Dispatch the reviewer with `PHASE: implement` (step B). CLEAN requires evidence per acceptance criterion plus a green gate.
4. **Fold.** Refute and relay findings and risks (steps C–D); record every resolution; re-dispatch the implementer with them and the sweep of step D; re-run the gate; re-dispatch the reviewer.

On CLEAN-with-evidence and a green gate, read `${CLAUDE_PLUGIN_ROOT}/references/verify-protocol.md` and verify against each `AC-<n>`; the rounds end when verification passes. A failed scenario or probe is the next round's fix. The round cap and repeated items follow step D.

**A criterion that appears mid-run.** When a free-text answer during the rounds asks for something the product must do that no `AC-<n>` states, confirm it with one question per the question protocol, restating the answer: *Add it as an acceptance criterion* / *No, it was not a new requirement*. Added: append it to `goal.md` as the next `AC-<n>` with a `D<n>`, and to `IDEA ITEMS` as the next `I<n>`; the next review verifies it as a fold of `goal.md`, and verification checks it like the others.

## A size that proves too small

When a finding, a `BLOCKED` item or the run's diff shows what a larger size's definition names (intake protocol, step 2), say what showed it and ask per the question protocol: *Go on as sized* / *Treat it as <size>*. Treated as the larger size, the run does that size's steps not yet done before the next implementer dispatch — the branches of the decision tree intake did not walk, asked as an intake round; the review of `goal.md` when no review has judged it; on *large*, the plan (plan protocol) — and takes its round cap, written to `rounds_max` in the marker. A run that began small also asks **Stop when** (intake protocol, step 4). Record the new `SIZE` with the answer. *(Under `--auto`: treat it as the larger size, as `A<n>`.)*

## Working-tree snapshots — what this run changed

The build rounds judge only what this run changed. A **snapshot** is the id of a git tree that holds every non-ignored file of the working tree, untracked files included, written without a commit, without a ref and without touching the user's index (hard rule 6). Take one with the Bash tool — a POSIX shell, never PowerShell — exactly so; it prints the id:

```
idx="$(git rev-parse --git-path uroboros/snapshot.index)"; mkdir -p "$(dirname "$idx")"
cp "$(git rev-parse --git-path index)" "$idx" 2>/dev/null || GIT_INDEX_FILE="$idx" git read-tree --empty
GIT_INDEX_FILE="$idx" git add -A && GIT_INDEX_FILE="$idx" git write-tree
```

- **`BASE TREE`** — taken before the first implementer dispatch (implement protocol, step A) and recorded in `loop-state.md`. Changes the user made before the run are part of it, so they never count as the run's.
- **`PRE TREE`** — taken right before each implementer dispatch (one before a wave) and recorded with its `DISPATCH OPEN` line (Open dispatches); a dispatch reopened on a resume keeps the recorded one. It is what implement protocol, step A, item 4 compares the judging sources with.
- **`ROUND TREE <n>`** — taken first when each implementer report arrives (a wave: when its last report arrives), before you write anything, and recorded under round n; a later dispatch in the same round (a `BLOCKED` answer, the next wave, the dispatch after a wave) replaces it.
- **The run's diff** is `git diff <BASE TREE> <ROUND TREE n>`, n the latest round. Write it, unified, to `$(git rev-parse --git-path uroboros/run.diff)` — inside `.git`, so no file lands in the project — and pass that absolute path as `RUN_DIFF:` to the reviewer and the refuter, which cannot run git. From round 2, also write `git diff <ROUND TREE n-1> <ROUND TREE n>` to `…/uroboros/fold.diff` and pass it as `FOLD_DIFF:`.
- **The changed-file list** is `git diff --name-only <BASE TREE> <ROUND TREE n>`; every step that needs the run's changed files uses it.
- **Fallback.** Without git, when `write-tree` fails, or when a recorded tree is gone (`git cat-file -e <id>` fails: `git gc` prunes unreferenced objects once they are older than `gc.pruneExpire`, two weeks by default), record `SNAPSHOTS: unavailable — <reason>` and pass no `RUN_DIFF`. The changed-file list is then `git diff --name-only` plus `git ls-files --others --exclude-standard`, or, without git, the union of the implementer reports' `files_changed`.

## Open dispatches and stale results — a long run is not lost

- **Open dispatches.** Before every Agent call, write `DISPATCH OPEN: <role> <phase or round> <session_id>` in `loop-state.md` — an implementer of a wave also names its group after the round (`implementer round 1 G2 <session_id>`), and an implementer's line ends with its `PRE TREE` — and remove it when you read the report. A resume that finds one open: the same session (the Stop hook relaunched it, or its context was compacted) keeps waiting for the completion notification — unless the hook's message says no subagent is running, which means the dispatch is lost: use its report if the completion notification is already in the conversation, otherwise dispatch it again. Another session dispatches it again and never assumes its result.
- **Stale results.** From the first build round on, every gate run, review and verification records the snapshot it ran on (`on tree <id>`), and `LAST TREE: <id>` in `loop-state.md` follows the latest recorded snapshot — each `ROUND TREE`, and the one each gate run and verification ran on. A resume with no open dispatch takes a snapshot; if it differs from `LAST TREE`, it lists the files (`git diff --name-status <LAST TREE> <snapshot>`) and asks the question of verify protocol V2 before anything recorded is used. *(Under `--auto`: stop and report.)*

## Closing the run

When verification passes, set the marker's `status` to `"complete"`, write the closing record in `loop-state.md`, write the project notes and the glossary (intake protocol, Project records), then read `${CLAUDE_PLUGIN_ROOT}/references/loop-report.md` and produce the Loop Report it specifies. A run whose state file holds `PARTS` first waits for them (parts protocol, P5). Do not commit anything. A change the user asks for in this session after the report reopens the loop (implement protocol, After the run closes).
