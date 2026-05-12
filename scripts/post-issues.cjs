#!/usr/bin/env node
/**
 * post-issues.js
 * Parses ISSUES_TO_POST.txt and creates all issues using the GitHub CLI (gh).
 *
 * Setup (one time only):
 *   1. Install GitHub CLI: https://cli.github.com
 *   2. Run: gh auth login   (follow the browser prompts)
 *
 * Then run this script:
 *   node scripts/post-issues.js
 */

const { execSync } = require('child_process');
const fs   = require('fs');
const path = require('path');

const REPO        = 'Daveside9/soroban-vesting';
const ISSUES_FILE = path.join(__dirname, '..', 'ISSUES_TO_POST.txt');

// ── Check gh is installed ─────────────────────────────────────────────────────

try {
  execSync('gh --version', { stdio: 'ignore' });
} catch {
  console.error('❌  GitHub CLI (gh) is not installed.');
  console.error('    Download it from: https://cli.github.com');
  process.exit(1);
}

// ── Parser ────────────────────────────────────────────────────────────────────

function parseIssues(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const issues  = [];
  const blocks  = content.split(/═{10,}/);

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed || trimmed.startsWith('END —')) continue;
    if (!/ISSUE #\d+/.test(trimmed)) continue;

    const titleMatch = trimmed.match(/^Title:\s*(.+)$/m);
    if (!titleMatch) continue;
    const title = titleMatch[1].trim();

    const labelsMatch = trimmed.match(/^Labels:\s*(.+)$/m);
    const labels = labelsMatch
      ? labelsMatch[1].split(',').map(l => l.trim()).filter(Boolean)
      : ['Stellar Wave'];

    const descMatch = trimmed.match(/^Description:\s*\n([\s\S]+)$/m);
    const body = descMatch ? descMatch[1].trim() : trimmed;

    issues.push({ title, labels, body });
  }

  return issues;
}

// ── Fetch existing issue titles to skip duplicates ────────────────────────────

function getExistingTitles() {
  try {
    const out = execSync(
      `gh issue list --repo ${REPO} --state all --limit 200 --json title`,
      { encoding: 'utf8' }
    );
    return new Set(JSON.parse(out).map(i => i.title.trim()));
  } catch {
    return new Set();
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

const issues = parseIssues(ISSUES_FILE);
console.log(`\n🚀  Posting issues to ${REPO}`);
console.log(`📋  Found ${issues.length} issues\n`);

console.log('🔍  Checking for existing issues...');
const existing = getExistingTitles();
console.log(`    ${existing.size} already exist — will skip those\n`);

let created = 0;
let skipped = 0;
let failed  = 0;

for (let i = 0; i < issues.length; i++) {
  const { title, labels, body } = issues[i];
  const num = i + 1;

  if (existing.has(title)) {
    console.log(`⏭️   [${num}/${issues.length}] SKIP — ${title}`);
    skipped++;
    continue;
  }

  // Write body to a temp file to avoid shell escaping issues
  const tmpFile = path.join(__dirname, '_tmp_body.md');
  fs.writeFileSync(tmpFile, body, 'utf8');

  try {
    const labelFlag = labels.map(l => `--label "${l}"`).join(' ');
    execSync(
      `gh issue create --repo ${REPO} --title "${title.replace(/"/g, '\\"')}" --body-file "${tmpFile}" ${labelFlag}`,
      { stdio: 'pipe' }
    );
    console.log(`✅  [${num}/${issues.length}] CREATED — ${title}`);
    created++;
  } catch (err) {
    console.error(`❌  [${num}/${issues.length}] FAILED  — ${title}`);
    console.error(`    ${err.stderr?.toString().trim() || err.message}`);
    failed++;
  }

  // Clean up temp file
  if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
}

console.log(`\n─────────────────────────────────────────────────`);
console.log(`✅  Created : ${created}`);
console.log(`⏭️   Skipped : ${skipped}`);
if (failed > 0) console.log(`❌  Failed  : ${failed}`);
console.log(`🔗  View    : https://github.com/${REPO}/issues`);
console.log(`─────────────────────────────────────────────────\n`);
