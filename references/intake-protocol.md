# Intake protocol — from the idea to `goal.md`

Read in full on a fresh run and on a resume during intake. Its first section, Project records, is read at every start.

## Contents

- Project records — the version line, the project notes, the glossary
- The intake draft
- Step 1 — the idea
- Step 2 — the blind-spot pass and the size
- Step 3 — the decision tree
- Step 4 — the rounds of questions
- Step 5 — the shared-understanding check
- Step 6 — `goal.md`
- Branch, state file and marker

## Project records

**Plugin version — the `UROBOROS:` line.** Read `version` from `${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json` at the start of every run, fresh or resumed. A fresh run records `UROBOROS: <version>` in the intake draft, and the last section of this protocol copies it to `loop-state.md`. A resume compares it with the last version on that line and, when it differs, appends `; resumed on <version> at <point>` — the point being resumed: `intake`, `goal`, `plan` or `round <n>`. A state file or intake draft without the line was started before 0.16.1: write `UROBOROS: before 0.16.1; resumed on <version> at <point>`. The Loop Report states it.

**Project notes — `.uroboros/project-notes.md`.** Technical facts earlier runs found about this project, so a run does not rediscover them: gate commands, `VERIFY COMMANDS`, setup traps, flaky tests. Facts about the project only — never about the machine the run happened on (a tool installed or missing there, its operating system, a path outside the project), and never a decision, a preference or a guess. One entry per line: `- N<n> <the fact> (seen <feature>, <date>; verified by <how>)`.

- **Read** it at the start of every run, fresh or resumed. Step A2 consults it before discovering the gate commands, and verify V1 before passing `RUN_COMMANDS: none`. Before you rely on an entry, verify it again the way it says; an entry that no longer holds is corrected or removed at the end of the run.
- **Write** it at the end of the run, without a question, in every mode — what the run verified, not what it assumed. The Loop Report lists each entry added, changed or removed. The file is left uncommitted like every other change.

**Project glossary — `.uroboros/glossary.md`.** The names the user gives the product's things — screens, states, roles, actions, entities — so every question calls each thing what the user calls it and every artifact keeps the names earlier ones used. Names only — never a decision, a fact about the code, or a sentence the user wrote. One entry per line: `- <the user's term> → <the term the artifacts use> — <what it is, in one line> (from <feature>, <date>)`.

- **Read** it at the start of every run, fresh or resumed. The question protocol uses the user's terms (Call things what the user calls them); `goal.md` and `plan.md` use the artifacts' terms.
- **Write** it at the end of the run, without a question, in every mode: add each thing of this feature the user named, with the term the artifacts gave it; when the user named a thing differently this run, rewrite its entry with their new word. The Loop Report lists each entry added or changed. The file is left uncommitted like every other change.

## The intake draft — `.uroboros/intake.md`

The feature has no folder until the last section, so intake keeps its working state in `.uroboros/intake.md`: `SESSION: <this session's id>` (a resume rewrites it with its own id; the question hook reads it), `PRIVATE RECORD: <its path>`, the `UROBOROS:` line, ACTIVE FLAGS, `LANGUAGE`, `EARLIER FEATURES`, the model/effort choices, `IDEA ITEMS`, `SURFACES`, `READERS` and `SIZE` (step 2), the decision tree (settled and open nodes), the DECISION LOG, the ASSUMPTION LOG and, at the end, `GOAL DRAFT` (step 6). It exists from the start of the run, with its `SESSION:` line (SKILL.md, Phase −1); fill it after step 2 and rewrite it after every round.

The draft holds your restatements only. What the user typed — the idea, each message, each answer — goes to the private record (hard rule 9), which is `…/uroboros/private/intake-<this session's id>.md` until the last section renames it for the feature. The draft's `PRIVATE RECORD:` line holds its path, so a resume by another session finds it.

## Step 1 — The idea

Read the idea. If it references files (e.g. `@docs/something.md`), read them. Write the idea to the private record as `IDEA`, as typed. Record the language the idea is written in as `LANGUAGE: <language>` — every question of the run uses it (question protocol, Plain words).

The model/effort choices were settled at the start of the run (model protocol). Never dispatch the reviewer or the refuter before the reviewer's choice is recorded: the refuter runs on it from the first intake round (question protocol, The record answers first).

## Step 2 — The blind-spot pass and the size

Before interrogating, explore the codebase around the idea (Grep/Glob/Read) and surface the user's **unknown unknowns**: prior work in the same area, existing invariants or conventions the idea touches, and decisions the idea silently implies that the user has probably not considered. Turn what you find into questions in step 4 — the point of intake is to surface decisions before they get expensive, not to fill a checklist.

