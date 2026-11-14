#!/usr/bin/env node
// PreToolUse hook (matcher "AskUserQuestion") for Uroboros. The plugin never
// marks an option as recommended (AGENTS.md invariant 6), but AskUserQuestion's
// own tool description asks the model to add "(Recommended)" to the option it
// recommends. This hook refuses such a question in the session that owns a run
// — the active-run marker, or the intake draft's SESSION line before the marker
// exists — and tells the orchestrator to ask it again without the mark. It
// emits nothing on ANY doubt: unreadable input, no run, another session's run.

'use strict';

const fs = require('fs');
const path = require('path');

// A mark is a parenthesized or bracketed word meaning "recommended", "suggested",
// "preferred" or "default" in the languages the plugin's users write in. Only the
// mark form is matched, so a product that has "recommendations" can still be asked about.
const WORDS =
  'recommended|recommend|suggested|preferred|default|' +
  'recomendad[ao]s?|recomendable|sugerid[ao]s?|preferid[ao]s?|por defecto|predeterminad[ao]|' +
  'recommand[ée]e?s?|sugg[ée]r[ée]e?s?|par d[ée]faut|' +
  'empfohlen|voreingestellt|' +
  'consigliat[ao]|predefinit[ao]|' +
  'recomendad[ao]|padr[ãa]o';
const MARK = new RegExp(`[(\\[]\\s*(?:${WORDS})\\s*[)\\]]`, 'i');

function quiet() {
  process.exit(0);
}

function ownsRun(cwd, sessionId) {
  try {
    const run = JSON.parse(fs.readFileSync(path.join(cwd, '.uroboros', 'active-run.json'), 'utf8'));
    if (run && run.status === 'active' && run.session_id === sessionId) return true;
  } catch (_) {
    // no marker yet: intake may be in progress
  }
  try {
    const intake = fs.readFileSync(path.join(cwd, '.uroboros', 'intake.md'), 'utf8');
    return intake.split(/\r?\n/).some((line) => line.trim() === `SESSION: ${sessionId}`);
  } catch (_) {
    return false;
  }
}

function markedOption(questions) {
  if (!Array.isArray(questions)) return '';
  for (const q of questions) {
    if (!q || !Array.isArray(q.options)) continue;
    for (const o of q.options) {
      if (!o) continue;
      for (const text of [o.label, o.description]) {
        if (typeof text === 'string' && MARK.test(text)) return typeof o.label === 'string' ? o.label : text;
      }
    }
  }
  return '';
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
  if (!cwd || !sessionId || input.tool_name !== 'AskUserQuestion' || !input.tool_input) {
    quiet();
    return;
  }
  const label = markedOption(input.tool_input.questions);
  if (!label || !ownsRun(cwd, sessionId)) {
    quiet();
    return;
  }

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason:
          `Uroboros: the option "${label}" is marked as recommended, suggested, preferred or default. ` +
          'A Uroboros run never marks an option that way (Question protocol, "No option is recommended"), ' +
          "even though AskUserQuestion's own description asks for it. Remove the mark and ask the same question again.",
      },
    })
  );
  process.exit(0);
});
