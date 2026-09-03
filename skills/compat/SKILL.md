---
description: Spec-kit compatibility audit for Uroboros. Compares the spec-kit installed in the current project (version, skills, templates, state files, hook directives, skill texts) against the plugin's compatibility contract and its snapshot of the verified skills, and reports touchpoint by touchpoint what still matches, what changed, and which plugin file must be adapted. Run it after upgrading spec-kit (specify self upgrade + specify integration upgrade claude) or when /uroboros:run warns about a version mismatch. Report-only - it never edits anything.
argument-hint: "[--verbose]"
disable-model-invocation: true
---

## User Input

```text
$ARGUMENTS
```

You are auditing **the project in the current working directory** against Uroboros's spec-kit compatibility contract. You read, compare and report. You **never edit** the project, the plugin, or the contract — updating the contract is a deliberate step the user performs in the plugin repository (see `references/spec-kit-compat.md`, "Re-verification procedure").

Inputs (all under `${CLAUDE_PLUGIN_ROOT}`):

- `references/spec-kit-compat.json` — the contract: the baseline release and its snapshot (`baseline`), the supported range, version sources, required/optional skills, files and markers, skill markers, hook directive shapes.
- `references/spec-kit-compat.md` — the touchpoint table with the plugin file behind each touchpoint (use its `#` numbers in the report).
- `<baseline.snapshot>/<skill>/SKILL.md` — the skill texts of the line's baseline release (`x.y.0`), plus `hashes.json`.

`--verbose` prints every diff in full; by default print stats plus the hunks that matter.

## 1. Precondition

If `.specify/` does not exist in the working directory, say this is not a spec-kit project, point at `specify init --here --integration claude`, and stop.

## 2. Versions

- Read the contract's `version_sources` in order; the first file/key that resolves is the **project version**. Record all three when present (they can disagree after a partial upgrade — say so).
- If `specify` is on PATH, run the contract's `cli.version_command` for the **CLI version** and `cli.extension_list_command` for the git extension version. A CLI newer than the project version means `specify integration upgrade claude` has not been run yet — say so.
- Verdict on the project version vs the contract: same version as `baseline.version` → "covered"; same major.minor line (`baseline.line`), different patch → "covered by line (patch not reviewed)"; same major, different minor → "unreviewed minor (new snapshot and review due)"; **different major** → "unverified major"; outside `supported_range` → "unsupported"; undetectable → "unknown".

## 3. Skills

For each skill in `skills.required` and `skills.optional`:

1. Does `<skills_dir>/<skill>/SKILL.md` exist? Missing required → **MISSING** (the run cannot execute that phase). Missing optional → **ABSENT** (state the fallback from the contract).
2. If it exists and the snapshot has it: compare with `git diff --no-index --ignore-cr-at-eol --stat <snapshot file> <installed file>` (the flag ignores CRLF/LF differences introduced by the platform). Identical → **OK**. Otherwise get the unified diff (same flags, without `--stat`) and classify every hunk:
   - **expected** — only `.specify/scripts/...` path differences (script type `ps` vs `sh`) or whitespace-only changes;
   - **real** — anything else. For each real hunk, say which contract `skill_markers` / touchpoints it touches (hook block, branch creation, clarify section names, convergence output, checklist handling, artifact paths…) or that it touches none of them.
   Status: **OK (expected diffs)** or **CHANGED**.
3. Check every string in `skill_markers[<skill>]` is still present in the installed file. A missing marker is **CHANGED** even if the diff looked harmless — name the marker.

## 4. Files, keys and markers

For each entry in the contract's `files`: exists? For JSON files, are the listed `keys` present? For templates, is every `markers` string present? Report **OK / MISSING / CHANGED** with the missing key or marker. A file flagged `absent_until_first_feature` that does not exist is **N/A** (fresh project, no feature yet), not MISSING.

Also read `.specify/extensions.yml`: list every hook event with its commands and `optional` flag. Flag as **NOTE** any mandatory (`optional: false`) hook other than `speckit.git.feature`, because the hook policy will execute it during a run.

## 5. Report

Print exactly this structure:

```
SPEC-KIT COMPAT REPORT
project: <cwd>
project spec-kit: <version> (from <file>)   cli: <version or "not on PATH">   git extension: <version or "-">
contract: baseline <version> (verified <date>)   range <supported_range>   verdict: <covered | covered by line, patch not reviewed | unreviewed minor | unverified major | unsupported | unknown>

| # | Touchpoint | Status | Evidence | Plugin file(s) | What to adapt |
|---|------------|--------|----------|----------------|---------------|
| 2 | speckit-specify | CHANGED | hook block: "…" → "…" | skills/run/SKILL.md (hard rule 2) | re-read the hook directive wording |
...one row per skill, file and marker group; use the touchpoint numbers from spec-kit-compat.md...

Diffs: <per CHANGED skill: the real hunks (all hunks with --verbose)>

Next steps:
- <if everything is OK and the project version is newer than the baseline: say which bump applies — a newer **patch** only moves last_full_run/history in spec-kit-compat.json and the Status table in spec-kit-compat.md; a newer **minor or major** needs a new snapshot taken from the x.y.0 tag (NOTICE.md has the commands), a row in the per-line review table, a new baseline, a CHANGELOG line and a plugin.json bump>
- <if anything is CHANGED or MISSING: the plugin files to adapt, one line each, most consequential first (a missing required skill or a changed hook directive before a moved template marker)>
- <if the verdict is "unverified major": say the run skill will ask before proceeding on this project until the contract is updated>
```

Be factual and terse. Quote the evidence (the line or marker), do not paraphrase it. Do not speculate about spec-kit's intent; report what the files say.
