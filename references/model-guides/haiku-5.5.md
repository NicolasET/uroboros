---
family: haiku
version: "5.5"
model_id: claude-haiku-5-5
source: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-haiku-5-5
retrieved: 2026-11-18
---

# Model guide — Haiku 5.5

Operating guidance for each uroboros role, distilled from the source above and applied only when that role runs on this exact release (see the model protocol, `references/model-protocol.md`). It tunes how a role works on this model; it never overrides the Hard rules, the model protocol, the Question protocol, the zero-inference directive, or a return contract — on a conflict the plugin rule wins.

## Orchestrator

- Keep working until the run is done, and stop to ask only where the protocol defines a question or before a risky step. In a long prompt such as this one, this model can stop early and hand the work back.

## Reviewer

- The source has no guidance specific to this role.

## Implementer

- Keep working until every criterion of the dispatch is done. Stop to return only when you cannot go on without a decision (`BLOCKED`) or before a risky step.
- When the criteria of the dispatch are done and checked, stop and report. Do not add features, docs or refactors that no criterion asks for. If you think one would help, say so in `notes` instead of doing it.
- Before you report `DONE`, run a real check that exercises each change: the tests that cover your criteria, the type-checker or the build. A syntax-only check, or a command that failed to start, does not count. If no real check can run here, say in `notes` which one you did not run and why.

## Verifier

- A check that failed to start is not a result. A scenario whose command did not run is `not-run` with the reason, never `pass`.
