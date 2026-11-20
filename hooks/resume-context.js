#!/usr/bin/env node
// SessionStart hook (matcher "compact") for Uroboros. After the context of a
// session is compacted mid-run, it tells the session that owns the active
// run where its rules and its state live, so the orchestrator re-reads them
// and goes on with the resume check instead of working from a summary. Emits nothing on ANY
// doubt: no marker, an inactive run, another session's run, unreadable input.

'use strict';

const fs = require('fs');
const path = require('path');

const pluginRoot = path.resolve(__dirname, '..');

function quiet() {
  process.exit(0);
}

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  raw += chunk;
});
process.stdin.on('end', () => {
  let input;
  try {
    input = JSON.parse(raw);
  } catch (_) {
    quiet();
    return;
  }
  const cwd = typeof input.cwd === 'string' && input.cwd ? input.cwd : '';
  const sessionId = typeof input.session_id === 'string' ? input.session_id : '';
  if (!cwd || !sessionId || (input.source !== undefined && input.source !== 'compact')) {
    quiet();
    return;
  }

  let run;
  try {
    run = JSON.parse(fs.readFileSync(path.join(cwd, '.uroboros', 'active-run.json'), 'utf8'));
  } catch (_) {
    quiet();
    return;
  }
  if (!run || run.status !== 'active' || run.session_id !== sessionId) {
    quiet();
    return;
  }

  // A marker with another `mode` belongs to a run of spec-kit's pipeline,
  // which left the plugin in 1.0.0: there is nothing to resume. A marker
  // without `mode` predates 0.21.0 and is a run only if it carries the round fields.
  const isRun = run.mode === 'goal' || (run.mode === undefined && Object.prototype.hasOwnProperty.call(run, 'rounds_max'));
  if (!isRun) {
    quiet();
    return;
  }
  const dir = typeof run.dir === 'string' && run.dir ? run.dir : '';
  const stateFile = typeof run.state_file === 'string' && run.state_file ? run.state_file : dir ? `${dir}/loop-state.md` : '';
  if (!stateFile) {
    quiet();
    return;
  }

  const read = [path.join(pluginRoot, 'skills', 'run', 'SKILL.md'), path.resolve(cwd, stateFile), path.join(cwd, '.uroboros', 'active-run.json')];

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext:
          // Worded as facts, as the hooks reference asks of SessionStart context.
          `Uroboros run "${run.feature || 'unknown'}" is active in this session, and the session's context was just compacted. ` +
          `The run's rules and its state are on disk, in these files: ${read.join(', ')}. ` +
          `A compacted run goes on from those files, read in full, starting at the resume check (Phase −1) — open dispatches, stale results, base drift — and continues from the point the state file records.`,
      },
    })
  );
  process.exit(0);
});
