# Changelog

## 0.6.0 — 2026-07-29

- **Run-mode flags.** `$ARGUMENTS` now accepts leading flags: `--auto` (no questions ever), `--only-business` (only product/business questions; technical choices auto-resolved), `--reviewer=<model>:<effort>` / `--implementer=<model>:<effort>` (pre-answer the model questions), `--rounds=N` (review-round cap). A suppressed question never becomes a silent guess: it is resolved conservatively and recorded as an `A<n>` assumption in a new ASSUMPTION LOG in `loop-state.md`, marked in the artifact, and surfaced as an audit ledger in the Loop Report. Flags persist in `loop-state.md` and govern resumes.
- **Reviewer is mode-aware.** New `RUN_MODE` input: under a question-suppressing mode, a decision recorded in the ASSUMPTION LOG is sourced-by-policy; a silent (unrecorded) inference is still a finding. Default mode is unchanged.
- **Migrated to the modern skill layout.** `commands/run.md` → `skills/run/SKILL.md` (the docs now mark `commands/` as legacy). Added `argument-hint` and `disable-model-invocation: true` — the pipeline can no longer be auto-triggered by the model; only an explicit `/uroboros:run` starts it. The invocation name is unchanged.
- **Foreground dispatch hardened against the new background-by-default.** Since Claude Code v2.1.198 subagents run in the background by default (with a reduced tool set). Hard rule 7 now requires explicitly requesting a synchronous dispatch (`run_in_background: false`) on every Agent call — a background reviewer/implementer would break the loop's sequencing.
- Agents got display `color`s (reviewer purple, implementer blue) for the task list and transcript.

## 0.5.0 — 2026-07-24

Context-engineering pass following Anthropic's Claude 5 guidance (judgement over repetition, progressive disclosure, surfacing unknowns).

- **Blind-spot pass at intake.** Before interrogating, the orchestrator explores the codebase around the idea and surfaces the user's unknown unknowns — prior work in the area, invariants the idea touches, decisions it silently implies — and turns them into intake questions.
- **Questions ordered by impact.** Intake questions and relayed findings whose answer would change the architecture or data model come first; the reviewer now orders its findings most-consequential first.
- **References invited at intake.** The orchestrator actively asks for existing code, mockups, or libraries close to what the user wants, reads them, and carries them into the specify prompt — source code is the highest-fidelity spec input.
- **Deviations persist.** Every deviation the implementer reports in `notes` is appended to `loop-state.md` under the phase's `### Deviations`, and the Loop Report mines deviations (not just findings) for candidate rules.
- **Progressive disclosure.** The implement protocol and the Loop Report format moved out of the command into `references/implement-protocol.md` and `references/loop-report.md`, read only when their phase arrives.
- **De-duplicated command prompt.** The model/effort question rules, foreground-dispatch rule, and explicit-model rule now live in one Model/effort protocol section instead of being restated per phase.

## 0.4.0 — 2026-07-11

- **Reviewer verifies claimed code facts.** When an artifact rests on a claim about the existing codebase ("these screens share one component", "this field already exists"), the reviewer now checks it directly with Read/Grep/Glob before treating it as sourced; an unconfirmable claim is reported as an unverified premise. Audit the premises, not just the conclusions.
- **Per-phase reviewer model mappings.** The intake model/effort answer may assign different models to different phases (e.g. a frontier model for plan/implement reviews, a cheaper one elsewhere); the orchestrator dispatches each review with the model mapped to its phase.

## 0.3.0 — 2026-07-11

- **Candidate rules to encode:** the final Loop Report now scans the run's findings for recurring classes and proposes concrete rules (constitution / CLAUDE.md / skill) to eliminate that class of finding at the source in future runs. Propose-only; the user decides.
- **Gate command caching:** the implement verification commands are discovered once, recorded in `loop-state.md`, and reused across rounds and resumes instead of being re-derived every time.

## 0.2.1 — 2026-07-11

- Model/effort questions (reviewer at intake, implementer before implement) are now **two separate questions** in one `AskUserQuestion` call — model and effort are never combined into single options, and no option may be labeled recommended/default.

## 0.2.0 — 2026-07-11

- **Reviewer model/effort is now a runtime choice**, asked once per run (blocking) at intake and applied to every reviewer dispatch — same pattern as the implementer. Fixes the model being silently wrong in plugin installs (the orchestrator previously tried to read the agent frontmatter from a path that doesn't exist in the project).
- Frontmatter `model`/`effort` in both agents are now fallbacks only.
- Hard rule 7 generalized: no subagent runs on an unchosen model; all dispatches are foreground/blocking.

## 0.1.0 — 2026-07-10

Initial open-source release.

- `/uroboros:run` orchestrator: intake → branch → six SDD phases with auto-advance, per-feature `loop-state.md`, resume check, hard verification gate on implement, legible final Loop Report.
- `uroboros-reviewer` subagent: fresh-context, read-only, zero-inference interrogation per phase profile; `CLEAN` requires positive evidence.
- `uroboros-implementer` subagent: fresh-context maker; model + effort chosen by the user at runtime via a blocking question; reports `BLOCKED` on ambiguity instead of guessing.