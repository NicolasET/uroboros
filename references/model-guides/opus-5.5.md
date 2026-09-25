---
family: opus
version: "5.5"
model_id: claude-opus-5-5
source: https://claude.dev/blog/getting-the-most-out-of-opus-5-5/
retrieved: 2026-09-25
---

# Model guide — Opus 5.5

Operating guidance for each uroboros role, distilled from the source above and applied only when that role runs on this exact release (see the Model/effort protocol in `skills/run/SKILL.md`). It tunes how a role works on this model; it never overrides the Hard rules, the Model/effort protocol, the Question protocol, the zero-inference directive, or a return contract — on a conflict the plugin rule wins.

## Orchestrator

- Give each dispatch the whole task in one prompt: every path, the DECISION LOG, and the answers or fixes to fold. Never rely on a follow-up message to complete a dispatch.
- End every implementer dispatch with one line stating what done means: `Done means: <the task or AC ids of this dispatch> implemented, <the recorded gate commands> pass, no open BLOCKED item.`
- Never write "think carefully", "think step by step" or similar in a dispatch or a question — the model always thinks before it replies and decides how much.
- Never ask a subagent to reproduce or show its internal reasoning. It trips the model's safeguards, which can reroute the request to an older model.
- At intake, when the idea has user-visible UI, ask for a concrete list of patterns to avoid (e.g. cream backgrounds, italic accent words, numbered labels, monospace styling, pill-shaped buttons) instead of accepting "not generic" or "clean". Carry the list into the specify prompt — `goal.md` constraints in goal mode — as explicit constraints. It is a question like any other: the run-mode rules apply.

## Reviewer

- On implement and goal-implement reviews, report only problems you would block the merge for. A silently inferred product/design decision always counts as blocking.
- For each such finding, `location` gives the file and line, and `why` says why it is wrong and how to show it fails — a command, an input, or a test.
- For a premise you could not confirm, say in `current:` where you looked.

## Implementer

- The prompt holds the whole task. When a step does not need a user decision, keep going.
- Stop only when you cannot continue without a product/design decision (report `BLOCKED`) or before anything destructive (report it in `notes` instead of running it).
