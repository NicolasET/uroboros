# Changelog

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