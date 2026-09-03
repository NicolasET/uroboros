# Changelog

## 0.8.2 — 2026-09-02

- **`/uroboros:compat` tells local edits from spec-kit changes.** The Claude install manifest (`.specify/integrations/claude.manifest.json`, now `install_manifest` in the contract) records the SHA-256 of every skill file as spec-kit wrote it; the audit hashes each installed skill (as-is and CRLF-normalized) and reports **LOCAL** when it no longer matches — a project formatter (Prettier on `.claude/skills/*`) or a hand edit, not spec-kit drift — noting that `specify integration upgrade claude` will refuse to overwrite such files without `--force`. Formatter output (frontmatter quote style, escaped markdown characters, table pipe padding, blank lines) is now an expected hunk, so a reformatted but otherwise identical skill no longer shows as DRIFT.

## 0.8.1 — 2026-09-02

Refinements to `/uroboros:compat` after its first run on a real project.

- **`DRIFT` status.** A real hunk that touches none of a skill's contract markers or plugin-facing areas (hook blocks, branch creation, clarify sections, checklist handling, convergence output, artifact paths/ids) is reported as `DRIFT` — one evidence line, no recommendations. `CHANGED` is reserved for hunks inside those areas or a marker that disappeared.
- **Hooks filtered to the events a run triggers.** The contract lists `hook_directives.events_used` (before/after specify, clarify, plan, tasks, analyze, converge). Mandatory hooks elsewhere (e.g. `before_constitution`) are informational: the loop never invokes those skills, and the implementer subagent replaces `speckit-implement`, so implement hooks never fire.
- **Terminal-friendly report.** Four-column table (cells under 40 characters), one row per core skill (2.1–2.6), evidence as `Details` bullets only for rows that are not OK, `Next steps` capped at five one-line bullets. The skill is told not to evaluate or propose changes to the contract's policy.

## 0.8.0 — 2026-09-02

Anchored to **spec-kit 1.0.0**. The plugin was born on 0.12.10 and ran on 0.14–0.16; this release records that lineage, reviews every line since by diff, and makes future spec-kit minors and majors adaptable on purpose.

- **Spec-kit compatibility contract.** `references/spec-kit-compat.md` (human) + `references/spec-kit-compat.json` (machine) record the baseline release and its snapshot, the last full run, the supported range (`>=0.12.0 <2.0.0`), where a project's version lives, every touchpoint the plugin depends on (skill names, `feature.json`, template markers, clarify section names, hook directives, checklists, constitution) with the plugin file behind each, the hook policy, the re-verification procedure, and a plugin ↔ spec-kit history table. `references/spec-kit-snapshot/1.0.0/` holds verbatim copies of the eight `speckit-*` skills from a pristine install of the `v1.0.0` tag (MIT, attributed) — one snapshot per major.minor line, never per patch — so a later release can be diffed exactly. A review table covers every line from 0.12.10 to 1.0.0: only 1.0.0's checklist semantics touched a plugin touchpoint.
- **Compatibility check at run start.** Before intake (and on resume) the orchestrator reads the contract, detects the project's spec-kit version (`claude.manifest.json` → `init-options.json` → `integration.json`) and checks the six core skills exist. Same major: recorded in `loop-state.md` and the Loop Report, no question. Different major, undetectable, or out of range: one self-contained question (continue / stop and run `/uroboros:compat`); an assumption under `--auto`. A missing core skill stops the run regardless of flags. Goal mode is exempt.
- **`/uroboros:compat` skill.** Report-only audit of the current project against the contract and the snapshot: versions (project, CLI, git extension), each skill's presence and a `git diff --no-index` against the verified copy with hunks classified as expected (script paths, whitespace) or real, marker checks in skills and templates, `feature.json` keys, and the project's hook configuration. Outputs a touchpoint table with status, evidence, the plugin file to adapt, and the exact contract edits when a newer release checks out clean.
- **Explicit hook policy (hard rule 2).** Spec-kit's skills have told the agent to actually invoke mandatory hooks since 0.12 (before the plugin existed) and `before_specify` → `speckit.git.feature` is mandatory in every version reviewed; the old rule 2 ("invoke the named skill yourself") contradicted Phase 0.5 ("do not let any hook re-create the branch") and could create two branches. Now: `speckit.git.feature` is skipped once Phase 0.5 created the branch; optional hooks (`speckit.git.commit`, `speckit.agent-context.update`) are declined silently, recorded under `DECLINED HOOKS`, and listed in the Loop Report for the user; other mandatory hooks are executed by the orchestrator.
- **Convergence gate on implement (`speckit-converge`).** After CLEAN-with-evidence and a green gate, the orchestrator runs spec-kit's converge: "Converged" closes the phase; appended `## Phase N: Convergence` tasks are recorded and fed to the implementer for another round (counted against `--rounds`), then gate, review and converge again. On resuming a started implement, converge runs before the first dispatch. Skipped and noted when the skill is not installed. The reviewer treats convergence tasks as sourced by construction.
- Repo hygiene: `.gitattributes` (`* text=auto eol=lf`) so the skill snapshot and every prompt file check out with LF on Windows too, keeping `hashes.json` valid.
- README: verified version and supported range in Prerequisites, a "Keeping up with spec-kit" section with the upgrade flow (`specify self upgrade` → `specify integration upgrade claude` → `/uroboros:compat`), the hook policy under Configuration, and the new skill in the component table.

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