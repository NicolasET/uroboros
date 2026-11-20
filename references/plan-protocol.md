# Plan protocol — the technical plan of a large run

Read on a large run, when `goal.md` is CLEAN-with-evidence, before any implementer is dispatched.

A large run settles its technical design before code, while a wrong choice is still cheap to change. You write `.uroboros/<slug>/plan.md`; the reviewer judges it (`PHASE: plan`, loop protocol); no implementer is dispatched before it is CLEAN-with-evidence. Small and medium runs have no plan: there the implementer follows the criteria and the codebase's conventions, and reports `BLOCKED` on a choice that is not its to make.

## Before writing

Explore the code the acceptance criteria touch (Grep/Glob/Read). For each new piece, find the existing mechanism it should build on and the file that shows the pattern to follow; a piece that would duplicate an existing mechanism is built on that mechanism instead.

A technical choice the record does not settle, whose alternatives differ in what the user or the data would see, is not yours to make: ask it before you write it, per the question protocol, the refuter first (`Q<n>`). *(When the run mode suppresses the question — `--auto` always, `--only-business` for a choice with no user-visible difference — resolve it by the assumption mechanism.)* A choice with no such difference is yours: write it under Decisions as chosen by the run.

## `plan.md`

The plan states the technical design at the level a reviewer can judge and an implementer can follow without it choosing for them: the effects a user sees in full, the incidental implementation not at all. It is written in English and names each thing by the term the artifacts use (intake protocol, Project records). Its sections:

- **Approach** — each new piece, the existing mechanism it builds on, and the file that shows the pattern to follow.
- **Data** — each stored thing added or changed, with its source (`AC-<n>` or `D<n>`).
- **Decisions** — each technical choice, the alternatives considered, and who chose: the user (`D<n>`), the record (cited), or the run.
- **Risks** — integration failures, the security and privacy surface, performance cliffs; and each risky step with how it is retried or undone when it fails — one that cannot be undone is marked so.
- **Work order** — two to five groups `G<n>`, each named by its outcome, with the `AC-<n>` it covers, how that outcome is checked (a command or a behavior to observe) and `after: G<k>` when it needs another group first. Every `AC-<n>` is in a group. `expects:` lists the files a group is expected to touch — for planning waves only; it binds no implementer.
- **How to run it** — the commands that start the product and exercise each group's outcome, each with the result it should show.

The plan stands on its own: an implementer that has read only `goal.md` and `plan.md` can follow it.

## Review and fold

Dispatch the reviewer with `PHASE: plan` and go through steps B to E of the loop protocol, with the round cap of step D. You fold the answers into `plan.md`. An answer that changes an acceptance criterion is folded into `goal.md` too, citing its `D<n>`; the next review round verifies both.

## Once the plan is CLEAN

- `plan.md` is a judging source: it changes only through you — a fold, verified by the next review — never through the implementer (implement protocol, step A, item 2).
- The implementer receives `PLAN_FILE` and works group by group in the plan's order; under `--parallel=N` the groups are the waves' units (implement protocol, Waves).
- The verifier starts the product with *How to run it* until a verification records its own `VERIFY COMMANDS` (verify protocol, V1).
- When the build shows the plan wrong — a `BLOCKED` item, a deviation the implementer reports — fold the plan first, then re-dispatch.
