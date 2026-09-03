---
description: Spec-kit compatibility audit for Uroboros. Compares the spec-kit installed in the current project (version, skills, templates, state files, hook directives, skill texts) against the plugin's compatibility contract and its snapshot of the baseline skills, and reports touchpoint by touchpoint what still matches, what drifted harmlessly, what changed, and which plugin file must be adapted. Run it after upgrading spec-kit (specify self upgrade + specify integration upgrade claude) or when /uroboros:run warns about a version mismatch. Report-only - it never edits anything.
argument-hint: "[--verbose]"
disable-model-invocation: true
---

## User Input

```text
$ARGUMENTS
```

You are auditing **the project in the current working directory** against Uroboros's spec-kit compatibility contract. You read, compare and report. You **never edit** the project, the plugin, or the contract — updating the contract is a deliberate step the maintainer performs in the plugin repository (see `references/spec-kit-compat.md`, "Re-verification procedure"). You do not evaluate, defend, or propose changes to the contract's policy (what is snapshotted, which patches are reviewed); you report what the files say.

Inputs (all under `${CLAUDE_PLUGIN_ROOT}` — the plugin root is the directory that contains `skills/`, `references/` and `.claude-plugin/`, i.e. two levels above this SKILL.md; resolve it once and do not look for `references/` inside `skills/compat/`):

- `references/spec-kit-compat.json` — the contract: the baseline release and its snapshot (`baseline`), the supported range, version sources, the install manifest that hashes every installed skill (`install_manifest`), required/optional skills, files and markers, skill markers, hook directive shapes and the hook events a run triggers (`hook_directives.events_used`).
- `references/spec-kit-compat.md` — the touchpoint table; its `#` numbers are the row ids below.
- `<baseline.snapshot>/<skill>/SKILL.md` — the skill texts of the baseline release, plus `hashes.json`.

`--verbose` prints every diff in full; by default print only the hunks behind DRIFT and CHANGED rows.

## 1. Precondition

If `.specify/` does not exist in the working directory, say this is not a spec-kit project, point at `specify init --here --integration claude`, and stop.

## 2. Versions

- Read the contract's `version_sources` in order; the first file/key that resolves is the **project version**. Record all three when present (they can disagree after a partial upgrade — say so).
- If `specify` is on PATH, run the contract's `cli.version_command` for the **CLI version** and `cli.extension_list_command` for the git extension version. A CLI newer than the project version means `specify integration upgrade claude` has not been run yet — say so.
- Verdict on the project version vs the contract: same version as `baseline.version` → "covered"; same major.minor line (`baseline.line`), different patch → "covered by line (patch not reviewed)"; same major, different minor → "unreviewed minor (new snapshot and review due)"; **different major** → "unverified major"; outside `supported_range` → "unsupported"; undetectable → "unknown".

## 3. Skills

Rows: `2.1`–`2.6` for `skills.required` in contract order, `3` for `speckit-git-feature`, `4` for `speckit-converge`. Do the hashing and the `--stat` comparison for all eight skills in **one** shell invocation (a short loop or a `node -e` script), then open only the diffs that are not identical — not one skill per round trip. For each:

1. Does `<skills_dir>/<skill>/SKILL.md` exist? Missing required → **MISSING** (the run cannot execute that phase). Missing optional → **ABSENT** (state the fallback from the contract).
2. **Local-edit check.** The contract's `install_manifest` file records the SHA-256 of every skill file as spec-kit wrote it. Hash the installed file as-is and with CRLF normalized to LF (`node -e` with `crypto`, or `sha256sum`); if neither matches the manifest entry, the file was **modified after install** — a formatter such as Prettier, or a hand edit — → status **LOCAL**. Skills the manifest does not list (extension skills such as `speckit-git-feature`) skip this step.
3. Compare with `git diff --no-index --ignore-cr-at-eol --stat <snapshot file> <installed file>`. Identical → **OK**. Otherwise get the unified diff (same flags, without `--stat`) and classify every hunk:
   - **expected** — `.specify/scripts/...` path differences (script type `ps` vs `sh`); whitespace, blank lines, indentation; formatter output such as YAML frontmatter quote style (`"x"` ↔ `'x'`), escaped markdown characters (`\*`, `\_`), table pipe padding or realignment;
   - **inert** — any other change that touches none of the skill's `skill_markers` and none of the plugin-facing areas: hook blocks, branch creation, clarify section names, checklist handling, convergence output, artifact paths and ids;
   - **real** — a change inside one of those areas.
   Status: **OK** (expected hunks only), **DRIFT** (inert hunks, no real ones), **CHANGED** (at least one real hunk). A **LOCAL** file keeps that status unless a hunk is real (then **CHANGED**); its diff mixes local edits with spec-kit changes, so print it only with `--verbose`.
