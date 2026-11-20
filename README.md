# Uroboros

**Zero-inference loop engineering for Claude Code.**

You give one raw idea. Uroboros takes it to working code: it asks you every decision the idea leaves open, writes down what "done" means, has one agent build it, a second one review it, and a third one use the finished product to check it. Neither agent is ever allowed to guess a product or design decision.

How much of that runs depends on the size of the idea. Changing the color of a button does not go through the steps a new feature with its own data does. Nothing else needs to be installed in your project.

> *The uroboros is the serpent that eats its own tail: a loop. This one also refuses to swallow assumptions.*

## Why

Coding agents are optimized to keep moving: they make "informed guesses," accept "reasonable defaults," and declare themselves done. That momentum is exactly how your idea drifts away from what gets built. Uroboros inverts the incentive:

- **Zero inference.** Any gap or ambiguity in scope, behavior, data, UX, or architecture becomes a question to you — never a silent assumption.
- **Questions you can actually answer.** Every question is self-contained: it tells you what is there today, why it matters, and offers the current value as an explicit option — never a bare internal id like "F17". No option is ever marked as recommended.
- **Maker/checker split.** The agent that produces something is never the one that judges it. A fresh-context reviewer audits every artifact ([the single most useful structural trick in a loop](https://addyosmani.com/blog/loop-engineering/)).
- **Done is proof, not a claim.** The orchestrator runs your project's own checks — its tests, linter, and type checker or build — as a hard gate; a check weakened to pass it is restored, never accepted; and a verifier then uses the built product, criterion by criterion. The reviewer's `CLEAN` requires evidence per criterion: "found nothing to flag" is not a pass.
- **Proportional.** The run sizes your idea as small, medium or large and tells you which; the size sets which steps run. You can correct it.
- **Fewer questions, none assumed.** A decision that surfaces in several places is asked once; a family of edge cases is asked as one rule first; what an earlier answer already settles is fixed citing that answer; and before any question reaches you, a second checker tries to answer it from what is already recorded. Every decision still comes from you.
- **The repo remembers.** A per-feature `loop-state.md` records every finding, resolution, accepted risk and gate result, so an interrupted run resumes instead of restarting, and later runs never ask again what you already decided.
- **Your words stay on your machine.** What you type — the idea, your messages, your answers — is kept inside `.git`, never in a file of the project. The files a teammate can see hold the decisions, restated.

## What's inside

| Component | Role |
|---|---|
| `/uroboros:run` (skill) | **The orchestrator.** Intake, the artifacts, every dispatch, the final Loop Report. The only agent that talks to you. You start it; Claude invokes it itself only in a session the plugin started for one part of a split idea (below). |
| `uroboros-reviewer` (subagent) | **The checker.** Fresh context, read-only. Audits `goal.md`, the plan and the code; `CLEAN` requires evidence. The same agent also runs as the **refuter**, which tries to answer each question from the record before it reaches you. |
| `uroboros-implementer` (subagent) | **The maker.** Fresh context, write-capable. Builds what the criteria ask and nothing else, declares anything visible it had to add that nobody asked for, and reports ambiguities instead of guessing. |
| `uroboros-verifier` (subagent) | **The checker that uses the product.** Runs commands and drives a browser but never edits the project. Starts the product on local hosts, calls its API or CLI and drives its UI, criterion by criterion, then probes each rule, error and edge, with evidence. |
| `references/` | The protocol of each stage and the instructions of each role, read only when its moment arrives, which keeps the always-loaded skill short. |
| `hooks/goal-gate.js` | **Keeps a run alive.** A Stop hook: while `.uroboros/active-run.json` records an active run, it relaunches the session that owns it when a turn ends with no subagent working (capped by `--rounds`). Inert in every other session. |
| `hooks/no-recommended.js` | **Neutral options.** A PreToolUse hook on `AskUserQuestion`: in the session that owns a run, it refuses a question with an option marked as recommended. Silent in every other case. |
| `hooks/resume-context.js` | **Compaction recovery.** A SessionStart hook for `compact`: it names the files the owning session re-reads, so it resumes from disk instead of from a summary. |

Each role is one agent. The model and the effort you choose are passed on every dispatch; the agents carry no rules of their own and read their instructions from `references/`.

## Prerequisites

- **Claude Code 2.1.292 or later**: the effort you choose for each subagent is passed on its dispatch, which older versions cannot do. A run on an older version stops before its first dispatch and says so.
- **Node.js** on your PATH, and an accepted workspace **trust dialog**: the three hooks are Node scripts registered for every session where the plugin is enabled. They exit immediately when no run is active; without Node, Claude Code shows a `hook error` notice each time a turn ends.
- **Git**, in practice: the feature branch, the snapshots that tell what a run changed, and the private record of what you typed all rely on it. Without git a run still works, with the fallbacks noted below.
- Optional: **[Claude in Chrome](https://code.claude.com/docs/en/chrome)** connected (or the Claude desktop app's built-in browser) so the verifier can drive a UI. Without a browser, the UI scenarios are listed before the run closes, and you choose whether to connect one and verify again or leave them unverified.

## Install

```
/plugin marketplace add nicolaset/uroboros
/plugin install uroboros@uroboros
```

Restart Claude Code after installing (subagents load at startup).

## Usage

Start from a raw idea, in any language (the run's artifacts are English; questions come to you in your language):

```
/uroboros:run I want sellers to be able to pause a listing without losing its ranking...
```

### What each size runs

| Step | small | medium | large |
|---|---|---|---|
| Questions at intake | only what your idea and the code leave open | the whole decision tree | the whole decision tree |
| One confirmation of what was understood | yes | yes | yes |
| `goal.md` reviewed before any code | no — judged with the code | yes | yes |
| A technical plan, reviewed before any code | no | no | yes |
| Implementer → your checks → reviewer | yes | yes | yes |
| Verifier uses the product | yes | yes | yes |
| Review rounds per step, at most | 2 | 3 | 3 |

The run decides the size from three signals and takes the largest one any of them reaches:

- **Reach**: configuration, copy or one module (small); new behavior in one flow or screen (medium); several flows, screens or systems that depend on each other (large).
- **Risk**: stored data or something that cannot be undone, security or permissions, a contract others consume, concurrency, delivery or environment. None is small, one is medium; a data migration, an irreversible step or two of them is large.
- **Open technical design**: none (small), one choice (medium), several or approaches you would notice the difference between (large).

Counts of files or lines never decide it. You are told the size and the signal that set it, and you can correct it when you confirm the summary. If the work later shows it was sized too small, you are asked whether to go on or to add the missing steps.

### The flow you'll experience

1. **Models.** One dialog asks which model and effort the reviewer and the implementer run on (skipped for the ones you pass by flag).
2. **Intake.** A **blind-spot pass** explores the codebase around your idea to surface what you would not think to mention — prior work, invariants your idea touches, decisions it silently implies. It lists each separate thing your idea asks for, sizes the idea, then asks in **rounds**: each round holds only the decisions whose prerequisites you already settled, architecture-changing ones first, for as many rounds as it takes. It covers scope, entities, failure behavior and edge cases, every place the behavior can be reached or seen, the way back from every new state, and how everything that already reads that thing treats the new state. Facts are looked up in the repo, not asked. An idea that is really several features is offered to be split. "I don't know" is accepted: the decision is never filled in — it comes back with narrower options, one of them leaving it out of the feature. Look and feel is asked with a mockup or with sketched alternatives. It ends with one summary of what it understood — the one thing you confirm. The details it wrote instead of asking (a text, a limit, an order) are in it, and the ones nothing you said gives are listed apart, as chosen by the run.
3. **`goal.md`.** The run writes what done means: one measurable end state with its check, numbered acceptance criteria, constraints, what is out of scope, and your exact strings (labels, messages) carried as you gave them. On a medium or large run the reviewer audits it before any code is written, and what it finds comes to you as questions.
4. **Plan** (large only). The run writes a short technical plan — approach, data, decisions, risks, and two to five groups of work with how each is checked — and the reviewer audits it. A technical choice you would notice the difference of is asked, not chosen.
5. **Build rounds.** Before any code, the orchestrator finds your project's checks and runs them once on the untouched tree; if they are already red you choose whether to fix them here, leave them out of this run's gate, or stop. The implementer writes the code. The orchestrator runs the checks as a hard gate — a red check is run again only to tell a flaky test from a broken one, never to turn it green. The reviewer audits exactly what the run changed, checks that no test or lint rule was weakened to get there, and puts to you any behavior nobody asked for. Your answers go back to the implementer; later rounds only verify that they landed. The implementer never edits what judges its work: `goal.md`, the plan, `loop-state.md`, `REVIEW.md`, `CLAUDE.md`, `AGENTS.md`.
6. **Verification.** The verifier starts the product on local hosts and uses it: every acceptance criterion as written, then probes of each rule — its errors, invalid inputs and edges, a rule stated for every input on 100 generated inputs, that a refused action changes nothing, and that shared code it touched still behaves as before. A failure is fixed like a red gate; a behavior nobody decided is listed for you to keep or change. A scenario nobody could run is never passed in silence: it is listed, and the run closes as "complete — n scenarios not verified".
7. **Loop Report.** Your idea item by item with what was built for each, every decision, the gate and verification results with the commands to run the product yourself, and everything left **uncommitted** for you to review.

**Split ideas.** When your idea holds several features that could ship on their own, intake asks whether to split it: one feature, only one part now, or every independent part at the same time. With the last one, intake still asks everything once; then each other part runs in its own Claude Code session and git worktree while this session carries the part you chose. When all are done, this session gives one report: every part's own report, the files more than one part changed, and how to bring the worktrees together. Nothing is committed and no worktree is removed.

**After the report.** A fix or one more thing you ask for in the same session is never edited in by hand: it reopens the loop — implementer, checks, reviewer and verifier — and you get the report again. Something that is another feature needs its own run.

**Interrupted?** The Stop hook relaunches a run whose session ends a turn mid-way. From a new session, run `/uroboros:run` with no arguments: it picks up from the point recorded in `loop-state.md`, re-runs a subagent whose result never arrived, asks you about files that changed since the last check, and tells you if the branch the feature started from has moved (it never pulls or rebases). One run is active per repository: a second one asks before taking the first one over.

### Flags — dial down the questions

By default Uroboros asks about everything. Flags let you delegate — but a suppressed question never becomes a silent guess: it becomes a **recorded assumption** (`A1`, `A2`, …) with a rationale, logged in `loop-state.md` and presented as an audit ledger in the Loop Report.

```
/uroboros:run --only-business I want sellers to pause a listing...
/uroboros:run --auto --reviewer=sonnet:high --implementer=fable:max Fix the...
```

| Flag | Effect |
|---|---|
| `--auto` | One question batch at the very start — the model and effort not given by flag — then no questions at all. Every other decision is resolved conservatively and recorded as an assumption. Review rounds are uncapped unless you pass `--rounds`; what comes back unchanged right after it was addressed is skipped instead of retried forever, and a gate check that fails the same way two rounds in a row is dropped from the gate (the rest must still pass). Skipped and left-out items head the assumption ledger. |
| `--only-business` | Only product/business questions reach you; purely technical choices (no user-visible difference) become recorded assumptions. |
| `--reviewer=<model>:<effort>` | Pre-answers the reviewer's model and effort (e.g. `sonnet:high`). |
| `--implementer=<model>:<effort>` | Same for the implementer. |
| `--refuter=<model>:<effort>` | Model and effort for the refuter. Without it the refuter runs on the reviewer's choice; it is never asked. |
| `--verifier=<model>:<effort>` | Model and effort for the verifier. Without it the verifier runs on the reviewer's choice; it is never asked. |
| `--rounds=N` | Max review rounds per step (default 3, or 2 on a small run; no cap under `--auto`). When a cap runs out with items left, each open decision is asked with an extra option to leave it out of the feature, and up to two more rounds run before the run stops and reports. Also caps the Stop hook's relaunches. |
| `--parallel=N` | The first build round runs the groups of work that share no file at the same time, at most N implementers at once. Each extra implementer reads the feature's artifacts again: on a small feature a wave cost 48% more and saved no time. Leave it off for projects whose tests cannot run twice at the same time (a fixed port, a shared local database). |
| `--goal` | Accepted and ignored. Before 1.0.0 it selected the flow every run now uses. |

## What a run writes, and where

| Where | What | Shared with your team? |
|---|---|---|
| `.git/uroboros/private/` | What you typed: the idea, your messages, your answers. | Never — it is inside `.git`, and every worktree of the repository reads the same file. |
| `.uroboros/<feature>/` | `goal.md`, `plan.md` on a large run, and `loop-state.md`: decisions restated in neutral words, findings, gate results. | If you commit it. Keep `loop-state.md` on disk either way: later runs read what you decided there. |
| `.uroboros/project-notes.md` | Technical facts runs verified about the project — gate commands, how to start the product, setup traps. Never about your machine. | Commit it. |
| `.uroboros/glossary.md` | The names you give the product's things, so questions call them what you call them. | Commit it; edit it freely. |
| `.uroboros/intake.md`, `.uroboros/active-run.json` | The intake in progress and the marker of the run in progress. | Safe to gitignore. |
| `.git/uroboros/` | Snapshots of the working tree (git *tree* ids — no commit, no ref, your index untouched), the diffs the reviewer reads, your review rules as they were before the run. | Never. |

A snapshot turns every non-ignored file, untracked ones included, into a git object until `git gc` prunes it (two weeks by default): keep secrets in ignored files, as you would anyway. Claude Code treats `.git` as a [protected path](https://code.claude.com/docs/en/permission-modes#protected-paths): in the `default` and `acceptEdits` permission modes each write there asks you first. Without git, or in a session that refuses those writes, the private record lives in the system temp folder and the run falls back to file lists instead of snapshots; the state file says so.

## Configuration

- **Models and efforts:** chosen at runtime, once per run. Effort is `low`, `medium`, `high`, `xhigh` or `max` (the question lists the first four, and `max` is typed in "Other"); a version you name that is not the latest of its family is put back to you, since only the latest release of a family can be dispatched. Sessions that cannot ask (e.g. headless `-p`) fall back to each agent's own frontmatter (`fable` high for the reviewer and the verifier, `opus` xhigh for the implementer), recorded as an assumption. The reviewer is the quality gate: pick strong, and downgrade effort before downgrading the model if cost bites.
- **Model guides:** when a model release ships with its own prompting guidance, the plugin carries it distilled per role in `references/model-guides/<family>-<version>.md` — today for Fable 5.2, Opus 5.5, Sonnet 5.5 and Haiku 5.5, from Anthropic's per-model prompting pages ([Fable 5.2](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-2), [Opus 5.5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5), [Sonnet 5.5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-sonnet-5-5), [Haiku 5.5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-haiku-5-5)) and, for Opus 5.5, [Getting the most out of Opus 5.5](https://claude.dev/blog/getting-the-most-out-of-opus-5-5/). Each role gets the guide for the exact release it runs on, never one written for another release. Every subagent report states the model it actually ran on; a mismatch is put to you before the report is used.
- **Claude Code's `askUserQuestionTimeout`:** leave it at its default, `never`, during a run. When it closes a question, Claude Code tells the model to proceed on its own judgment, and no rule of the plugin covers that answer.
- **Commit policy:** Uroboros never commits. All changes are left for you, by design.
- **`REVIEW.md`:** your project's review rules, read by every review of the code — the same files Claude Code's [Code Review](https://code.claude.com/docs/en/code-review-customize) reads on GitHub. They are taken as they were before the run, so a change can never rewrite what reviews it, and they only add checks. A violated rule with one way to comply is fixed without a question. The Loop Report proposes new rules and rules to prune.
- **Earlier features:** every run reads the other features' `loop-state.md` and never asks again what they decided, unless the new work changes it — and then you are asked whether it still holds. Assumptions an `--auto` run made are not decisions and are asked.

## Coming from a version before 1.0.0

Until 0.32.0 Uroboros drove [GitHub Spec Kit](https://github.com/github/spec-kit)'s six-phase pipeline and needed it installed. Since 1.0.0 it does not use spec-kit at all:

- **Nothing to install or keep in sync.** `/uroboros:compat` and the compatibility contract are gone. A `.specify/` folder in your project is left alone and ignored.
- **A run that was left unfinished on the old pipeline** is not continued. Install 0.32.0 to finish it, or start a new run: it reads the old `spec.md` and `plan.md` as references and never asks again what you decided there.
- **Features under `specs/`** are still read as earlier decisions.
- **Your spec-kit constitution** (`.specify/memory/constitution.md`) is no longer read. Move the principles you want enforced to `CLAUDE.md`, `AGENTS.md` or `REVIEW.md`, which every run treats as rules the implementer cannot edit.
- **`--goal`** no longer changes anything: its flow is the only one.
- **`loop-state.md` files written before 1.0.0** hold your idea and messages as you typed them. The plugin does not rewrite them; gitignore or delete them if that matters in your repository — deleting one loses what you decided there.

## Design notes & credits

- The loop architecture follows [Addy Osmani's *Loop Engineering*](https://addyosmani.com/blog/loop-engineering/) — maker/checker separation, state on disk ("the agent forgets, the repo doesn't"), and verification gates that can actually fail work. One deliberate departure: where agents are commonly tuned to make a sensible assumption and keep going, Uroboros does the opposite. Assumptions are the failure mode it exists to eliminate.
- Sizing the loop to the idea follows two projects that arrived at the same answer: [ECC](https://github.com/affaan-m/ECC)'s `orch-pipeline` (score a request on a few signals, take the highest, say it in one line so the user can override) and [gentle-ai](https://github.com/Gentleman-Programming/gentle-ai) (no count of files or lines decides the size; a short list of risks does). The text is this plugin's own.
- Doing less review where the work is simple, and keeping the plan at the level of design, follow Anthropic's [Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps): an evaluator is worth its cost when the task is beyond what the model does reliably alone, and a plan that fixes granular detail up front passes its errors on to the code. Naming how each risky step is retried or undone comes from OpenAI's [execution plans for Codex](https://developers.openai.com/cookbook/articles/codex_exec_plans).
- Keeping the checks out of reach of the change they judge, never re-running a flaky test until it passes, review rules a diff triggers, and property-style probes come from Anthropic's [How the Claude Code team thinks about verification](https://claude.dev/blog/how-the-claude-code-team-thinks-about-verification/). The verifier follows [How the Claude Code team does code review](https://claude.dev/blog/solving-code-review-at-anthropic/): give Claude something it can run, and have it show the output instead of saying it is done.
- The run skill is kept short and points to one file per stage, as Claude Code's [skills documentation](https://code.claude.com/docs/en/skills) asks: after a compaction only the start of a skill is kept.
- Uroboros was born on top of [GitHub Spec Kit](https://github.com/github/spec-kit) and ran its pipeline until 0.32.0.
- Every minor and major release is measured by [uroboros-testbed](https://github.com/NicolasET/uroboros-testbed): the same scenarios run on every version, and the results (ambiguities caught, hidden tests passed, questions, cost, time) are compared version to version.

## License

MIT — see [LICENSE](./LICENSE).
