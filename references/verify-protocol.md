# Verify protocol — the product used, not only tested

Read when implement's convergence gate closes (implement protocol) and, in goal mode, when a round reaches CLEAN-with-evidence + green gate (goal protocol, G4). The gate (step A2) proves the code passes its own tests; verification proves the product does what the user approved when it is used. It is part of the gate: a phase is not done while a scenario fails (hard rule 5).

## V1 — Dispatch

1. Take a snapshot (Working-tree snapshots) and record it as the tree before verification; with `SNAPSHOTS: unavailable`, record `git status --porcelain` and `git diff --stat` instead.
2. Dispatch the `uroboros-verifier-<effort>` variant on the verifier's choice (Model/effort protocol), waited for (hard rule 7), with `INSTRUCTIONS: ${CLAUDE_PLUGIN_ROOT}/references/verifier-instructions.md` as the first line, `MODE`, `ROUND`, `SCENARIOS_FROM`, `CHANGED_FILES` (the changed-file list, Working-tree snapshots), `RUN_COMMANDS` (the `VERIFY COMMANDS` in `loop-state.md`, or `none`), `FIXED` from round 2, `STATE_FILE`, `STANDING_DECISIONS` (if the file exists), the DECISION LOG, and its `MODEL GUIDE:` block if one applies.
3. Run the Model check on its report.

## V2 — It touched nothing

Take a snapshot again and compare it with V1's: `git diff --name-status <before> <after>` (without snapshots, `git status --porcelain` and `git diff --stat`). If an existing file was modified or deleted (`M`, `D`), do not use the report: ask per the Question protocol, listing each file and its diff stat, whether the change stays (it is reviewed in the next round as part of the feature) or the user reverts it by hand before the run continues. *(Under `--auto`: stop and report.)* Added files (`A`; without snapshots, new untracked files) are recorded for the Loop Report with the report's `created` list.

## V3 — Read the results

Record under the phase (goal mode: the round) a `### Verification <n>` block in `loop-state.md`: each id, its outcome and one line of evidence, the browser used, and the `observed` items. The first time, record `run_commands` as `VERIFY COMMANDS` and reuse them on every later round and on resume.

- **Every scenario `pass` or `not-run`** → V4, then close: implement → step E; goal mode → G5.
- **A `fail`** is a gate failure (step D): fixed, not asked, unless the fix needs a product decision. Re-dispatch the implementer with each failed scenario, expected versus observed and the evidence; then the gate (A2), the reviewer with the fix as its `FOLDS` (step B), the convergence gate in SDD, and V1 again with `FIXED`. Each pass counts as a round against the cap (step D); an exhausted cap with a failing scenario is step D's exhausted-cap question without *Leave them out*. Under `--auto`, a scenario that fails the same way two rounds in a row is dropped as step D says for a gate check (`skipped — red`).
- **`observed` items** never enter the loop; they go to the Loop Report.

## V4 — Scenarios not run

- **`not-run: no browser`** — ask once per run, per the Question protocol, listing the UI scenarios: *Connect a browser, then verify again* (re-dispatch V1 when the user answers) / *Leave the UI unverified in this feature* (one `D<n>`). *(Under `--auto`: `A<n>`.)*
- **Any other reason** (an external service, no test data, an outcome the text leaves open, no runnable surface) is not asked: it is recorded and listed first in the Loop Report's verification section as not verified, with the reason.

## Resume

A run interrupted during verification resumes at V1 of the recorded round.