- **Idea items.** Each separate thing the idea asks for is an `I<n>`. Write the user's words for it, quoted, in the private record's `IDEA ITEMS`, and your neutral restatement of it in the draft's `IDEA ITEMS`. A user message that asks for one more thing adds an `I<n>`; its fold is verified like any fold. `goal.md` is measured against them (reviewer instructions, Coverage).
- **Surfaces.** A change can work on the path the user described and be missing everywhere else. List the project's **surfaces** — where a behavior can be reached or seen: routes or endpoints, CLI commands, UI entry points (pages, menus, shortcuts), background jobs, roles, public and admin views, exports, docs — and record the ones the idea could touch as `SURFACES` in the intake draft. Which of them the feature covers is a family of decisions: ask it as one rule before its instances (question protocol), and record each surface as in scope or out of scope.
- **Readers of a new state.** When the idea gives something that already exists a new state (paused, archived, learning, locked, hidden), list every existing feature that reads or acts on it — searches and lists, detail views, actions on it (orders, edits), scheduled jobs, notifications, exports, other features' rules — and record them as `READERS` in the intake draft. How they treat the new state is one family of decisions: ask it as one rule before its instances (question protocol), and record for each reader the rule or its exception.

**Size — sets the route.** With what the pass found, score the idea on three signals and take the largest size any signal reaches:

| Signal | small | medium | large |
|---|---|---|---|
| Reach | configuration, copy or one module | new behavior in one flow or surface | several flows, surfaces or systems that depend on each other |
| Risk | no item of the risk list | one item | stored data migrated or reshaped, a step that cannot be undone, or two or more items |
| Open technical design | none: the change is obvious once the code is read | one choice to make | several, or approaches that differ in what the user or the data would see |

**Risk list:** stored data or an effect that cannot be undone; security or permissions; a contract others consume (a public API, a shared interface, an export); concurrency; delivery or environment.

Counts of files, lines or tests never decide the size. Record it in the draft as `SIZE: <size> — <the signal that set it>: <the fact behind it> (set by the run)`, and tell the user the size and that signal in one line. The size is your classification, never a decision: step 5 states it for the user to correct, and a size the user gives is theirs (`set by the user`). An answer during intake that changes a signal changes the size: record the new one the same way. *(Under `--auto`: recorded as `A<n>`.)* What each size runs: SKILL.md, The run, by size. A size that proves too small after intake: loop protocol.

## Step 3 — The decision tree

Map every open decision and the decisions that hang off it: goal/why, users/roles, in/out scope for v1 — what stays out stated explicitly, key entities/data, what "done" means, hard constraints, **failure behavior** (what happens on error, invalid input, missing data, concurrent or repeated actions), **edge cases** (empty, first-time, limits, permissions revoked mid-flow), **the way back** (every new state the idea creates — paused, hidden, archived, locked — needs a way out and a way for the user to see it) — plus everything the blind-spot pass surfaced. Do **not** choose a tech stack at intake.

**On a small run** the tree holds only the decisions the idea's words and the blind-spot pass leave open; the other branches of that list are not walked.

**Too big for one run?** If the tree holds several features that could ship independently, ask the user whether to split the idea — *One feature* / *Split: the other parts run at the same time, each in its own session and worktree* / *Split: only one part now* — and which part this session carries. With parts to run at the same time, read `${CLAUDE_PLUGIN_ROOT}/references/parts-protocol.md` and follow it; otherwise the rest goes to **Out of scope** as future runs. *(Under `--auto`: take the smallest coherent slice, record `A<n>`; no part session starts.)*

## Step 4 — The rounds of questions

