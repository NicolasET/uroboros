# Uroboros

**Zero-inference loop engineering for [GitHub Spec Kit](https://github.com/github/spec-kit).**

You give one raw idea. Uroboros runs the entire Spec-Driven Development pipeline — `specify → clarify → plan → tasks → analyze → implement` — end to end, auto-advancing between phases. After every phase, an independent reviewer interrogates the artifact and converts **every inferred, assumed, or defaulted decision into an explicit question to you**. Neither agent is ever allowed to guess a product or design decision.

You seed the idea once and answer questions. That's the whole interface.

Don't want the full pipeline? [`--goal`](#goal-mode--skip-the-pipeline) runs the same zero-inference loop against a completion condition instead — no spec-kit required.

> *The uroboros is the serpent that eats its own tail: a loop. This one also refuses to swallow assumptions.*

## Why

Coding agents are optimized to keep moving: they make "informed guesses," accept "reasonable defaults," and declare themselves done. That momentum is exactly how your idea drifts away from what gets built. Uroboros inverts the incentive:

- **Zero inference.** Any gap or ambiguity in scope, behavior, data, UX, or architecture becomes an `AskUserQuestion` — never a silent assumption.
- **Questions you can actually answer.** Every question is self-contained: it tells you what the artifact currently says, why it matters, and offers the current value as an explicit option — never a bare internal id like "F17".
- **Maker/checker split.** The agent that produces an artifact is never the one that judges it. A fresh-context reviewer audits every phase ([the single most useful structural trick in a loop](https://addyosmani.com/blog/loop-engineering/)).
- **Done is proof, not a claim.** On implement, the orchestrator runs your real test/lint/typecheck suite as a hard gate, and a check weakened to pass it — a suppression, a skipped test, a loosened assertion — is restored, never accepted; on design phases, the reviewer's `CLEAN` verdict requires positive evidence per success criterion — "found nothing to flag" is not a pass. Every piece of evidence says where it comes from (an artifact read, a test the gate ran, or only the implementer's word — which never proves a criterion on its own), a test counts only for what it asserts, and a report that leaves out a criterion or a required field is sent back once for the missing part.
- **Fewer questions, none assumed.** A decision that surfaces in several places is asked once; a family of edge cases is asked as one rule first; a gap your earlier answer already settles is fixed citing that answer; small values (labels, copy, a tie-break order) arrive as one list to confirm. Each phase is audited once; later review rounds only check that your answers landed, so an answer does not open a fresh audit. Before a finding reaches you, a second checker tries to refute it (already decided, cannot happen, no outcome changes), and rare cases that need several conditions at once arrive as one list you can leave out of the feature. Every decision still comes from you.
- **The repo remembers.** A per-feature `loop-state.md` records every finding, resolution, accepted risk, and gate result. Interrupted runs resume instead of restarting. Decisions you make binding for the project go to `.uroboros/decisions.md` and are never asked again; technical facts a run verified — gate commands, how to start the product, setup traps — go to `.uroboros/project-notes.md`, so the next run does not rediscover them.

## What's inside

| Component | Role |
|---|---|
| `/uroboros:run` (skill) | **Agent A — orchestrator.** Intake → branch → all six phases → final Loop Report. The only agent that talks to you, edits artifacts, and advances. User-invoked only (`disable-model-invocation`) — Claude never launches a pipeline on its own. |
| `/uroboros:compat` (skill) | **Spec-kit audit.** Compares the spec-kit installed in your project (version, skills, templates, state files, hook directives, skill texts) against the plugin's compatibility contract and its snapshot of the verified skills; reports what changed and which plugin file to adapt. Run it after upgrading spec-kit. Report-only. |
| `uroboros-reviewer-<effort>` (subagent) | **Agent B — checker.** Fresh context, read-only. Interrogates each phase artifact per a phase profile; returns structured findings; `CLEAN` requires evidence. Runs on a **model + effort you choose once per run** at intake. The same variants also run as the **refuter**, which tries to disprove each finding before it becomes a question. |
| `uroboros-implementer-<effort>` (subagent) | **Agent C — maker.** Fresh context, write-capable, used only in implement. Runs on a **model + effort you choose at runtime** (the orchestrator asks right before implement). Reports ambiguities instead of guessing. |
| `uroboros-verifier-<effort>` (subagent) | **Checker that uses the product.** Fresh context; runs commands and drives a browser but never edits the project. Closes implement (and goal mode) by starting the product, calling its API or CLI and driving its UI on local hosts, scenario by scenario, then probing each requirement's rules, errors and edges, with evidence; a behavior the spec never decided comes back to you as a question. Runs on the reviewer's model/effort unless you pass `--verifier=`. |
| `references/` | Progressive disclosure: the reviewer, refuter, implementer and verifier instructions, the implement and verify protocols, the Loop Report format, the goal protocol, and the **spec-kit compatibility contract** (`spec-kit-compat.md` / `.json` plus a snapshot of the verified `speckit-*` skills) live here and are read only when needed, keeping the always-loaded command lean. |
| `hooks/goal-gate.js` | **Goal-mode keeper.** A Stop hook that replicates `/goal`: while `.uroboros/active-run.json` records an active `--goal` run, it blocks the session that owns the run from stopping (capped by `--rounds`) so the loop resumes automatically across turns. Inert — near-zero cost — in every other session, and for SDD runs. |
| `hooks/resume-context.js` | **Compaction recovery.** A SessionStart hook for `compact`: when the context of the session that owns an active run is compacted, it points that session back at the plugin's instructions and the run's state file, so it resumes from disk instead of from a summary. Silent in every other case. |

Each subagent ships as five variants — `-low`, `-medium`, `-high`, `-xhigh`, `-max` — that differ only in their `effort`: Claude Code sets a subagent's effort from its definition, not per call, so the variant is how the effort you choose actually applies. The variants share one set of instructions in `references/`.

## Prerequisites

- **Claude Code** (recent version, with plugins support).
- For the default pipeline: a repo initialized with **GitHub Spec Kit** using the Claude integration in **skills mode** — the `speckit-specify` … `speckit-analyze` skills must exist (`specify init --here --integration claude`; Claude installs skills by default). Verified against **spec-kit 1.1.0**, supported range `>=0.12 <2` — see [`references/spec-kit-compat.md`](./references/spec-kit-compat.md) and [Keeping up with spec-kit](#keeping-up-with-spec-kit).
- Optional: **[Claude in Chrome](https://code.claude.com/docs/en/chrome)** connected (or the Claude desktop app's built-in browser) so the verifier can drive a UI. Without a browser, the run asks whether to connect one or leave the UI unverified.
- Optional: spec-kit's **git extension** (`specify extension add git`) for automatic feature-branch creation. Without it, Uroboros continues branchless.
- **Goal mode (`--goal`) has no spec-kit requirement.** It needs **Node.js** on your PATH (the Stop hook is a Node script) and an accepted workspace **trust dialog** (the hook runs through Claude Code's hooks system).
- **Node.js, in practice, for the whole plugin.** The Stop hook and the compaction hook are registered for every session in every project where the plugin is enabled — they exit immediately when no run is active — so without Node, Claude Code shows a `hook error` notice each time a turn ends, even if you never use `--goal`.

## Install

```
/plugin marketplace add nicolaset/uroboros
/plugin install uroboros@uroboros
```

Restart Claude Code after installing (subagents load at startup).

## Usage

Start a feature from a raw idea (any language — the pipeline's internal artifacts are English; questions come to you in your language):

```
/uroboros:run I want sellers to be able to pause a listing without losing its ranking...
```

The flow you'll experience:

1. **Intake.** Uroboros first checks the project's spec-kit version and skills against its [compatibility contract](./references/spec-kit-compat.md) (a different major gets a question; a missing core skill stops the run), then runs a **blind-spot pass** — exploring the codebase around your idea to surface the unknown unknowns you'd never think to mention (prior work, invariants your idea touches, decisions it silently implies) — then interrogates your idea in **rounds over a decision tree**: each round asks only the decisions whose prerequisites you have already settled (architecture-changing ones first), and the next round is recomputed from your answers. It covers goal, scope in/out and non-goals, entities, done-criteria, failure behavior and edge cases, every place the behavior can be reached or seen (routes, commands, screens, jobs, roles — each in or out of scope), and the way back from every new state the idea creates; looks facts up in the repo instead of asking you; offers to split an idea that is really several features; accepts "I don't know" (the decision is carried to specify as an open `[NEEDS CLARIFICATION]`, never filled in); and asks for a mockup or reference when a question is about look and feel. It also invites references: existing code, mockups, or libraries close to what you want are the highest-fidelity spec input. It then shows a summary of what it understood (settled, non-goals, deferred, and whether the run is *small* — which lowers the review round cap to 2) for you to confirm, drafts an English `specify` prompt — your exact wording (messages, labels, examples) carried verbatim in your language — and asks for your approval. Intake progress is saved to `.uroboros/intake.md` after every round, so an interrupted intake resumes where it stopped.
2. **Phases 1–6.** Each phase runs, the reviewer audits it, and its findings arrive to you as self-contained multiple-choice questions — what the artifact says today, why it matters, options phrased as outcomes (free-form always allowed). Before relaying, a refuter in fresh context tries to disprove each finding; refuted ones are not asked and are listed in the Loop Report. Rare cases that need several conditions at once arrive as one list. Your answers are folded back into the artifact and every mention is brought in line; later rounds only verify those folds; the loop advances only on `CLEAN`-with-evidence. At the end, the Loop Report offers to make some of the run's decisions standing for the project.
3. **Implement.** You're asked which model and reasoning effort the implementer should use for this run. Before any code is written, the orchestrator runs your real test/lint/typecheck suite once on the untouched tree: if it is already red, you are asked whether to fix those failures in this feature, leave them out of this run's gate, or stop. The implementer writes the code; the orchestrator runs the suite as a hard gate; the reviewer audits exactly what the run changed — a snapshot of the working tree taken before the first change, compared with one after each round, so your own uncommitted edits never count as the run's and new files are never missed — checks that no test, assertion or lint rule was weakened to get there, and puts to you any behavior nobody asked for — an extra endpoint, a changed default — to keep or remove; fixes are re-dispatched to the implementer. Red gate = not done, period. Once the reviewer is clean and the gate is green, `speckit-converge` (if installed) must confirm nothing specified is still unbuilt — appended convergence tasks open another round. Last, the **verifier uses the product**: it starts it on local hosts, calls its API or CLI and drives its UI in Claude in Chrome (or the desktop app's browser), running every acceptance scenario of the spec and every scenario of `quickstart.md` as written, then probing each requirement — its errors, invalid inputs and edges, that a refused action changes nothing, and that shared code it touched still behaves as before the run. A failed scenario or probe is fixed like a red gate; a behavior the spec never decided is listed for you to keep or change; one it cannot run (an external service, no test data) is reported as not verified.
4. **Loop Report.** A legible delta: per phase, what changed and why; the full decision log; the gate and verification results, with the commands to run the product yourself; everything left **uncommitted** for you to review and commit.

Interrupted? Run `/uroboros:run` with no arguments — the resume check picks up from the last incomplete phase recorded in `loop-state.md` (including the run's flags). Before it trusts anything recorded, it re-runs a subagent whose result never arrived, asks you about files that changed since the last gate or verification, and checks whether the branch the feature started from has moved under files the run depends on (it never pulls or rebases). One run is active per repository: a second one asks before taking the first one over.

### Flags — dial down the questions

By default Uroboros asks about everything. Flags let you delegate — but a suppressed question never becomes a silent guess: it becomes a **recorded assumption** (`A1`, `A2`, …) with a rationale, logged in `loop-state.md` and presented as an audit ledger in the final Loop Report.

```
/uroboros:run --only-business I want sellers to pause a listing...
/uroboros:run --auto --reviewer=sonnet:high --implementer=fable:max Fix the...
```

| Flag | Effect |
|---|---|
| `--auto` | One question batch at the very start — the reviewer and implementer model/effort not given by flag — then no questions at all. Every other decision (including intake approval) is resolved conservatively and recorded as an assumption. Review rounds are uncapped: each phase loops until the reviewer is clean (and, for implement, the gate is green), unless you pass `--rounds`. What comes back unchanged right after it was addressed is skipped instead of retried forever: a repeated finding becomes a `skipped` assumption, and a gate check that fails the same way two rounds in a row is dropped from the gate (the rest of the gate must still pass). Failures the suite already had before the run are left out of the gate. Skipped and left-out items head the Loop Report's assumption ledger. |
| `--only-business` | Only product/business questions reach you; purely technical choices (no user-visible difference) become recorded assumptions. |
| `--reviewer=<model>:<effort>` | Pre-answers the reviewer model/effort question (e.g. `sonnet:high`). |
| `--implementer=<model>:<effort>` | Same for the implementer. |
| `--refuter=<model>:<effort>` | Model/effort for the refuter. Without it the refuter runs on the reviewer's choice; it is never asked. |
| `--verifier=<model>:<effort>` | Model/effort for the verifier. Without it the verifier runs on the reviewer's choice for implement; it is never asked. |
| `--rounds=N` | Max review rounds per phase (default 3, or 2 when intake sizes the run *small*; no cap under `--auto`). When a cap runs out with items left, one question lists them: decide them now, leave them out of the feature, or stop. In goal mode, also caps the Stop hook's automatic relaunches. Under `--auto`, an exhausted cap lets a design phase advance with its last unchecked resolutions flagged as unverified assumptions; implement stops and reports. |
| `--goal` | **Goal mode** — replaces the SDD pipeline with a completion condition (see below). Combines freely with every flag above. |

The zero-inference rule survives intact: the ban was always on inferring *silently*. The reviewer's audit shifts with the mode — a recorded assumption is sourced-by-policy; an unrecorded one is still a finding.

### Goal mode — skip the pipeline

For small tasks where full SDD is overkill, or repos where spec-kit isn't installed, `--goal` swaps the six phases for a **completion condition**, in the spirit of Claude Code's [`/goal`](https://code.claude.com/docs/en/goal.md):

```
/uroboros:run --goal Add a /health endpoint that returns the build version...
/uroboros:run --goal --auto --reviewer=sonnet:high --implementer=fable:max Fix the...
```

What changes and what doesn't:

- **Intake is identical** (blind-spot pass, frontier rounds, references, shared-understanding check; a deferred decision must be settled or moved out of scope, since there is no clarify phase) — but it produces a `goal.md` (measurable completion condition + numbered acceptance criteria + constraints + the conditions under which you want the run to stop rather than go on) instead of a specify prompt, and the reviewer audits it before any code is written.
- **The work runs in rounds** — implementer → real gate (tests/lint/typecheck) → reviewer — until the reviewer returns `CLEAN` with evidence per acceptance criterion, the gate is green **and** the verifier, using the product, finds every acceptance criterion met, with the same round cap as the pipeline (see `--auto` and `--rounds` above).
- **The plugin's Stop hook keeps the run alive across turns**, replicating `/goal`: while `.uroboros/active-run.json` records an active run, ending a turn relaunches the loop instead of returning control (same cap). The marker names the session that owns the run, so only that session is kept alive — a marker left behind by a crashed run never traps your other sessions; `/uroboros:run --goal` with no idea takes it over from a new session. You never re-invoke the command to resume. A requirement you add in an answer mid-run is confirmed with you and added as a new acceptance criterion.
- **Everything else survives**: maker/checker split, runtime-chosen models, the assumption ledger under `--auto`/`--only-business`, the hard gate, the Loop Report, and the no-commit policy. State lives in `.uroboros/<slug>/` instead of the spec-kit feature directory.

## Configuration

- **Reviewer model/effort:** chosen at runtime, once per run — via the `--reviewer=` flag or a blocking question at intake (under `--auto`, at the very start of the run) — it governs every reviewer dispatch of that run. Effort is `low`, `medium`, `high`, `xhigh` or `max` (one agent variant each; the question lists the first four, and `max` is typed in "Other"); a version you name that is not the latest of its family is put back to you, since only the latest release of a family can be dispatched. Sessions that cannot ask (e.g. headless `-p`) fall back to `uroboros-reviewer-high` on its frontmatter model. The reviewer is the quality gate: pick strong, and downgrade effort before downgrading the model if cost bites.
- **Refuter model/effort:** the reviewer's choice unless you pass `--refuter=`; it is never asked.
- **Verifier model/effort:** the reviewer's choice for implement unless you pass `--verifier=`; it is never asked. The headless fallback is `uroboros-verifier-high`.
- **Implementer model/effort:** chosen at runtime, every run — via the `--implementer=` flag or the blocking question (right before implement; under `--auto`, at the very start of the run). Same efforts and version rule; the headless fallback is `uroboros-implementer-xhigh`.
- **Model guides:** when a model release ships with its own prompting guidance (e.g. [Getting the most out of Opus 5.5](https://claude.dev/blog/getting-the-most-out-of-opus-5-5/)), the plugin carries it distilled per role in `references/model-guides/<family>-<version>.md`. Each role — orchestrator, reviewer, refuter, implementer, verifier — gets the guide for the exact release it runs on, never one written for another release. A guide can change how the loop behaves on that release when its source says so: the Opus 5.5 guide adds an intake question (for ideas with UI, a concrete list of visual patterns to avoid) and has implement reviews report only merge-blocking problems — a silently inferred decision always counts as one. Every subagent report states the model it actually ran on; a mismatch (e.g. a safeguard reroute to an older model) is put to you before the report is used. The Loop Report lists which guides were applied.
- **Commit policy:** Uroboros never commits. All changes are left for you, by design.
- **Snapshots (`.git/uroboros/`):** to know exactly what a run changed, implement records git *tree* ids of the working tree (`git add -A` into a temporary index under `.git`, then `git write-tree`) — no commit, no ref, and your own index is never touched. The temporary index and the diff files the reviewer reads live in `.git/uroboros/`. Every non-ignored file, untracked ones included, becomes a git object until `git gc` prunes it (two weeks by default): keep secrets in ignored files, as you would anyway.
- **Spec-kit hooks:** optional hooks (auto-commit, agent-context refresh) are declined without asking and listed in the Loop Report for you to run by hand; the branch-creation hook is skipped because the run already created the branch; any other mandatory hook is executed by the orchestrator. If `.specify/extensions.yml` cannot be parsed, no hook runs at all, so the run asks you once at the start whether to stop and fix it or continue without hooks, and the Loop Report repeats it.
- **`loop-state.md`:** lives in the feature directory next to `spec.md`. Its `UROBOROS:` line records the plugin version the run ran on, and every other version a resume ran on. Keep it as run history, or gitignore `**/loop-state.md`.
- **`.uroboros/decisions.md`:** the project's standing decisions, one line each with the run it came from. Read at the start of every run and passed to the reviewer and implementer; it changes only when you choose, at the end of a run, to add a decision, replace one, or retire one the run set aside (retired entries move to a `## Retired` section and no longer bind). Edit it by hand freely, and commit it.
- **`.uroboros/project-notes.md`:** technical facts about the project that runs verified, one line each with the run it came from and how it was verified. Each entry is verified again before it is used; the run writes it at the end without asking, and the Loop Report lists what changed. Commit it.
- **`.uroboros/`:** holds the transient `intake.md` draft while an intake is in progress (both modes; deleted once the run's `loop-state.md` exists), in goal mode `goal.md` + `loop-state.md` per feature, and in both modes the transient `active-run.json` marker of the run in progress, which the hooks read. Commit the per-feature files if you want run history; `intake.md` and `active-run.json` are safe to gitignore.

### Keeping up with spec-kit

Uroboros is anchored to a spec-kit **major.minor line** (currently **1.1**, snapshot of 1.1.0; supported range `>=0.12 <2`) — one snapshot per line, never per patch; older lines keep theirs, so `/uroboros:compat` checks a project still on 1.0 against the 1.0 snapshot. The contract — every touchpoint the plugin depends on, where it lives in the plugin, what each spec-kit line since 0.12 changed, and the re-verification procedure — is in [`references/spec-kit-compat.md`](./references/spec-kit-compat.md). Every SDD run checks the project's spec-kit major against it and asks before proceeding on an unverified major.

A project's version is in `.specify/integrations/claude.manifest.json` → `version` (or run `specify version`). To move to a new release:

```
specify self check                   # is a newer CLI available?
specify self upgrade                 # upgrade the CLI
specify integration upgrade claude   # reinstall the speckit-* skills from the new CLI
/uroboros:compat                     # audit the plugin against what got installed
```

## Design notes & credits

- The loop architecture follows [Addy Osmani's *Loop Engineering*](https://addyosmani.com/blog/loop-engineering/) — maker/checker separation, state on disk ("the agent forgets, the repo doesn't"), and verification gates that can actually fail work. One deliberate departure: where agents are commonly tuned to make a sensible assumption and keep going, Uroboros does the opposite. Assumptions are the failure mode it exists to eliminate.
- Built on top of [GitHub Spec Kit](https://github.com/github/spec-kit)'s SDD workflow and skills.
- Every minor and major release is measured by [uroboros-testbed](https://github.com/NicolasET/uroboros-testbed): the same scenario — a small API, one feature idea with five planted ambiguities, hidden acceptance tests — runs in every mode, and the results (ambiguities caught, hidden tests passed, cost, time) are compared version to version.
- The maker/checker/orchestrator trio maps to Claude Code subagents: the reviewer is read-only tooling by construction; the verifier has no edit tools, and the orchestrator compares `git status` before and after its run; the implementer reports `BLOCKED` rather than guessing.
- The verifier follows the advice in Anthropic's [How the Claude Code team does code review](https://claude.dev/blog/solving-code-review-at-anthropic/): give Claude something it can run, such as a test, a build or the app in a browser, and have it show the output instead of saying it is done.

## License

MIT — see [LICENSE](./LICENSE).
