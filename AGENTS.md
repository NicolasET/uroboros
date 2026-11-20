# AGENTS.md — working on the Uroboros plugin

This file is for coding agents changing this repository. It is the source of truth for what Uroboros is for, what must never change, and how a change is made and released. Human contributors: see [CONTRIBUTING.md](./CONTRIBUTING.md).

## What Uroboros is, and why

A Claude Code plugin that takes one raw idea to working code: intake asks every decision the idea leaves open, `goal.md` states what done means, an implementer builds it, a reviewer judges it and a verifier uses the product. The size of the idea — small, medium or large — sets how much of that runs. It needs no other tool.

- **The problem.** AI builds well but does not always account for everything it was asked. Writing down what done means reduces that, but reading every artifact an agent produces is tedious. Uroboros puts an independent reviewer on every step to question the orchestrator's output; anything neither agent knows with certainty goes to the user as a question — the user is the one who knows the project.
- **Who it is for.** The maintainer's own projects, and anyone who wants to raise the quality of their projects and code. Open source, MIT.
- **One plugin, one line.** Every change must fit the whole plugin. A change that works locally but does not connect with the rest — a new rule that contradicts an old one, a concept renamed in one file and not the others — is the failure this repo guards against ("Frankenstein").
- **Where it came from.** Until 0.32.0 it drove GitHub Spec Kit's six-phase pipeline. 1.0.0 removed that at the maintainer's decision; do not bring spec-kit back as a dependency or an option.

## Invariants — never change these

An agent never weakens any of these, even when a vague request would be easier to satisfy by doing so. If a request conflicts with one, stop and say which.

1. **No silent inference.** No product or design decision is assumed. When a run mode suppresses a question, the decision is recorded as an `A<n>` assumption, never guessed silently.
2. **Maker/checker split.** The agent that produces an artifact never judges it. The reviewer runs in fresh context and is read-only; the verifier uses the product and never edits it. The maker never edits what judges it, and the checkers read the rules as they were before the change.
3. **The plugin never commits.** Every change a run makes is left for the user to review. Working-tree snapshots write tree objects only — no commit, no ref, and the user's index is never touched.
4. **The user chooses model and effort.** No subagent runs on a model or effort the user did not choose (the headless fallback is recorded as an assumption). Model and effort are passed on every dispatch.
5. **Self-contained, plain questions.** Every question states what is there today and why it matters, in everyday words and with the user's own names for things; internal ids (`F17`, `AC-4`) are only trailing trace tags.
6. **Neutral options.** The plugin never marks an option as recommended or pre-chosen, so the user reads and decides instead of accepting a default without thinking. This applies to the questions the plugin asks its users — not to how an agent interviews the maintainer (below), where recommending is expected.
7. **State on disk.** `loop-state.md` records flags, decisions, assumptions, findings and gate results; an interrupted run resumes instead of restarting.
8. **Done is proof.** The reviewer's `CLEAN` requires evidence per criterion; the code also requires the real gate (the project's checks) to pass and each acceptance criterion and the probes of its rules to pass when the product is used. This holds for every size.
9. **What the user typed stays on their machine.** The idea, the user's messages and their answers as typed go only to the private record inside `.git`. Every file a run writes in the project holds the run's neutral restatement — except `goal.md`'s Literals, the exact strings the product must show.

## Repository map

- `skills/run/SKILL.md` — the orchestrator's standing rules: hard rules, the private record, the marker, flags, start and resume, what each size runs. Always loaded and re-attached after a compaction, so it stays under 5,000 tokens with the most important rules first.
- `references/intake-protocol.md`, `question-protocol.md`, `model-protocol.md`, `loop-protocol.md`, `plan-protocol.md`, `implement-protocol.md`, `verify-protocol.md`, `parts-protocol.md`, `loop-report.md` — one protocol per stage, read by the orchestrator when that stage starts. Each is linked directly from `SKILL.md`'s table.
- `references/reviewer-instructions.md`, `references/refuter-instructions.md`, `references/implementer-instructions.md`, `references/verifier-instructions.md` — the role bodies, including the `LOOP-REVIEW-FINDINGS`, `LOOP-REFUTER-RESULTS`, `IMPLEMENTER-REPORT` and `VERIFIER-REPORT` contracts the orchestrator parses.
- `agents/uroboros-{reviewer,implementer,verifier}.md` — one thin agent per role; it points to the role instructions and its frontmatter is only the headless fallback, since model and effort are passed on every dispatch; the reviewer agent also runs the refuter role.
- `references/model-guides/<family>-<version>.md` — per-release prompting guidance (rules in CONTRIBUTING.md, item 5).
- `hooks/goal-gate.js` — Stop hook that keeps a run alive; `hooks/resume-context.js` — SessionStart (`compact`) hook that names the files the owning session re-reads; `hooks/no-recommended.js` — PreToolUse hook that refuses a run's `AskUserQuestion` with an option marked as recommended (invariant 6). Node standard library only; on any doubt they allow the stop or emit nothing, and they only ever act for the session that owns the run.
- `scripts/check-coherence.js` — the repo's coherence check (step 5), derived from the files themselves: cited paths exist, one thin agent per role, the report values prompts cite match the templates, JSON parses, hooks pass `node --check`, manifest vs CHANGELOG version, documented flags. Node standard library only.
- `evals/` — a small `claude plugin eval` suite: requests that must and must not start the run skill. It guards the skill's description; it does not replace the testbed.
- `.claude-plugin/plugin.json`, `marketplace.json`, `README.md`, `CHANGELOG.md`, `CONTRIBUTING.md`.

