# AGENTS.md — working on the Uroboros plugin

This file is for coding agents changing this repository. It is the source of truth for what Uroboros is for, what must never change, and how a change is made and released. Human contributors: see [CONTRIBUTING.md](./CONTRIBUTING.md).

## What Uroboros is, and why

A Claude Code plugin that runs GitHub Spec Kit's Spec-Driven Development pipeline (specify → clarify → plan → tasks → analyze → implement) end to end from one raw idea, plus a goal mode (`--goal`) that needs no spec-kit, and a compatibility audit (`/uroboros:compat`).

- **The problem.** AI builds well but does not always account for everything it was asked. SDD reduces that, but reading every artifact each spec-kit step produces is tedious. Uroboros puts an independent reviewer on every step to question the orchestrator's output; anything neither agent knows with certainty goes to the user as a question — the user is the one who knows the project.
- **Who it is for.** The maintainer's own projects, and anyone who wants to raise the quality of their projects and code. Open source, MIT.
- **One plugin, one line.** Every change must fit the whole plugin. A change that works locally but does not connect with the rest — a new rule that contradicts an old one, a concept renamed in one file and not the others — is the failure this repo guards against ("Frankenstein").

## Invariants — never change these

An agent never weakens any of these, even when a vague request would be easier to satisfy by doing so. If a request conflicts with one, stop and say which.

1. **No silent inference.** No product or design decision is assumed. When a run mode suppresses a question, the decision is recorded as an `A<n>` assumption, never guessed silently.
2. **Maker/checker split.** The agent that produces an artifact never judges it. The reviewer runs in fresh context and is read-only.
3. **The plugin never commits.** Every change a run makes is left for the user to review.
4. **The user chooses model and effort.** No subagent runs on a model or effort the user did not choose (the headless fallback is recorded as an assumption). Effort is set per agent definition, hence the `-<effort>` variants.
5. **Self-contained questions.** Every question states what the artifact says today and why it matters; internal ids (`F17`, `FR-004`) are only trailing trace tags.
6. **Neutral options.** The plugin never marks an option as recommended or pre-chosen, so the user reads and decides instead of accepting a default without thinking. This applies to the questions the plugin asks its users — not to how an agent interviews the maintainer (below), where recommending is expected.
7. **State on disk.** `loop-state.md` records flags, decisions, assumptions, findings and gate results; an interrupted run resumes instead of restarting.
8. **Done is proof.** The reviewer's `CLEAN` requires evidence per criterion; implement also requires the real test/lint/typecheck gate to pass.

## Repository map

- `skills/run/SKILL.md` — the orchestrator: flags, Hard rules, Model/effort protocol, Question protocol, phases. Always loaded when a run starts, so keep it lean.
- `skills/compat/SKILL.md` — report-only audit of a project's spec-kit against the contract.
- `agents/uroboros-{reviewer,implementer}-{low,medium,high,xhigh,max}.md` — thin variants that differ only in `effort`; they point to the role instructions.
- `references/reviewer-instructions.md`, `references/implementer-instructions.md` — the role bodies, including the `LOOP-REVIEW-FINDINGS` and `IMPLEMENTER-REPORT` contracts the orchestrator parses.
- `references/implement-protocol.md`, `goal-protocol.md`, `loop-report.md` — read by the orchestrator only when that part of the run arrives (progressive disclosure).
- `references/model-guides/<family>-<version>.md` — per-release prompting guidance (rules in CONTRIBUTING.md, item 5).
- `references/spec-kit-compat.md` + `.json` + `spec-kit-snapshot/` — the spec-kit contract; the `.md` and `.json` must stay in sync, and `hashes.json` is computed over LF content.
- `hooks/goal-gate.js` — goal-mode Stop hook. Node standard library only; it must allow the stop on any doubt and only ever keep the session that owns the run alive.
- `.claude-plugin/plugin.json`, `marketplace.json`, `README.md`, `CHANGELOG.md`, `CONTRIBUTING.md`.

## Design rules

- **One definition, referenced where used.** Define each rule completely in one place; at every point of use put a short reference to it (e.g. "round cap per step D") so the instruction is visible without being copied. Copies drift.
- **Progressive disclosure.** What only one phase or mode needs lives in `references/` and is read when that phase starts.
- **Prompts are English.** The plugin's artifacts and prompts are English; the plugin talks to its users in their language.
- **Contracts change deliberately.** Report formats, the `active-run.json` marker and `spec-kit-compat.json` change additively when possible; any change to them is at least a minor release and is named in the CHANGELOG.
- **Verify claims in the same session.** Anything a prompt states about how Claude Code, spec-kit or a model behaves is checked against the official docs or the installed files before it is written. Quotes carry their source, and a source's advice is applied only at the scope the source states (a tip for one model release stays in that release's guide).
- **No slop.** Before finishing, remove: the same rule restated in several places, parentheticals accreted release after release, references to renamed files or tools, claims without a source, quotation marks around text the source does not contain, and dates or numbers nobody verified.

## How a change is made

1. **Decide whether to ask.** An agent fixes typos, broken or stale references, and documentation that disagrees with what the plugin already does, without asking. Everything that changes what the plugin does, asks or decides goes through steps 2–3, however vague or small the request.
2. **Interview the maintainer.** Use `AskUserQuestion` for choices (at most 4 questions per call, the recommended option first, labeled as recommended) and free text for open "why" questions. Put every definition a question depends on inside the question text itself — text sent before the call may not be seen.
3. **Show the plan and the draft text**, and get an explicit approval before editing.
4. **Edit, then sweep for coherence.** Grep every concept the change touched across the whole repo — prompts, references, agents, README, CONTRIBUTING, CHANGELOG, manifests, compat contract, hook — and update or report each mention. Re-read the full flow of every file you changed.
5. **Verify.**
   - Always: every JSON parses, `node --check hooks/goal-gate.js`, and — if the hook changed — its allow/block cases run against sample markers.
   - Minor and major releases: a full run of [uroboros-testbed](https://github.com/NicolasET/uroboros-testbed) against the release candidate (`npm run testbed -- --uroboros ../uroboros`), committed there as `results/<version>/`; the release notes link that result. A run cut short by the account's usage limit is re-run, never published.
6. **Leave the changes uncommitted** until the maintainer asks to release.

## Releasing

- **Version.** Minor when behavior changes: a new capability, a change to what the plugin asks or does, or a contract change. Patch for wording, documentation drift, and bugs that do not change the flow.
- **Files.** Bump `.claude-plugin/plugin.json`; add a dated `## x.y.z — YYYY-MM-DD` section at the top of `CHANGELOG.md` (bold lead per bullet, saying what changed and why); update the README where the behavior is user-visible. A spec-kit line adoption follows the re-verification procedure in `references/spec-kit-compat.md`.
- **Publish.** Commit directly on `main` with the subject `<summary> (x.y.z)` and a short bullet body — no `Co-Authored-By` or `Claude-Session` trailers. Push, create the lightweight tag `vX.Y.Z` and push it, then `gh release create vX.Y.Z --title "X.Y.Z" --latest` with that version's CHANGELOG section as the notes.

## Working with the maintainer

- Talk to the maintainer in Spanish; everything written to the repo stays in English.
- When this file's rules change — an invariant, the process, a design rule — update AGENTS.md in the same change and keep it under 200 lines.
