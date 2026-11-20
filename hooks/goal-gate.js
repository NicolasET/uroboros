#!/usr/bin/env node
// Stop hook for a Uroboros run. Replicates /goal semantics:
// while .uroboros/active-run.json records an active run owned by the
// stopping session, block the stop so the session relaunches and the
// orchestrator resumes from loop-state.md. Every other session in the repo
// stops normally. Allows the stop (exit 0, no output) on ANY doubt — this
// hook must never trap a session it cannot account for.
//
// A turn that ends while a subagent of the run is still working is a wait,
// not a stop: the completion notification wakes the session. The stop input
// lists what is in flight (`background_tasks`), so that turn end is allowed
// and not counted as a relaunch. `stop_hook_active` is not read: the relaunch
// cap below already bounds how often this hook blocks.

'use strict';

const fs = require('fs');
const path = require('path');

function allow() {
  process.exit(0);
}

function isSubagent(task) {
  return Boolean(task) && typeof task.type === 'string' && task.type.toLowerCase() === 'subagent';
}

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  raw += chunk;
});
process.stdin.on('end', () => {
  let cwd = process.cwd();
  let sessionId = '';
  let backgroundTasks; // undefined: this Claude Code version does not report them
  try {
    const input = JSON.parse(raw);
    if (typeof input.cwd === 'string' && input.cwd) cwd = input.cwd;
    if (typeof input.session_id === 'string') sessionId = input.session_id;
    if (Array.isArray(input.background_tasks)) backgroundTasks = input.background_tasks;
  } catch (_) {
    // stdin was not JSON — fall back to process cwd; no session id means
    // the owner check below allows the stop
  }

  const markerPath = path.join(cwd, '.uroboros', 'active-run.json');
  let run;
  try {
    run = JSON.parse(fs.readFileSync(markerPath, 'utf8'));
  } catch (_) {
    allow();
    return;
  }

  if (!run || run.status !== 'active') {
    allow();
    return;
  }

  // Every run writes `mode: "goal"`. A marker with another `mode` belongs to
  // a run of spec-kit's pipeline, which left the plugin in 1.0.0 and is never
  // kept alive. A marker without `mode` predates 0.21.0 and is a run only if
  // it carries the round fields.
  const isRun = run.mode === 'goal' || (run.mode === undefined && Object.prototype.hasOwnProperty.call(run, 'rounds_max'));
  if (!isRun) {
    allow();
    return;
  }

  // Only the session that owns the run is kept alive. A marker without a
  // session_id (written before 0.12.0) or left behind by a crashed run
  // never blocks another session.
  if (!sessionId || run.session_id !== sessionId) {
    allow();
    return;
  }

  // A subagent in flight will wake the session with its report: allow the
  // stop without spending a relaunch.
  if (backgroundTasks && backgroundTasks.some(isSubagent)) {
    allow();
    return;
  }

  // rounds_max: null = uncapped (--auto without --rounds); the owning session
  // relaunches until the orchestrator sets a terminal status. Missing or
  // invalid = 3.
  const uncapped = run.rounds_max === null;
  const max = Number.isFinite(run.rounds_max) ? run.rounds_max : 3;
  const relaunches = Number.isFinite(run.relaunches) ? run.relaunches : 0;
  if (!uncapped && relaunches >= max) {
    allow();
    return;
  }

  run.relaunches = relaunches + 1;
  try {
    fs.writeFileSync(markerPath, JSON.stringify(run, null, 2) + '\n');
  } catch (_) {
    // If the relaunch counter cannot be persisted, the cap cannot be
    // enforced — allow the stop rather than risk an unbounded loop.
    allow();
    return;
  }

  const dir = typeof run.dir === 'string' && run.dir ? run.dir : '.uroboros';
  process.stdout.write(
    JSON.stringify({
      decision: 'block',
      reason:
        `Uroboros run "${run.feature || 'unknown'}" is still active ` +
        `(relaunch ${run.relaunches}/${uncapped ? 'uncapped' : max}${backgroundTasks ? '; no subagent is running' : ''}). Read ${dir}/loop-state.md and ` +
        `.uroboros/active-run.json, then resume the run per the uroboros ` +
        `run skill (skills/run/SKILL.md, Phase −1). When the goal is met ` +
        `(reviewer CLEAN with evidence + green gate + verification passed) set status ` +
        `"complete" in .uroboros/active-run.json; if you must stop (round cap ` +
        `exhausted, unrecoverable error), set status "stopped" and report to ` +
        `the user.`,
    })
  );
  process.exit(0);
});