4. Check every string in `skill_markers[<skill>]` is still present in the installed file. A missing marker is **CHANGED** whatever the diff looked like — name the marker.

## 4. Files, keys and markers

Rows `5`, `7`, `9`, `10`, `11` (the contract's `files`, in that order). Exists? For JSON files, are the listed `keys` present? For templates, is every `markers` string present? Report **OK / MISSING / CHANGED** with the missing key or marker. A file flagged `absent_until_first_feature` that does not exist is **N/A** (fresh project, no feature yet), not MISSING.

## 5. Hooks

Row `6`. Read `.specify/extensions.yml` and consider **only** the events listed in `hook_directives.events_used` — the loop never triggers the others. For each considered event list command, `optional` and `enabled`.

- **NOTE** when a hook is mandatory (`optional: false` and not `enabled: false`) and is not `speckit.git.feature`: the hook policy will execute it during a run.
- Informational, not a NOTE: `speckit.git.feature` disabled or missing (Phase 0.5 creates the branch anyway); mandatory hooks on events outside `events_used` (one line naming them, "never triggered by the loop").

Status: **OK** or **NOTE**.

## 6. Report

Print exactly this structure, starting with the four header lines — they are mandatory even when every row is OK. Every table cell stays under 40 characters; anything longer goes to the `Details` bullets. `Adapt` is `-` for OK, DRIFT and LOCAL, the plugin file(s) to touch for CHANGED and MISSING, the fallback for ABSENT. A LOCAL row's `Details` line names the file, the mismatch, and what kind of hunks the diff shows (formatting only, or which real ones); the note that `specify integration upgrade claude` refuses to overwrite locally modified files without `--force` goes **once** in `Info`, not on every row.

```
SPEC-KIT COMPAT REPORT
project: <cwd>
project spec-kit: <version> (<file>)   cli: <version | not on PATH>   git extension: <version | ->
contract: baseline <version> (verified <date>)   range <supported_range>   verdict: <covered | covered by line, patch not reviewed | unreviewed minor | unverified major | unsupported | unknown>

| #   | Touchpoint            | Status  | Adapt |
|-----|-----------------------|---------|-------|
| 1   | skills dir            | OK      | -     |
| 2.1 | speckit-specify       | OK      | -     |
| 2.2 | speckit-clarify       | ...     |       |
| 2.3 | speckit-plan          |         |       |
| 2.4 | speckit-tasks         |         |       |
| 2.5 | speckit-analyze       |         |       |
| 2.6 | speckit-implement     |         |       |
| 3   | speckit-git-feature   |         |       |
| 4   | speckit-converge      |         |       |
| 5   | feature.json          |         |       |
| 6   | hooks (events used)   |         |       |
| 7   | spec-template         |         |       |
| 9   | plan-template         |         |       |
| 10  | tasks-template        |         |       |
| 11  | constitution          |         |       |

Details (rows that are not OK only):
- <row> <touchpoint> — <STATUS>: <one line of evidence: what changed or is missing, where; quote the line or marker>

Info: <one line, or "none": version sources that disagree; CLI newer than the project; LOCAL files present (the --force note, once); speckit.git.feature disabled or missing; mandatory hooks on events the loop never triggers>

Diffs: <hunks behind DRIFT and CHANGED rows; every hunk with --verbose; "none" otherwise>

Next steps (at most 5 lines):
- <newer patch of the baseline line: "bookkeeping only — last_full_run/history in spec-kit-compat.json, Status table in spec-kit-compat.md">
- <newer minor or major: "new snapshot from the x.y.0 tag (NOTICE.md), review row, new baseline, CHANGELOG, plugin.json">
- <one line per CHANGED or MISSING row: the plugin file to adapt, most consequential first>
- <unverified major: "the run skill will ask before proceeding on this project">
```

Be factual and terse. Quote the evidence (the line or marker), do not paraphrase it. Do not speculate about spec-kit's intent, and do not comment on whether the contract should treat something differently. The report ends after `Next steps` — no closing summary or restatement.
