// Dependency audit gate: fails on any high or critical production advisory that is not allowlisted with a reason.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const GHSA = /^GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/;
const BLOCKING = new Set(['high', 'critical']);

function checkAudit(ndjsonText, allowlist) {
  const violations = [];
  const badEntries = [];
  const seen = new Set();
  const flagged = new Set();
  let complete = false;

  const honoured = new Set();
  for (const [id, reason] of Object.entries(allowlist || {})) {
    if (!GHSA.test(id)) {
      badEntries.push({ id, problem: 'key is not a GHSA id' });
    } else if (typeof reason !== 'string' || !reason.trim()) {
      badEntries.push({ id, problem: 'reason is empty' });
    } else {
      honoured.add(id);
    }
  }

  for (const line of ndjsonText.split('\n')) {
    if (!line.trim()) {
      continue;
    }
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      complete = false;
      return { complete, violations, badEntries, unused: [] };
    }
    if (entry.type === 'auditSummary') {
      complete = true;
    } else if (entry.type === 'auditAdvisory') {
      const a = entry.data.advisory;
      if (!BLOCKING.has(a.severity) || seen.has(a.github_advisory_id)) {
        continue;
      }
      seen.add(a.github_advisory_id);
      flagged.add(a.github_advisory_id);
      if (!honoured.has(a.github_advisory_id)) {
        violations.push({
          id: a.github_advisory_id,
          severity: a.severity,
          module: a.module_name,
          title: a.title,
        });
      }
    }
  }

  const unused = [...honoured].filter((id) => !flagged.has(id));
  return { complete, violations, badEntries, unused };
}

function main() {
  const root = path.resolve(__dirname, '..');
  const allowlist = JSON.parse(fs.readFileSync(path.join(root, 'audit-allowlist.json'), 'utf8'));
  let text;
  if (process.argv[2]) {
    text = fs.readFileSync(process.argv[2], 'utf8');
  } else {
    // yarn audit exits non-zero whenever any advisory exists, so only its output is used.
    const res = spawnSync(
      process.execPath,
      ['.yarn/releases/yarn-classic.cjs', 'audit', '--groups', 'dependencies', '--json'],
      { cwd: root, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }
    );
    text = res.stdout || '';
  }

  const { complete, violations, badEntries, unused } = checkAudit(text, allowlist);
  for (const v of violations) {
    console.error(`${v.id} ${v.severity} ${v.module} ${v.title}`);
  }
  for (const b of badEntries) {
    console.error(`bad allowlist entry ${b.id}: ${b.problem}`);
  }
  for (const id of unused) {
    console.warn(`warning: allowlist entry ${id} no longer matches an advisory`);
  }
  if (!complete) {
    console.error('audit did not complete (no auditSummary line): failing closed');
  }
  if (violations.length || badEntries.length || !complete) {
    process.exit(1);
  }
  console.log('audit ok');
}

if (require.main === module) {
  main();
}

module.exports = { checkAudit };
