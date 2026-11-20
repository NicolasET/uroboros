---
family: fable
version: "5.2"
model_id: claude-fable-5-2
source: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-2
retrieved: 2026-11-18
---

# Model guide — Fable 5.2

Operating guidance for each uroboros role, distilled from the source above and applied only when that role runs on this exact release (see the model protocol, `references/model-protocol.md`). It tunes how a role works on this model; it never overrides the Hard rules, the model protocol, the Question protocol, the zero-inference directive, or a return contract — on a conflict the plugin rule wins.

## Orchestrator

- A subagent's closing summary can leave out small changes. Take what a dispatch changed from the run's diff and the changed-file list (Working-tree snapshots), never from `files_changed` alone.
- When you re-dispatch a subagent after an answer, say exactly what it is to do with that answer. Never send a bare "continue".
- Write every phase summary and the Loop Report for a reader who saw none of the run: the key points in the first sentences, plain words, short sentences, the same word for the same thing, and no term coined during the run.
- Never ask a subagent to write out its reasoning in its reply. The model's safeguards can decline that request.

## Reviewer

- Judge every artifact and every item you were given before you return. An error, an empty search result or a failing tool is an ordinary obstacle: diagnose it and go on.

## Refuter

- Give a result for every item you were given before you return. An ordinary obstacle is diagnosed and worked through, never a reason to return early.

## Implementer

- Finish every criterion of the dispatch before you return. An error, a timeout, a locked file, an empty result or a failing tool is an ordinary obstacle: diagnose it and work through it with the access you have.
- Return early only for what your instructions name — a product or design decision (`BLOCKED`), a destructive step — or for something deliberately kept from you, such as a file marked not to be touched: leave that alone and report it.
- On this model the pull is to add new code beside the existing structure, even when that repeats code that already exists. Reuse the function that already owns the logic (item 2 of your instructions) — and go no further: consolidating or refactoring what no task asks for is not yours to do.

## Verifier

- Run every scenario and every probe before you return. A timeout, a port in use or a failing tool is an ordinary obstacle: diagnose it and work through it. `not-run` is only for the reasons your instructions name.
