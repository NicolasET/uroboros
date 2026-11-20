#!/usr/bin/env node
// Coherence check for the Uroboros repository (AGENTS.md, "How a change is
// made", step 5). Every rule is derived from the files themselves — no list
// of names is copied here, so the check cannot drift from what it checks.
// Node standard library only. Exits 1 and lists every failure, else exits 0.

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const REPORT_NAMES = ['LOOP-REVIEW-FINDINGS', 'LOOP-REFUTER-RESULTS', 'IMPLEMENTER-REPORT', 'VERIFIER-REPORT'];
const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'];
const ROLES = ['reviewer', 'implementer', 'verifier'];

// ---------------------------------------------------------------- files

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

const ALL_FILES = walk(ROOT);
const rel = (file) => path.relative(ROOT, file).split(path.sep).join('/');
const read = (file) => fs.readFileSync(file, 'utf8');

/** Markdown the plugin and its maintainers read. */
function pluginMarkdown() {
  return ALL_FILES.filter((f) => f.endsWith('.md'));
}

// ---------------------------------------------------------------- checks

/** Every repository path a markdown file cites exists. CHANGELOG is history: it may name files since renamed. */
function checkCitedPaths() {
  const failures = [];
  const cited = /(?<![\w./-])(?:\.\/)?((?:references|agents|hooks|skills|scripts|\.claude-plugin)\/[\w./-]*)/g;
  for (const file of pluginMarkdown()) {
    if (rel(file) === 'CHANGELOG.md') continue;
    const text = read(file).replace(/\$\{CLAUDE_PLUGIN_ROOT\}\//g, ' ');
    text.split(/\r?\n/).forEach((line, i) => {
      for (const match of line.matchAll(cited)) {
        const after = line.slice(match.index + match[0].length);
        if (/^[<{*]/.test(after)) continue; // a template: model-guides/<family>-<version>.md
        const target = match[1].replace(/[.,:]+$/, '');
        if (!fs.existsSync(path.join(ROOT, target))) failures.push(`${rel(file)}:${i + 1} cites ${target}, which does not exist`);
      }
    });
  }
  return failures;
}

/**
 * One agent per role, and nothing else: effort is passed on each dispatch, so no per-effort variant exists.
 * Each agent is a thin pointer to its role file — its frontmatter names it and sets a default model and effort,
 * and its body sends the subagent to the `INSTRUCTIONS:` line instead of carrying rules of its own.
 */
function checkAgents() {
  const failures = [];
  const expected = new Set(ROLES.map((role) => `uroboros-${role}.md`));
  const found = ALL_FILES.filter((f) => rel(f).startsWith('agents/') && f.endsWith('.md'));
  for (const file of found) {
    if (!expected.has(path.basename(file))) failures.push(`agents: ${rel(file)} is not one of ${[...expected].join(', ')}`);
  }
  for (const role of ROLES) {
    const file = path.join(ROOT, 'agents', `uroboros-${role}.md`);
    if (!fs.existsSync(file)) {
      failures.push(`agents: uroboros-${role}.md is missing`);
      continue;
    }
    const parts = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(read(file));
    if (!parts) {
      failures.push(`agents: uroboros-${role}.md has no frontmatter`);
      continue;
    }
    const [, frontmatter, body] = parts;
    const field = (key) => (new RegExp(`^${key}:\\s*(.+)$`, 'm').exec(frontmatter) || [])[1];
    if (field('name') !== `uroboros-${role}`) failures.push(`agents: uroboros-${role}.md is named ${field('name')}`);
    if (!field('model')) failures.push(`agents: uroboros-${role}.md sets no default model`);
    if (!EFFORTS.includes(field('effort'))) failures.push(`agents: uroboros-${role}.md has effort ${field('effort')}; expected one of ${EFFORTS.join(', ')}`);
    if (!body.includes('INSTRUCTIONS:')) failures.push(`agents: uroboros-${role}.md does not point to its INSTRUCTIONS: line`);
    if (body.trim().split(/\r?\n/).length > 3) failures.push(`agents: uroboros-${role}.md carries more than a pointer — role rules live in references/${role}-instructions.md`);
  }
  return failures;
}

/** Keys of the four report templates whose value is an enum `<a | b>`, with the union of their values. */
function reportEnums() {
  const enums = new Map();
  for (const file of pluginMarkdown()) {
    for (const block of read(file).split('```').filter((_, i) => i % 2 === 1)) {
      const lines = block.split(/\r?\n/).filter((l) => l.trim());
      if (!lines.length || !REPORT_NAMES.includes(lines[0].trim())) continue;
      for (const line of lines.slice(1)) {
        const m = /^\s*(?:-\s*)?([a-z_]+):\s*<([^<>]+)>\s*$/.exec(line);
        if (!m || !m[2].includes('|')) continue;
        const values = m[2].split('|').map((v) => v.trim());
        if (!values.every((v) => /^[\w -]+$/.test(v))) continue;
        if (!enums.has(m[1])) enums.set(m[1], new Set());
        values.forEach((v) => enums.get(m[1]).add(v));
      }
    }
  }
  return enums;
}

/** Every `key: value` the prompts cite for a report key with an enum uses one of that enum's values. */
function checkReportValues() {
  const failures = [];
  const enums = reportEnums();
  if (!enums.size) return ['report templates: no enum found — the template parser no longer matches the role files'];
  for (const file of pluginMarkdown().filter((f) => /^(skills|references)\//.test(rel(f)))) {
    read(file).split(/\r?\n/).forEach((line, i) => {
      for (const m of line.matchAll(/`([a-z_]+):\s*([^`]+)`/g)) {
        const [, key, raw] = m;
        const value = raw.trim();
        if (!enums.has(key) || /^["'<]/.test(value)) continue;
        if (!enums.get(key).has(value)) failures.push(`${rel(file)}:${i + 1} cites \`${key}: ${value}\`; the report templates allow ${[...enums.get(key)].join(' | ')}`);
      }
    });
  }
  return failures;
}

/** Every JSON file parses. */
function checkJson() {
  const failures = [];
  for (const file of ALL_FILES.filter((f) => f.endsWith('.json'))) {
    try {
      JSON.parse(read(file));
    } catch (err) {
      failures.push(`${rel(file)} does not parse: ${err.message}`);
    }
  }
  return failures;
}

/** Every hook script passes `node --check`. */
function checkHookSyntax() {
  const failures = [];
  for (const file of ALL_FILES.filter((f) => rel(f).startsWith('hooks/') && f.endsWith('.js'))) {
    const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    if (result.status !== 0) failures.push(`${rel(file)} fails node --check: ${(result.stderr || '').trim().split(/\r?\n/)[0]}`);
  }
  return failures;
}

/** The manifest version is the CHANGELOG's latest section. */
function checkVersion() {
  const version = JSON.parse(read(path.join(ROOT, '.claude-plugin', 'plugin.json'))).version;
  const latest = /^## (\d+\.\d+\.\d+)\b/m.exec(read(path.join(ROOT, 'CHANGELOG.md')));
  if (!latest) return ['CHANGELOG.md has no "## x.y.z" section'];
  return latest[1] === version ? [] : [`plugin.json is ${version} but the latest CHANGELOG section is ${latest[1]}`];
}

/** Every flag of the orchestrator's flag table is in its argument-hint and in the README's flag table. */
function checkFlags() {
  const failures = [];
  const skill = read(path.join(ROOT, 'skills', 'run', 'SKILL.md'));
  const readme = read(path.join(ROOT, 'README.md'));
  const hint = (/^argument-hint:\s*(.*)$/m.exec(skill) || [])[1] || '';
  const flags = [...skill.matchAll(/^\|\s*`(--[a-z-]+)/gm)].map((m) => m[1]);
  if (!flags.length) return ['skills/run/SKILL.md: no flag table found'];
  for (const flag of new Set(flags)) {
    if (!hint.includes(flag)) failures.push(`skills/run/SKILL.md: flag ${flag} is missing from argument-hint`);
    if (!new RegExp(`^\\|\\s*\`${flag}`, 'm').test(readme)) failures.push(`README.md: flag ${flag} is missing from the flags table`);
  }
  return failures;
}

// ---------------------------------------------------------------- main

const CHECKS = [
  ['cited paths exist', checkCitedPaths],
  ['one thin agent per role', checkAgents],
  ['report values match the templates', checkReportValues],
  ['JSON parses', checkJson],
  ['hooks pass node --check', checkHookSyntax],
  ['plugin.json matches CHANGELOG', checkVersion],
  ['flags are documented', checkFlags],
];

let failed = 0;
for (const [name, check] of CHECKS) {
  const failures = check();
  if (failures.length) {
    failed += failures.length;
    console.log(`FAIL ${name}`);
    failures.forEach((f) => console.log(`  - ${f}`));
  } else {
    console.log(`ok   ${name}`);
  }
}
if (failed) {
  console.log(`\n${failed} failure(s).`);
  process.exit(1);
}
