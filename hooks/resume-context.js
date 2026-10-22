#!/usr/bin/env node
// SessionStart hook (matcher "compact") for Uroboros. After the context of a
// session is compacted mid-run, it reminds the session that owns the active
// run where its state lives, so the orchestrator re-reads it and goes on with
// the resume check instead of working from a summary. Emits nothing on ANY
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

  const goal = run.mode === 'goal' || (run.mode === undefined && Object.prototype.hasOwnProperty.call(run, 'rounds_max'));
  const dir = typeof run.dir === 'string' && run.dir ? run.dir : '';
  const stateFile = typeof run.state_file === 'string' && run.state_file ? run.state_file : dir ? `${dir}/loop-state.md` : '';
  if (!stateFile) {
    quiet();
    return;
  }

  const read = [path.join(pluginRoot, 'skills', 'run', 'SKILL.md')];
  if (goal) read.push(path.join(pluginRoot, 'references', 'goal-protocol.md'));
  read.push(path.resolve(cwd, stateFile), path.join(cwd, '.uroboros', 'active-run.json'));

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext:
          `Uroboros ${goal ? 'goal' : 'SDD'} run "${run.feature || 'unknown'}" is active in this session and its context was just compacted. ` +
          `Before doing anything else, re-read in full: ${read.join(', ')}. ` +
          `Then follow the resume check (${goal ? 'goal protocol, "When the hook relaunches you"' : 'Phase −1'}) — open dispatches, stale results, base drift — and continue from the point recorded in the state file.`,
      },
    })
  );
  process.exit(0);
});
