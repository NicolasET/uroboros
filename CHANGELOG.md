# Changelog

## 0.7.1 — 2026-09-02

- **Self-contained questions (Question protocol).** Questions relayed to the user leaned on internal ids — "F17 and F20: confirm both?", "given your decision F3" — that exist only in the reviewer's report and `loop-state.md`, which the user never sees. A new Question protocol in the orchestrator (plus hard rule 8) now governs every `AskUserQuestion` of the run: one decision per question; state what the artifact says today (paraphrased in the user's language, quoted verbatim only when the exact wording is at stake) and why it matters; options phrased as outcomes, with the current value as an explicit option; internal ids (`F<n>`, `R<n>`, `B<n>`, `A<n>`, `FR-`, `SC-`, `US<n>`, `T<n>`) and agent labels never as the subject, only as a trailing trace tag; earlier answers restated in words; the `header` chip a topic word. Applies to intake, findings/risks, `BLOCKED` relays, the round-cap notice, goal mode, the DECISION LOG, and the Loop Report.
- **Reviewer and implementer report `current:`.** Each reviewer finding and each implementer `blocked_on` item now carries a `current:` line (what the artifact or code says there today, 1–2 lines, or `absent`), so the orchestrator writes the question from the report instead of from its own — possibly compacted — memory of the artifact.

## 0.7.0 — 2026-08-06

- **Goal mode (`--goal`).** A new flag that replaces the SDD pipeline with a completion condition, in the spirit of Claude Code's `/goal` — for small tasks where full SDD is overkill, and for repos without spec-kit (no `speckit-*` skill is invoked). Intake is unchanged but produces a `goal.md` (measurable condition + numbered `AC-<n>` acceptance criteria + constraints) that the reviewer audits before any code; the run then loops implementer → real gate → reviewer until CLEAN-with-evidence-per-criterion + green gate, capped by `--rounds`. Orthogonal to the question flags (`--auto`/`--only-business`) and the model flags. Protocol lives in `references/goal-protocol.md` (progressive disclosure — read only when the flag is present).
- **Stop hook keeps goal runs alive.** The plugin now ships `hooks/goal-gate.js` (Node), a Stop hook replicating `/goal`'s turn-relaunching: while `.uroboros/active-run.json` records an `"active"` goal run, ending a turn blocks the stop and resumes the loop from `loop-state.md`; the hook enforces its own relaunch cap (`--rounds`) and allows the stop on any doubt. Inert in non-goal sessions (marker absent → immediate allow).
- **Goal-mode state lives in `.uroboros/<slug>/`** (`goal.md` + `loop-state.md`, plus the transient `active-run.json` marker at `.uroboros/`), independent of spec-kit's feature directories. Branching uses plain git (`goal/<slug>`), not `speckit-git-feature`.
- Reviewer gained `goal` and `goal-implement` phase profiles (evidence per acceptance criterion); implementer accepts `GOAL_FILE` in place of spec/plan/tasks and reports `AC-<n>` ids.

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