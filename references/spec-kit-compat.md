# Spec-kit compatibility contract

Uroboros drives [GitHub Spec Kit](https://github.com/github/spec-kit)'s skills and reads its files. It is therefore only as reliable as the spec-kit release that installed them. This file records **which spec-kit release the plugin is anchored to, exactly what it depends on, what every line since the plugin's birth changed, and how to re-verify when spec-kit moves** — so a new major or minor is adapted deliberately instead of discovered mid-run.

The machine-readable twin is [`spec-kit-compat.json`](./spec-kit-compat.json); the run skill's compatibility check and `/uroboros:compat` read that file. Keep the two in sync.

## Status

| | Value |
|---|---|
| Baseline | **spec-kit 1.0.0** (tag `v1.0.0`, released 2026-08-21) — verified by inspection 2026-09-02 |
| Last full pipeline run | 1.0.0 — 2026-09-02 |
| Supported range | `>=0.12.0 <2.0.0` |
| Verified project setup | `specify init --integration claude` (skills mode, script `ps`), git extension 1.0.0 |
| Snapshot | [`spec-kit-snapshot/1.0.0/`](./spec-kit-snapshot/1.0.0/) |

## Snapshot policy

- **One snapshot per major.minor line**, taken from the `x.y.0` tag with a pristine `specify init` (the snapshot's `NOTICE.md` has the reproducible command). A line is where spec-kit adds behavior; a patch is where it fixes it.
- **Patches are never snapshotted.** `/uroboros:compat` reports a project on a newer patch of the baseline line as "covered by line (patch not reviewed)"; adopting a patch only moves `last_full_run` and the history.
- **A new minor** gets a new snapshot, a row in the review table below, and becomes the baseline. **A new major** is never assumed compatible: until this contract is re-verified, the run skill asks before proceeding on such a project.

## Where a project's version lives

Read in this order; the first hit wins:

1. `.specify/integrations/claude.manifest.json` → `version` — the release that installed the `speckit-*` skills the run invokes (refreshed by `specify integration upgrade claude`).
2. `.specify/init-options.json` → `speckit_version` — recorded at init.
3. `.specify/integration.json` → `version`.

The CLI reports itself with `specify version` (`--features --json` for a machine-readable capability list, which is CLI-level only — it says nothing about skills or templates). `specify extension list` reports the git extension version.

## Touchpoints

Everything the plugin assumes about spec-kit, where that assumption lives in the plugin, and how to check it.

| # | Spec-kit side | Plugin side | How to verify |
|---|---|---|---|
| 1 | Claude integration installs **skills** by default, hyphenated names under `.claude/skills/speckit-*`, invoked as `/speckit-<name>` | `skills/run/SKILL.md` phase table (1–5), Phase 0.5; README prerequisites | `ls .claude/skills \| grep speckit-` |
| 2 | Six core skills: `speckit-specify`, `-clarify`, `-plan`, `-tasks`, `-analyze`, `-implement` | Phase table; the run stops if one is missing | compat check at run start; `/uroboros:compat` |
| 3 | `speckit-git-feature` (git extension, optional; extension declares `requires: speckit_version: ">=0.2.0"`) | Phase 0.5 (branch creation); absent → branchless | `specify extension list` |
| 4 | `speckit-converge` (core since 0.11.2): assesses code vs spec/plan/tasks, **append-only** `## Phase N: Convergence` tasks or "Converged" with `tasks.md` untouched; must run only after tasks were implemented | `references/implement-protocol.md` convergence gate + resume rule; reviewer implement profile | marker check; snapshot diff |
| 5 | `.specify/feature.json` → `feature_directory` (written by the create-new-feature script on the first specify; absent in a fresh project) | Phase −1 resume; step B artifact paths | `cat .specify/feature.json` |
| 6 | **Hook directives** printed by skills from `.specify/extensions.yml`: mandatory `EXECUTE_COMMAND: <cmd>`, optional "To execute: `/<cmd>`"; dots → hyphens. Since 0.12.x the skill text tells the agent it MUST invoke a mandatory hook and wait; `before_specify` → `speckit.git.feature` is mandatory in every version reviewed | Hard rule 2 (hook policy): skip `speckit.git.feature` after Phase 0.5, decline optional hooks and log them, run other mandatory ones | `grep -n EXECUTE_COMMAND .claude/skills/speckit-specify/SKILL.md`; read `extensions.yml` |
| 7 | Spec template: `FR-###`, `SC-###`, `[NEEDS CLARIFICATION: …]` (max 3), `Assumptions` section, user stories with acceptance scenarios | Reviewer specify/tasks profiles; assumption mechanism; step D fold | `grep` the markers in `.specify/templates/spec-template.md` |
| 8 | Clarify writes `## Clarifications` → `### Session YYYY-MM-DD` bullets | Step D fold; assumption mechanism (`(assumed — A<n>)` entries) | `grep -n "Clarifications\|Session" .claude/skills/speckit-clarify/SKILL.md` |
| 9 | Plan artifacts `research.md`, `data-model.md`, `contracts/`, plan-level Constitution Check | Reviewer plan profile; implementer inputs; step B paths | `grep` in `plan-template.md` and the plan skill |
| 10 | `tasks.md`: `T###` ids, `[P]` markers, `- [ ]` / `- [X]` checkboxes, phase sections | Reviewer tasks profile; implementer marks `[X]`; convergence tasks continue the numbering | `grep "\[P\]" .specify/templates/tasks-template.md` |
| 11 | Constitution at `.specify/memory/constitution.md` (may be an unfilled template) | Reviewer analyze profile (never dilute the principle); Loop Report candidate rules | `ls .specify/memory/` |
| 12 | Checklists: `checklists/requirements.md` maintained by specify/clarify; since 1.0.0 implement treats checklist markers as a **read-only gate** and custom checklists are reviewer-owned | Step D "re-tick the phase checklist"; reviewer CLEAN evidence cites checklist items | snapshot diff of `speckit-implement` |
| 13 | Skills call `.specify/scripts/<ps\|sh>/…` scripts (e.g. `check-prerequisites`) resolved at install time | Nothing directly; only the snapshot's script paths differ between `ps` and `sh` projects | expected hunks in `/uroboros:compat` |

## Hook policy (summary)

The pipeline is its own hook executor (hard rule 2 in `skills/run/SKILL.md`):

- `speckit.git.feature` (`before_specify`) — **skipped** when Phase 0.5 already created the branch. A run never creates a second branch.
- **Optional hooks** (`speckit.git.commit` after specify/plan, `speckit.agent-context.update`, …) — **declined silently**, recorded under `DECLINED HOOKS` in `loop-state.md`, listed in the Loop Report for the user to run by hand. The run never commits.
- Any **other mandatory hook** — invoked by the orchestrator, waited for, then the phase continues. Never stop at a directive.

## Review per spec-kit line (0.12.10 → 1.0.0)

Source: pristine installs of each tag (`uvx --from git+https://github.com/github/spec-kit.git@v<version> specify init …`, Claude integration, script `ps`, git extension), diffing the eight snapshot skills, the three templates and `extensions.yml` between consecutive lines. "Plugin impact" is measured against the touchpoints above.

| Line | What changed in the files the plugin uses | Plugin impact |
|---|---|---|
| **0.12.10** (plugin born here) | Baseline of the plugin. Hook blocks already say the agent MUST actually invoke a mandatory hook; `before_specify` → `speckit.git.feature` is `optional: false`; `speckit-converge` and `speckit-checklist` already exist | The rule 2 / Phase 0.5 collision (two branches) existed from day one — fixed in plugin 0.8.0. Converge unused until 0.8.0 |
| **0.13.0** | Whitespace in specify and tasks; a note reworded in `plan-template.md` | none |
| **0.14.0** | Specify: steps renumbered (6→7, 7→8) | none |
| **0.15.0** | Hook blocks in every skill: "slash commands" → "command invocations"; clarify enforces interrogative questions with requirement ids only as a parenthesized suffix | none (the clarify rule mirrors the plugin's Question protocol) |
| **0.16.0** | Skills and templates identical to 0.15.0 (CLI: `--extension` accepted at `init`) | none |
| **1.0.0** | Tasks: setup script also returns `TASKS_TEMPLATE_CONTENT`; implement: checklists become a read-only gate, `checklists/requirements.md` owned by specify/clarify, custom checklists reviewer-owned, "Completed/Incomplete" → "Checked/Unchecked" (CLI: `--non-interactive`) | touchpoint 12 only — step D's "re-tick the phase checklist" stays valid because specify/clarify own that file |

Skill names, `feature.json`, template markers and clarify section names did not change across any line.

## Re-verification procedure (new spec-kit release)

1. In a real project: `specify self check` → `specify self upgrade` → `specify integration upgrade claude` (refreshes the `speckit-*` skills; blocked if you modified them locally — use `--force` knowingly).
2. Run `/uroboros:compat` in that project. It compares the installed version, skills, templates, state files, hook directives and skill texts against this contract and the snapshot, and names the plugin file behind every difference.
3. For each **CHANGED** or **MISSING** touchpoint, adapt the plugin file it names (`skills/run/SKILL.md`, the agents, the references). Expected hunks (script paths, whitespace) need nothing.
4. Run the full pipeline once on the new release.
5. Update the contract:
   - **Patch** (`x.y.z` within the baseline line): move `last_full_run` and add a `history` row in the JSON, and update the Status table here. No new snapshot.
   - **Minor or major**: take a new snapshot from the `x.y.0` tag into `references/spec-kit-snapshot/<x.y.0>/` and regenerate `hashes.json` (see the snapshot's `NOTICE.md`); add a row to the review table; set the new `baseline`; note the spec-kit release in the CHANGELOG entry; bump the plugin version.

## History

| Plugin | Date | Spec-kit | Note |
|---|---|---|---|
| 0.1.0 | 2026-07-10 | 0.12.10 | built against (0.12.10 and 0.12.11 shipped that day) |
| 0.6.0 | 2026-07-29 | 0.14.4 | contemporary release; ran on it |
| 0.7.0 | 2026-08-06 | 0.16.0 | contemporary release; ran on it |
| 0.8.0 | 2026-09-02 | 1.0.0 | contract introduced; every line from 0.12.10 reviewed by diff; full run |
