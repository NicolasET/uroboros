# Implement protocol — how step A and the fold differ

For the **implement** phase only, the maker is a dedicated subagent so it can run on a different model/effort than the orchestrator. Everything else in the loop (A2 gate, B review, C parse, D relay, E advance) is unchanged.

## Step A (implement)

1. **BLOCKING — settle the implementer's model/effort per the Model/effort protocol.** If `--implementer=<model>:<effort>` was given, that is the user's answer — record it and skip the question. Otherwise ask, and do not dispatch the implementer until the user has answered *in this run* (under `--auto` with no flag: frontmatter fallback, recorded as an assumption). Record the choice in `loop-state.md`.
2. Dispatch the `uroboros-implementer` subagent in the foreground with the chosen model passed explicitly on the Agent call and the chosen effort, and wait for its `IMPLEMENTER-REPORT`. In its prompt put: `FEATURE_DIR`, the paths to `spec.md`/`plan.md`/`tasks.md` (+ data-model/contracts if present), `STATE_FILE`, and the `DECISION LOG`.
3. Read its `IMPLEMENTER-REPORT`.
   - **Log deviations:** append every deviation the implementer reports in `notes` to `loop-state.md` under this phase's `### Deviations` (one line each, with the round number). Deviations forced by reality are exactly what the Loop Report's candidate rules are mined from — do not let them evaporate with the subagent's context.
   - If `status: BLOCKED`, it hit a product/design ambiguity: relay each `blocked_on` item to the user as its own `AskUserQuestion` question per the Question protocol (its `current:` paraphrased as what the code says today, ids only as trailing tags), record the answers in the DECISION LOG + `loop-state.md`, and **re-dispatch** the implementer (same chosen model/effort) with the answers to continue. Repeat until `status: DONE`. *(When the run mode suppresses the question — `--auto` always, `--only-business` for technical items — resolve the `blocked_on` item via the assumption mechanism instead: record `A<n>` in the ASSUMPTION LOG and re-dispatch with that resolution.)*

Then proceed to **A2** (you run the real verification gate) and **B** (dispatch the reviewer) exactly as written in the loop.

## The fold (step D) for implement

You do not hand-edit the code yourself. Instead, **re-dispatch the `uroboros-implementer`** (same chosen model/effort) with the user's answers to the reviewer's findings and any gate failures, so all code is written by the strong maker. Log any new deviations from its report as in step 3. Then re-run the gate and re-dispatch the reviewer. Loop until CLEAN-with-evidence + green gate (max 3 rounds), then run the convergence gate below.

## The convergence gate (closes the phase)

CLEAN plus a green gate proves the written code is right; it does not prove nothing is **missing**. `speckit-converge` (spec-kit ≥ 0.11.2; optional per the compatibility check) proves that: it assesses the code against spec/plan/tasks and either appends the unbuilt work as `## Phase N: Convergence` tasks at the end of `tasks.md` (ids continue from the last `T###`, each with a source-ref such as `FR-003`, `US1/AC2`, `plan: …`, `Constitution II`) or leaves the file byte-for-byte untouched and reports **Converged**. It never edits code, spec or plan.

After CLEAN-with-evidence + green gate:

1. Invoke the `speckit-converge` skill inline (drive its hook directives per the hook policy).
2. **Converged** → record `CONVERGE: converged` under this phase in `loop-state.md` and close the phase (step E).
3. **Tasks appended** → record the appended task ids and source-refs under this phase; re-dispatch the implementer (same chosen model/effort) with exactly those tasks; re-run the gate; re-dispatch the reviewer; then run converge again. Each pass counts as a round against the cap; if the cap is exhausted with tasks still being appended, follow the command's failure handling.
4. `speckit-converge` not installed → skip the gate, record `CONVERGE: skipped (skill not installed)`, and close on CLEAN + green gate.

Convergence tasks are sourced by construction (each traces to a spec/plan/constitution ref), so they raise no user question by themselves; the reviewer audits their implementation like any other task.

## Resuming implement

When the resume check picks up a run whose implement phase had already started (code exists on disk), run `speckit-converge` **before** the first implementer dispatch so `tasks.md` reflects what the code already does, record the outcome, then continue at the recorded round.