Interrogate in rounds with `AskUserQuestion` (questions in the user's language, per the question protocol). A round is the **frontier**: every decision whose prerequisites are already settled — nothing else. A question whose answer hinges on another question still open belongs to a later round, never the same one. Within the frontier, **ask first what would change the architecture or the data model**; ask failure behavior and edge cases as rules before their instances (question protocol); split a frontier larger than 4 across consecutive calls. After each round, update the tree, the draft and the private record, recompute the frontier, and ask the next round; later rounds must ask what earlier answers unblocked, not a pre-written list. Each round goes to the refuter before it is asked (question protocol, The record answers first).

Intake has no round cap: rounds go on until the frontier is empty — every branch visited, nothing silently assumed.

- **Facts are yours, decisions are the user's.** When a question needs a fact the repo can answer (does X exist, how is Y done today, what does Z return), look it up with Grep/Glob/Read instead of asking. Only the questions that depend on that fact wait for it; ask the rest of the frontier now.
- **Invite references.** In the first round, ask whether existing code, a mockup, or a library already does something close to what they want — source code is the highest-fidelity input; read whatever they point at and carry it into `goal.md` as explicit references.
- **Values are written, then confirmed as one list.** An open question that would be a `value` (reviewer instructions, `weight`) is not asked on its own. Write the value the record gives — the idea or the user's messages, a reference or mockup the user pointed at, the product's current copy or conventions, the glossary, an earlier feature — with its source; when nothing gives one, write a value marked *no source — chosen by the run*. After the last round and before step 5, ask them as one list (question protocol, Values are confirmed as one list). *(Under `--auto`: each is an `A<n>`.)*
- **"I don't know" is a valid answer.** Offer it as an option whenever the user may lack the answer, and never fill the decision in. Nothing after `goal.md` would ask it again, so it cannot stay open: before step 5, put each one back to the user with narrower, concrete options, one of them *Leave it out of this feature* (a `D<n>`, moved to **Out of scope**). Nothing undecided remains when step 5's summary is confirmed.
- **Ungrillable questions** — how something should look or feel, a layout, an interaction — cannot be settled by talking. Do not rephrase them round after round: ask once for a mockup, screenshot or reference to react to; if there is none, offer two or three sketched alternatives built from what the record says (question protocol, Show screens) with "I don't know"; if the user picks none, the decision is put back as the bullet above says.
- **Stop when.** Ask under which conditions the user wants the run to stop rather than go on (e.g. a schema migration turns out to be needed), with *None* as one option. "I don't know" here is recorded as `none`: with no condition named, the run stops only on its own rules. On a small run it is not asked: record `none`. *(Under `--auto`: `none`, recorded as `A<n>`.)*
- *(Under `--auto`: run the same rounds against yourself — the refuter still answers first — and resolve every question it leaves via the assumption mechanism. Under `--only-business`: still ask the business questions — user-visible failure behavior and edge cases are business; assume the technical ones.)*

## Step 5 — The shared-understanding check, intake's one confirmation

Before drafting `goal.md`, show the user, in their language, one summary: each idea item and where it goes (an acceptance criterion of this feature, out of scope with the answer that put it there, another part); the completion condition with its check and each acceptance criterion, in plain words; the decisions settled; what stays out of scope; the surfaces in and out of scope; how each reader treats the new state; the Stop when conditions; what the refuter answered from the record, with its source; and — on its own line, worded as your classification for the user to correct, never as something agreed — the run's **size** and the signal that set it, with what that size runs and its round cap.

It states only what the user decided, what the record answered, and what the idea says in words that admit one reading: a reading of the user's words that admits another — what "without losing its ranking" keeps: the score, or the position — is asked as a question in step 4 first, never stated here as settled. Ask via `AskUserQuestion` whether it matches what they want (Matches / Something is off). If something is off, reopen the affected branches and run more rounds; a size the user corrects is theirs, and an answer that does not mention the size keeps yours. Nothing is approved after this: `goal.md` is written from what this summary confirms. *(Skipped under `--auto` — record that it was skipped.)*

## Step 6 — `goal.md`

Draft `goal.md` in the intake draft as `GOAL DRAFT`, in English, from what step 5 confirmed. It states nothing the DECISION LOG, the earlier decisions it applies, the idea and the user's messages, or the items the record answered do not, and it names each thing by the term the artifacts use (Project records). It is not put to the user for approval. Its sections:

- **Goal condition** — one measurable end state with a **stated check**, verifiable from command output or observable behavior (e.g. "`npm test` exits 0 and `GET /listings/:id` returns `paused: true` after the pause call"), not from intent.
- **Acceptance criteria** — numbered `AC-1`, `AC-2`, …; each measurable and user-sourced. These are what the reviewer demands evidence for and what the verifier checks on the running product.
- **Constraints** — what must not change on the way there.
- **Stop when** — the conditions of step 4, in neutral words, or `none`.
- **Out of scope** — explicit, each line with the decision that put it there.
- **Surfaces** — each surface from `SURFACES`, in scope or out of scope.
- **Readers** — each reader from `READERS` and how it treats the new state, as recorded.
- **Literals** — every exact string, message, label, example, command or number the user gave for the product, in the language they gave it, under the line "These are exact: never translate or reword them."
- **References** — the code, mockups and libraries the user pointed at.

## Branch, state file and marker

1. Record the current branch and its commit as `BASE BRANCH: <name> @ <sha>` (`none` without git or on a detached HEAD), then create the feature branch with plain git (`git checkout -b goal/<slug>`); if git is unavailable, continue without a branch.
2. Create `.uroboros/<slug>/goal.md` from `GOAL DRAFT`, and `.uroboros/<slug>/loop-state.md` with the feature and its branch, and — copied from the intake draft — the `UROBOROS:` line, ACTIVE FLAGS, `LANGUAGE`, `EARLIER FEATURES`, the model/effort choices, `IDEA ITEMS`, `SURFACES`, `READERS`, `SIZE`, the DECISION LOG and the ASSUMPTION LOG so far, plus `BASE BRANCH` and an empty section per phase and round. Rename the private record to `<slug>.md` and record that path in the state file as `PRIVATE RECORD:`. Delete `.uroboros/intake.md` once the copy is written.
3. Write the marker (SKILL.md, The marker), with the round cap of SKILL.md (The run, by size) as its `rounds_max`. From this point the Stop hook keeps this session alive until you set a terminal status.
4. Tell the user in one line where `goal.md` can be read.

Then read the loop protocol. A medium or large run goes on with the review of `goal.md`; a small run goes straight to the build rounds.
