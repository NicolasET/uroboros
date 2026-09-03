#!/usr/bin/env node
// Stop hook for Uroboros goal mode (--goal). Replicates /goal semantics:
// while .uroboros/active-run.json records an active goal run, block the stop
// so the session relaunches and the orchestrator resumes from loop-state.md.
// Allows the stop (exit 0, no output) on ANY doubt — this hook must never
// trap a session it cannot account for.

'use strict';

const fs = require('fs');
const path = require('path');

function allow() {
  process.exit(0);
}

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  raw += chunk;
});
process.stdin.on('end', () => {
  let cwd = process.cwd();
  try {
    const input = JSON.parse(raw);
    if (typeof input.cwd === 'string' && input.cwd) cwd = input.cwd;
  } catch (_) {
    // stdin was not JSON — fall back to process cwd
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

  const max = Number.isFinite(run.rounds_max) ? run.rounds_max : 3;
  const relaunches = Number.isFinite(run.relaunches) ? run.relaunches : 0;
  if (relaunches >= max) {
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
        `Uroboros goal run "${run.feature || 'unknown'}" is still active ` +
        `(relaunch ${run.relaunches}/${max}). Read ${dir}/loop-state.md and ` +
        `.uroboros/active-run.json, then resume the goal loop per the uroboros ` +
        `goal protocol (references/goal-protocol.md). When the goal is met ` +
        `(reviewer CLEAN with evidence + green verification gate) set status ` +
        `"complete" in .uroboros/active-run.json; if you must stop (round cap ` +
        `exhausted, unrecoverable error), set status "stopped" and report to ` +
        `the user.`,
    })
  );
  process.exit(0);
});
