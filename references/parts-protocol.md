# Parts protocol — one idea, several features at the same time

Read this when intake's split question (intake protocol, step 3) ends with parts to run at the same time, when a run starts with `--part=`, and when a resumed run's state file holds `PARTS`.

**Terms.** A *part* is one slice of a split idea that can ship on its own. The session that ran intake carries the *main part*. Every other part runs in a *part session*: a full Claude Code session of its own — never a subagent, which cannot ask the user anything — in its own git worktree, with its own orchestrator, reviewer, state file and Loop Report.

## P1 — Which parts start now

- Record the parts in the intake draft as `PARTS`: per part a slug, its scope in one line, and `after: <slug>` when it needs code another part writes. A worktree starts from a commit and the plugin never commits (hard rule 6), so one part cannot see another's code: only parts without `after:` start now. A part with `after:` goes to **Out of scope** as a future run, named with the part it waits for.
- Intake goes on for the whole tree: every part's decisions, each asked once and recorded with the parts it applies to. Step 5's summary groups them by part and gives each part its own size.
- No part session starts, the other parts become future runs, and the user is told why, when there is no git repository or HEAD is detached.
- Uncommitted changes outside `.uroboros/` (`git status --porcelain`) are not in a new worktree. List them and ask per the question protocol — a question about the run, never sent to the refuter: *Start the parts without these changes* / *Only this part now*.

## P2 — The part draft

After step 5 confirms, write `.uroboros/parts/<slug>/intake.md` for each part that starts now: a complete intake draft (intake protocol, The intake draft) for that part alone.

- `PART: <slug> — <scope>`, `MAIN: <absolute path of this checkout>` and `BASE: <branch> @ <sha>` (the current HEAD). The draft holds none of the user's text (hard rule 9): P3 adds where the part reads it.
- ACTIVE FLAGS, the `UROBOROS:` line, `LANGUAGE`, every model/effort choice, `EARLIER FEATURES`, `SURFACES`, `READERS` and the size.
- Every `IDEA ITEMS` entry, each marked with the part that carries it: this part builds its own, and the reviewer reads the others as carried elsewhere.
- Every DECISION LOG entry that applies to the part, under the id it has here; what is out of scope, the other parts among them.
- `INTAKE: confirmed`. No `SESSION:` line: the part session writes its own.

## P3 — Starting a part session

Finish your own step 6 and the intake protocol's last section first. Then add `PRIVATE RECORD: <the absolute path of this run's private record>` to each part draft — the record has its final name only now — and start the parts.

Every part session gets the same first prompt — `/uroboros:run --part=<absolute path of its draft>` followed by the run's flags — and runs on this session's model and effort. A session a host tool starts receives that prompt as plain text and invokes the skill itself, which is why the skill allows it. Use the first means this session has:

1. **A host tool that starts a separate Claude Code session in its own git worktree.** The Claude desktop app gives its sessions one, `mcp__ccd_session__start_session`. Start the part with it: its own worktree, cut from the BASE branch; this session's model; the prompt above. The user's answer to the split question is the request for it. If the tool refuses to start a session because this turn did not begin with the user's own words — the desktop app starts one directly only then — propose each part with it instead, which shows the user a card, and tell the user in one line that each part starts when they open its card. Record each part as `proposed` until its marker exists.
2. **By hand.** Create the worktree — `git worktree add -b <slug> .claude/worktrees/<slug> <BASE sha>` — and give the user, per part, the two commands to run in a terminal: `cd <worktree>` and `claude "<prompt>"`.

Record each part under `PARTS` in `loop-state.md`: its slug, how it was started, the session's name or id, and its worktree once known. Tell the user in one message which parts are running, that each asks its questions in its own session, and how to open it.

## P4 — A run started with `--part=`

- If this worktree already holds an intake draft or an unfinished run, it is a resume: Phase −1 as written.
- Otherwise read the draft at that path. If `git merge-base --is-ancestor <BASE sha> HEAD` fails, this worktree does not start from the commit the idea was split at: stop, tell the user, change nothing.
- Copy the draft to `.uroboros/intake.md`, add `SESSION: <this session's id>`, and resume it as an interrupted intake (Phase −1) whose frontier is empty and whose step 5 is confirmed: go on from intake protocol, step 6. Copy the private record the draft names to `…/uroboros/private/<part slug>.md`: this session's messages and answers go to that copy. Intake is confirmed: none of it is asked again, and the recorded model/effort choices are not re-confirmed — the user gave them in this same intake. A decision the draft lacks is asked in the phase that finds it, as in any run.
- The marker (SKILL.md, The marker) carries `"part": "<slug>"`. The Loop Report is also written to `<dir>/loop-report.md`.
- Everything else is a run like any other: its own questions, reviews, gate, verification and report. It never commits and never writes outside its worktree, except its own private record in the shared `.git`.

## P5 — The main part waits, then reports once

- A part's worktree is the entry of `git worktree list --porcelain` whose `.uroboros/active-run.json` — before the feature has its folder, whose `.uroboros/intake.md` — names the part. Its marker's `status` is its state: `active`, `complete` or `stopped`.
- When your own run reaches the Final report, record `JOINT REPORT: pending` and do not report yet. A part still `proposed` counts as `active`; if the user says they will not open its card, it becomes a future run. While a part is `active`, tell the user which parts are still running — a part that waits for an answer stays `active` — and wait: with one background shell command that returns once no part's marker says `active` (it checks every 30 seconds), or, where the host tells you each time a session you started ends a turn, by reading the markers again at each notice. Such a notice is not the end of the part: only its marker says so.
- A resume that finds `JOINT REPORT: pending` checks the parts before anything else.
- When every part is `complete` or `stopped`, produce the joint report (loop-report.md, Parts), record `JOINT REPORT: done` and delete `.uroboros/parts/`.
- Never remove a worktree: each one holds work that is not committed.
