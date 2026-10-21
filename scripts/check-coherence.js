#!/usr/bin/env node
// Coherence check for the Uroboros repository (AGENTS.md, "How a change is
// made", step 5). Every rule is derived from the files themselves — no list
// of names is copied here, so the check cannot drift from what it checks.
// Node standard library only. Exits 1 and lists every failure, else exits 0.

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_DIR = path.join(ROOT, 'references', 'spec-kit-snapshot');
const REPORT_NAMES = ['LOOP-REVIEW-FINDINGS', 'LOOP-REFUTER-RESULTS', 'IMPLEMENTER-REPORT', 'VERIFIER-REPORT'];
const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'];

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
const isSnapshot = (file) => file.startsWith(SNAPSHOT_DIR + path.sep);

/** Markdown the plugin and its maintainers read — the third-party snapshot excluded. */
function pluginMarkdown() {
  return ALL_FILES.filter((f) => f.endsWith('.md') && !isSnapshot(f));
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
        if (/^[<{*|]/.test(after)) continue; // a template: model-guides/<family>-<version>.md, uroboros-reviewer-low|medium|….md
        const target = match[1].replace(/[.,:]+$/, '');
        if (!fs.existsSync(path.join(ROOT, target))) failures.push(`${rel(file)}:${i + 1} cites ${target}, which does not exist`);
      }
    });
  }
  return failures;
}

/** The effort variants of each agent role are identical except their name, the effort word in their description, and effort. */
function checkAgentVariants() {
  const failures = [];
  const roles = new Map();
  for (const file of ALL_FILES.filter((f) => rel(f).startsWith('agents/') && f.endsWith('.md'))) {
    const match = /^uroboros-(\w+)-(\w+)\.md$/.exec(path.basename(file));
    if (!match) continue;
    const [, role, effort] = match;
    const effortWord = new RegExp(`\\b${effort}\\b`, 'g');
    const normalized = read(file)
      .split(/\r?\n/)
      .map((line) => (/^(name|description|effort):/.test(line) ? line.replace(effortWord, '<effort>') : line))
      .join('\n');
    if (!roles.has(role)) roles.set(role, new Map());
    roles.get(role).set(effort, normalized);
  }
  for (const [role, variants] of roles) {
    const missing = EFFORTS.filter((e) => !variants.has(e));
    if (missing.length) failures.push(`agents: role ${role} has no variant for ${missing.join(', ')}`);
    const [first, ...rest] = [...variants.entries()];
    for (const [effort, text] of rest) {
      if (text !== first[1]) failures.push(`agents: uroboros-${role}-${effort}.md differs from uroboros-${role}-${first[0]}.md beyond name, description effort and effort`);
    }
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

/** Each snapshot's hashes.json matches the sha256 of its files' LF content, and lists every skill file of the snapshot. */
function checkSnapshotHashes() {
  const failures = [];
  if (!fs.existsSync(SNAPSHOT_DIR)) return failures;
  for (const entry of fs.readdirSync(SNAPSHOT_DIR, { withFileTypes: true }).filter((e) => e.isDirectory())) {
    const dir = path.join(SNAPSHOT_DIR, entry.name);
    const hashesFile = path.join(dir, 'hashes.json');
    if (!fs.existsSync(hashesFile)) {
      failures.push(`${rel(dir)} has no hashes.json`);
      continue;
    }
    const hashes = JSON.parse(read(hashesFile));
    for (const [name, expected] of Object.entries(hashes)) {
      const file = path.join(dir, name);
      if (!fs.existsSync(file)) {
        failures.push(`${rel(hashesFile)} lists ${name}, which does not exist`);
        continue;
      }
      const actual = crypto.createHash('sha256').update(read(file).replace(/\r\n/g, '\n'), 'utf8').digest('hex');
      if (actual !== expected) failures.push(`${rel(file)} does not match its hash in ${rel(hashesFile)}`);
    }
    for (const file of ALL_FILES.filter((f) => f.startsWith(dir + path.sep) && path.basename(f) === 'SKILL.md')) {
      const name = path.relative(dir, file).split(path.sep).join('/');
      if (!(name in hashes)) failures.push(`${rel(file)} is not listed in ${rel(hashesFile)}`);
    }
  }
  return failures;
}

/** The compat contract's human-readable half states the baseline and the supported range its JSON half records. */
function checkCompatSync() {
  const json = JSON.parse(read(path.join(ROOT, 'references', 'spec-kit-compat.json')));
  const md = read(path.join(ROOT, 'references', 'spec-kit-compat.md'));
  const expected = { 'baseline.version': json.baseline.version, 'baseline.line': json.baseline.line, supported_range: json.supported_range };
  return Object.entries(expected)
    .filter(([, value]) => !md.includes(value))
    .map(([key, value]) => `references/spec-kit-compat.md does not state ${key} "${value}" from spec-kit-compat.json`);
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
  ['agent variants differ only in effort', checkAgentVariants],
  ['report values match the templates', checkReportValues],
  ['JSON parses', checkJson],
  ['hooks pass node --check', checkHookSyntax],
  ['snapshot hashes match', checkSnapshotHashes],
  ['compat .md matches .json', checkCompatSync],
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
