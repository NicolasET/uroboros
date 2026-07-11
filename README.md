# Uroboros

**Zero-inference loop engineering for [GitHub Spec Kit](https://github.com/github/spec-kit).**

You give one raw idea. Uroboros runs the entire Spec-Driven Development pipeline — `specify → clarify → plan → tasks → analyze → implement` — end to end, auto-advancing between phases. After every phase, an independent reviewer interrogates the artifact and converts **every inferred, assumed, or defaulted decision into an explicit question to you**. Neither agent is ever allowed to guess a product or design decision.

You seed the idea once and answer questions. That's the whole interface.

> *The uroboros is the serpent that eats its own tail: a loop. This one also refuses to swallow assumptions.*

## Why

Coding agents are optimized to keep moving: they make "informed guesses," accept "reasonable defaults," and declare themselves done. That momentum is exactly how your idea drifts away from what gets built. Uroboros inverts the incentive:

- **Zero inference.** Any gap or ambiguity in scope, behavior, data, UX, or architecture becomes an `AskUserQuestion` — never a silent assumption.
- **Maker/checker split.** The agent that produces an artifact is never the one that judges it. A fresh-context reviewer audits every phase ([the single most useful structural trick in a loop](https://addyosmani.com/blog/loop-engineering/)).
- **Done is proof, not a claim.** On implement, the orchestrator runs your real test/lint/typecheck suite as a hard gate; on design phases, the reviewer's `CLEAN` verdict requires positive evidence per success criterion — "found nothing to flag" is not a pass.
- **The repo remembers.** A per-feature `loop-state.md` records every finding, resolution, accepted risk, and gate result. Interrupted runs resume instead of restarting.

## What's inside

| Component | Role |
|---|---|
| `/uroboros` (command) | **Agent A — orchestrator.** Intake → branch → all six phases → final Loop Report. The only agent that talks to you, edits artifacts, and advances. |
| `uroboros-reviewer` (subagent) | **Agent B — checker.** Fresh context, read-only. Interrogates each phase artifact per a phase profile; returns structured findings; `CLEAN` requires evidence. |
| `uroboros-implementer` (subagent) | **Agent C — maker.** Fresh context, write-capable, used only in implement. Runs on a **model + effort you choose at runtime** (the orchestrator asks right before implement). Reports ambiguities instead of guessing. |

## Prerequisites

- **Claude Code** (recent version, with plugins support).
- A repo initialized with **GitHub Spec Kit** using the Claude integration in **skills mode** — the `speckit-specify` … `speckit-implement` skills must exist (`specify init --here --integration claude`).
- Optional: spec-kit's **git extension** (`specify extension add git`) for automatic feature-branch creation. Without it, Uroboros continues branchless.

## Install

```
/plugin marketplace add nicolaset/uroboros
/plugin install uroboros@uroboros
```

Restart Claude Code after installing (subagents load at startup).

## Usage

Start a feature from a raw idea (any language — the pipeline's internal artifacts are English; questions come to you in your language):

```
/uroboros I want sellers to be able to pause a listing without losing its ranking...
```

The flow you'll experience:

1. **Intake.** Uroboros interrogates your idea (goal, scope in/out, entities, done-criteria), drafts an English `specify` prompt, and asks for your approval.
2. **Phases 1–6.** Each phase runs, the reviewer audits it, and its findings arrive to you as multiple-choice questions (free-form always allowed). Your answers are folded back into the artifact; the reviewer re-verifies; the loop advances only on `CLEAN`-with-evidence.
3. **Implement.** You're asked which model and reasoning effort the implementer should use for this run. The implementer writes the code; the orchestrator runs your real verification suite as a hard gate; the reviewer audits the diff; fixes are re-dispatched to the implementer. Red gate = not done, period.
4. **Loop Report.** A legible delta: per phase, what changed and why; the full decision log; the gate results; everything left **uncommitted** for you to review and commit.

Interrupted? Run `/uroboros` with no arguments — the resume check picks up from the last incomplete phase recorded in `loop-state.md`.

## Configuration

- **Reviewer model/effort:** edit the frontmatter of `agents/uroboros-reviewer.md` (`model:` / `effort:`). It is the single source of truth; the orchestrator passes it explicitly on dispatch. Default: `claude-opus-4-8` at `effort: max` — the reviewer is the quality gate, so it ships strong. Downgrade effort before downgrading the model if cost bites.
- **Implementer model/effort:** chosen at runtime, every run, via the blocking question. The frontmatter values are only a fallback.
- **Commit policy:** Uroboros never commits. All changes are left for you, by design.
- **`loop-state.md`:** lives in the feature directory next to `spec.md`. Keep it as run history, or gitignore `**/loop-state.md`.

## Design notes & credits

- The loop architecture follows [Addy Osmani's *Loop Engineering*](https://addyosmani.com/blog/loop-engineering/) — maker/checker separation, state on disk ("the agent forgets, the repo doesn't"), and verification gates that can actually fail work. One deliberate departure: where generic loop advice says *"make a sensible assumption and keep going,"* Uroboros does the opposite. Assumptions are the failure mode it exists to eliminate.
- Built on top of [GitHub Spec Kit](https://github.com/github/spec-kit)'s SDD workflow and skills.
- The maker/checker/orchestrator trio maps to Claude Code subagents: the reviewer is read-only tooling by construction; the implementer reports `BLOCKED` rather than guessing.

## License

MIT — see [LICENSE](./LICENSE).