## Design rules

- **One definition, referenced where used.** Define each rule completely in one place; at every point of use put a short reference to it (e.g. "round cap per step D") so the instruction is visible without being copied. Copies drift.
- **Progressive disclosure.** `SKILL.md` holds what is true for the whole run; what one stage needs lives in that stage's protocol in `references/`. A reference file is linked from `SKILL.md`, never only from another reference file, and one longer than 100 lines opens with its contents.
- **Variables live in `SKILL.md`.** Claude Code substitutes `${CLAUDE_PLUGIN_ROOT}` and the session id only there. A reference file may write the plugin root variable in a path — `SKILL.md` says what it stands for — and never the session id.
- **Prompts are English.** The plugin's artifacts and prompts are English, except the product's literals — exact messages, labels, examples — which travel verbatim in the user's language; the plugin talks to its users in their language.
- **Contracts change deliberately.** Report formats and the `active-run.json` marker change additively when possible; any change to them is at least a minor release and is named in the CHANGELOG.
- **Anthropic's recommendations first.** Where Anthropic's documentation for Claude Code or its models recommends something, the plugin follows it; where it is silent, name the source used instead; where the plugin departs (invariant 1 asks where the docs would let the model decide), say so.
- **Verify claims in the same session.** Anything a prompt states about how Claude Code or a model behaves is checked against the official docs or the installed files before it is written. Quotes carry their source, and a source's advice is applied only at the scope the source states (a tip for one model release stays in that release's guide).
- **No slop.** Before finishing, remove: the same rule restated in several places, parentheticals accreted release after release, references to renamed files or tools, claims without a source, quotation marks around text the source does not contain, and dates or numbers nobody verified.

## How a change is made

1. **Decide whether to ask.** An agent fixes typos, broken or stale references, and documentation that disagrees with what the plugin already does, without asking. Everything that changes what the plugin does, asks or decides goes through steps 2–3, however vague or small the request.
2. **Interview the maintainer.** Use `AskUserQuestion` for choices (at most 4 questions per call, the recommended option first, labeled as recommended) and free text for open "why" questions, in as many rounds as it takes. Put every definition a question depends on inside the question text itself — text sent before the call may not be seen.
3. **Show the plan and the draft text**, and get an explicit approval before editing.
4. **Edit, then sweep for coherence.** Grep every concept the change touched across the whole repo — prompts, references, agents, README, CONTRIBUTING, CHANGELOG, manifests, hooks — and update or report each mention. Re-read the full flow of every file you changed.
5. **Verify.**
   - Always: `node scripts/check-coherence.js` passes (it also parses every JSON and runs `node --check` on the hooks), and — if a hook changed — its allow/block cases run against sample markers. A false alarm is fixed in the check, never by bending the repo to it.
   - Minor and major releases: a full run of [uroboros-testbed](https://github.com/NicolasET/uroboros-testbed) against the release candidate (`npm run testbed -- --uroboros ../uroboros`), committed there as `results/<version>/`; the release notes link that result. A run cut short by the account's usage limit is re-run, never published.
6. **Leave the changes uncommitted** until the maintainer asks to release.

## Releasing

- **Version.** Minor when behavior changes: a new capability, a change to what the plugin asks or does, or a contract change. Patch for wording, documentation drift, and bugs that do not change the flow. Major when something a user relies on is removed.
- **Files.** Bump `.claude-plugin/plugin.json`; add a dated `## x.y.z — YYYY-MM-DD` section at the top of `CHANGELOG.md` (bold lead per bullet, saying what changed and why); update the README where the behavior is user-visible.
- **Publish.** Commit directly on `main` with the subject `<summary> (x.y.z)` and a short bullet body — no `Co-Authored-By` or `Claude-Session` trailers. Push, create the lightweight tag `vX.Y.Z` and push it, then `gh release create vX.Y.Z --title "X.Y.Z" --latest` with that version's CHANGELOG section as the notes.

## Working with the maintainer

- Talk to the maintainer in Spanish; everything written to the repo stays in English.
- When this file's rules change — an invariant, the process, a design rule — update AGENTS.md in the same change and keep it under 200 lines.
