# Verify protocol — the product used, not only tested

Read when a build round reaches CLEAN-with-evidence and a green gate (loop protocol, The build rounds). The gate (step A2) proves the code passes its own tests; verification proves the product does what the user approved when it is used. It is part of the gate: the build is not done while a scenario fails (hard rule 5).

## V1 — Dispatch

1. Take a snapshot (loop protocol, Working-tree snapshots) and record it as the tree before verification; with `SNAPSHOTS: unavailable`, record `git status --porcelain` and `git diff --stat` instead.
2. Dispatch `uroboros-verifier` on the verifier's model and effort (model protocol), waited for (hard rule 7), with `INSTRUCTIONS: ${CLAUDE_PLUGIN_ROOT}/references/verifier-instructions.md` as the first line, `ROUND`, `GOAL_FILE`, `PLAN_FILE` on a large run, `CHANGED_FILES` (the changed-file list), `BASE_TREE` (the recorded `BASE TREE`, or `none`), `RUN_COMMANDS` (the `VERIFY COMMANDS` in `loop-state.md`, else those of the project notes, else `none` — the verifier then starts from the plan's *How to run it* or the project's own scripts), `FIXED` from round 2, `STATE_FILE`, `EARLIER_FEATURES` (if any), the DECISION LOG, and its `MODEL GUIDE:` block if one applies.
3. Run the Model check and the Contract check on its report.

## V2 — It touched nothing

Take a snapshot again and compare it with V1's: `git diff --name-status <before> <after>` (without snapshots, `git status --porcelain` and `git diff --stat`). If an existing file was modified or deleted (`M`, `D`), do not use the report: ask per the question protocol, listing each file and its diff stat, whether the change stays (it is reviewed in the next round as part of the feature) or the user reverts it by hand before the run continues. *(Under `--auto`: stop and report.)* Added files (`A`; without snapshots, new untracked files) are recorded for the Loop Report with the report's `created` list.

## V3 — Read the results

Record under the round a `### Verification <n>` block in `loop-state.md`: each scenario and probe id, its outcome and one line of evidence (a probe also with its `source`), each `open` probe, the browser used, the `observed` items and the `rechecked` ones. The first time, record `run_commands` as `VERIFY COMMANDS` and reuse them on every later round and on resume.

- **Every scenario and probe `pass` or `not-run`, no `open`, and no observed item waiting for a fix or an answer** → V4, then close the run (loop protocol, Closing the run).
- **A probe with `base: fails too`** was failing before the run: it is not this run's, and goes to the Loop Report under *Seen outside this feature*.
- **A `fail`** — a scenario, or a probe of an outcome the text fixes — is a gate failure (step D): fixed, not asked, unless the fix needs a product decision. Re-dispatch the implementer with each failed scenario or probe, expected versus observed and the evidence; then the gate (A2), the reviewer with the fix as its `FOLDS` (step B), and V1 again with `FIXED` (for a failed `property` probe, its seed and failing input from the report's `evidence`). Each pass counts as a round against the cap (step D); an exhausted cap with a failing scenario or probe goes on as step D's exhausted cap says, and is never left out. Under `--auto`, a scenario or probe that fails the same way two rounds in a row is dropped as step D says for a gate check (`skipped — red`).
- **`open` probes** are behaviors the text never decided, so nobody chose them. When a verification has `open` probes and no `fail`, once the record has answered first (question protocol), ask one question that lists each one left in plain words — what was done, what the product does today, the criterion it falls under. Options: *All stay as built* / *Change some* (the user writes which and how). Each one kept is a user decision (`D<n>`, kept as built); each change is a `D<n>` the implementer gets as a failed probe, then the round continues as for a `fail`. When every one is kept, V4, then close. Decided ones are not asked again: the next verification reads them in the DECISION LOG. *(Under `--auto`: each stays as built, as an `A<n>`.)*
- **`observed` items that touch a changed file** (`touches_changed: yes`) are defects in what this run changed. Give each a run-global `O<n>` (question protocol, Trace ids) and send them to the refuter (question protocol, The record answers first), each with what was seen and where:
  - `not-this-run` → the Loop Report, *Seen outside this feature*.
  - `decided` — an acceptance criterion or a recorded decision states what the product should do there → a gate failure (step D): fixed, not asked.
  - `unreachable`, `no-outcome`, `discoverable` → logged; nothing to do.
  - `corroborated` or `inconclusive` → asked in one list after the round's other questions, each in plain words: what was seen and where. Options: *Fix them now* / *Fix some* (the user writes which) / *Leave them for a later feature*. Each item is its own `D<n>`. *(Under `--auto`: each is left for later, as an `A<n>`.)*

  Each one to fix goes to the implementer with what was seen and where; then the round continues as for a `fail`, with the item's `O<n>` in `FIXED`, and counts against the cap. The next verification reports it under `rechecked`: `still there` is a `fail`. An `O<n>` left for later is not asked again in this run.
- **`observed` items that touch no changed file** never enter the loop; they go to the Loop Report.

## V4 — Scenarios not run

A run does not close in silence over a scenario nobody could run. When a verification has `not-run` scenarios and nothing above is left to fix or ask, list each one in plain words with its reason, in two groups: the ones that could run here if something were added — a connected browser, test data in the project's seed or fixture files — and the ones nothing local can supply (an external service, production, a stand-in).

- **The first group has any** → ask one question about the run (never sent to the refuter), per the question protocol, showing both groups. Options: *Leave them unverified in this feature* / *I added what was missing — verify again* (re-dispatch V1 when the user answers; that verification does not count against the round cap, a `fail` it finds does). After a second verification only the scenarios still `not-run` are listed.
- **The first group is empty** → there is nothing to decide: nothing is asked.

The list is part of the run's closing summary either way. Every scenario the user chose to leave is its own `D<n>` marked `not-run` *(under `--auto` nothing is asked, and each is an `A<n>` marked `not-run`)*; one nothing local can supply is no decision: record it as `not-run` under the round with its reason. `not-run` probes are not listed one by one: record them grouped by reason with their count. The closing record, the run's final one-line summary and the Loop Report's first line then read `complete — <n> scenarios not verified`, n counting every scenario that stayed `not-run`.

## Resume

A run interrupted during verification resumes at V1 of the recorded round.
