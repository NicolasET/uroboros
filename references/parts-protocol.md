# Parts protocol — one idea, several features at the same time

Read this when intake's split question (SKILL.md, Phase 0, step 3) ends with parts to run at the same time, when a run starts with `--part=`, and when a resumed run's state file holds `PARTS`.

**Terms.** A *part* is one slice of a split idea that can ship on its own. The session that ran intake carries the *main part*. Every other part runs in a *part session*: a full Claude Code session of its own — never a subagent, which cannot ask the user anything — in its own git worktree, with its own orchestrator, reviewer, state file and Loop Report.

## P1 — Which parts start now

- Record the parts in the intake draft as `PARTS`: per part a slug, its scope in one line, and `after: <slug>` when it needs code another part writes. A worktree starts from a commit and the plugin never commits (hard rule 6), so one part cannot see another's code: only parts without `after:` start now. A part with `after:` goes to the non-goals as a future run, named with the part it waits for.
- Intake goes on for the whole tree: every part's decisions, each asked once and recorded with the parts it applies to. Step 5's summary groups them by part and gives each part its own size. Before step 5, settle the implementer's model and effort (Model/effort protocol), so that no part asks for it.
- No part session starts, the other parts become future runs, and the user is told why, when there is no git repository or HEAD is detached; or when, outside goal mode, `.specify/` or the `speckit-*` skills are not tracked at HEAD (`git ls-files`) — a worktree would not hold them.
- Uncommitted changes outside `.uroboros/` (`git status --porcelain`) are not in a new worktree. List them and ask per the Question protocol — a question about the run, never sent to the refuter: *Start the parts without these changes* / *Only this part now*.

## P2 — The part draft

After step 5 confirms, write `.uroboros/parts/<slug>/intake.md` for each part that starts now: a complete intake draft (SKILL.md, Intake draft on disk) for that part alone.

- The idea verbatim, then `PART: <slug> — <scope>`, `MAIN: <absolute path of this checkout>` and `BASE: <branch> @ <sha>` (the current HEAD).
- ACTIVE FLAGS, the `UROBOROS:` line, `LANGUAGE`, every model/effort choice, `EARLIER FEATURES`, `USER MESSAGES`, `SURFACES`, `READERS` and the size.
- Every `IDEA ITEMS` entry, each marked with the part that carries it: this part builds its own, and the reviewer reads the others as carried elsewhere.
- Every DECISION LOG and DEFERRED entry that applies to the part, under the id it has here; the non-goals, the other parts among them.
- `INTAKE: confirmed`. No `SESSION:` line: the part session writes its own.

## P3 — Starting a part session

Finish your own step 6 and Phase 0.5 first (goal mode: G2), so that your feature takes its number. Then start the parts one at a time, the next one only when the previous one's marker exists (P5): spec-kit numbers a feature from what already exists, and two that start together can take the same number.

Every part session gets the same first prompt — `/uroboros:run --part=<absolute path of its draft>` followed by the run's flags — and runs on this session's model and effort. A session a host tool starts receives that prompt as plain text and invokes the skill itself, which is why the skill allows it. Use the first means this session has:

1. **A host tool that starts a separate Claude Code session in its own git worktree.** The Claude desktop app gives its sessions one, `mcp__ccd_session__start_session`. Start the part with it: its own worktree, cut from the BASE branch; this session's model; the prompt above. The user's answer to the split question is the request for it. If the tool refuses to start a session because this turn did not begin with the user's own words — the desktop app starts one directly only then — propose each part with it instead, which shows the user a card, and tell the user in one line that each part starts when they open its card. Record each part as `proposed` until its marker exists. Cards opened close together can give two parts the same feature number under different names; the joint report says so.
2. **By hand.** Create the worktree — `git worktree add -b <slug> .claude/worktrees/<slug> <BASE sha>` — and give the user, per part, the two commands to run in a terminal: `cd <worktree>` and `claude "<prompt>"`.

Record each part under `PARTS` in `loop-state.md`: its slug, how it was started, the session's name or id, and its worktree once known. Tell the user in one message which parts are running, that each asks its questions in its own session, and how to open it.

## P4 — A run started with `--part=`

- If this worktree already holds an intake draft or an unfinished run, it is a resume: Phase −1 as written.
- Otherwise read the draft at that path. If `git merge-base --is-ancestor <BASE sha> HEAD` fails, this worktree does not start from the commit the idea was split at: stop, tell the user, change nothing.
- Copy the draft to `.uroboros/intake.md`, add `SESSION: ${CLAUDE_SESSION_ID}`, and resume it as an interrupted intake (Phase −1) whose frontier is empty and whose step 5 is confirmed: go on from Phase 0, step 6 (goal mode: from writing `goal.md`). Intake is confirmed: none of it is asked again, and the recorded model/effort choices are not re-confirmed — the user gave them in this same intake. A decision the draft lacks is asked in the phase that finds it, as in any run.
- The marker (Active run) carries `"part": "<slug>"`. The Loop Report is also written to `<dir>/loop-report.md`.
- Everything else is a run like any other: its own questions, reviews, gate, verification and report. It never commits and never writes outside its worktree.

## P5 — The main part waits, then reports once

- A part's worktree is the entry of `git worktree list --porcelain` whose `.uroboros/active-run.json` — before its Phase 0.5, whose `.uroboros/intake.md` — names the part. Its marker's `status` is its state: `active`, `complete` or `stopped`.
- When your own run reaches the Final report, record `JOINT REPORT: pending` and do not report yet. A part still `proposed` counts as `active`; if the user says they will not open its card, it becomes a future run. While a part is `active`, tell the user which parts are still running — a part that waits for an answer stays `active` — and wait: with one background shell command that returns once no part's marker says `active` (it checks every 30 seconds), or, where the host tells you each time a session you started ends a turn, by reading the markers again at each notice. Such a notice is not the end of the part: only its marker says so.
- A resume that finds `JOINT REPORT: pending` checks the parts before anything else.
- When every part is `complete` or `stopped`, produce the joint report (loop-report.md, Parts), record `JOINT REPORT: done` and delete `.uroboros/parts/`.
- Never remove a worktree: each one holds work that is not committed.
