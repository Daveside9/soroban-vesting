#!/usr/bin/env node
/**
 * post-issues.cjs
 * Parses ISSUES_TO_POST.txt and creates all issues using the GitHub CLI (gh).
 *
 * Setup (one time only):
 *   1. Install GitHub CLI: https://cli.github.com
 *   2. Run: gh auth login
 *
 * Then run:
 *   node scripts/post-issues.cjs
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
  console.error('❌  GitHub CLI (gh) is not installed. Download: https://cli.github.com');
  process.exit(1);
}

// ── Parser — splits on any line that contains "ISSUE #N" ─────────────────────
function parseIssues(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const issues  = [];

  // Split on lines that look like a separator (lots of repeated chars) followed by ISSUE #N
  // Works regardless of what character was used for the separator line
  const blocks = content.split(/\n[^\n]{5,}\n(?=.*ISSUE #\d+)/);

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    // Must have an ISSUE # marker
    if (!/ISSUE #\d+/.test(trimmed)) continue;

    // Extract title
    const titleMatch = trimmed.match(/^Title:\s*(.+)$/m);
    if (!titleMatch) continue;
    const title = titleMatch[1].trim();

    // Extract labels
    const labelsMatch = trimmed.match(/^Labels:\s*(.+)$/m);
    const labels = labelsMatch
      ? labelsMatch[1].split(',').map(l => l.trim()).filter(Boolean)
      : ['Stellar Wave'];

    // Extract description body (everything after "Description:")
    const descMatch = trimmed.match(/^Description:\s*\n([\s\S]+?)(?=\n\*\*Complexity|$)/m);
    const body = descMatch ? descMatch[1].trim() : trimmed;

    issues.push({ title, labels, body });
  }

  return issues;
}

// ── Alternative parser — line by line state machine (more robust) ─────────────
function parseIssuesRobust(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const issues  = [];

  // Find all Title: lines and build issues from surrounding context
  const titleRegex = /^Title:\s*(.+)$/gm;
  const labelsRegex = /^Labels:\s*(.+)$/gm;
  const descRegex = /^Description:\s*\n([\s\S]+?)(?=\n(?:═|─|=|-){10,}|\nEND —|$)/gm;

  // Get all positions
  const titles  = [...content.matchAll(/^Title:\s*(.+)$/gm)];
  const labels  = [...content.matchAll(/^Labels:\s*(.+)$/gm)];
  const descs   = [...content.matchAll(/^Description:\s*\n([\s\S]+?)(?=\n.{10,}\n(?:ISSUE|END)|$)/gm)];

  for (let i = 0; i < titles.length; i++) {
    const title  = titles[i][1].trim();
    const lblStr = labels[i] ? labels[i][1] : 'Stellar Wave';
    const lblArr = lblStr.split(',').map(l => l.trim()).filter(Boolean);
    const body   = descs[i] ? descs[i][1].trim() : '';

    if (title) {
      issues.push({ title, labels: lblArr, body });
    }
  }

  return issues;
}

// ── Fetch existing issue titles to skip duplicates ────────────────────────────
function getExistingTitles() {
  try {
    const out = execSync(
      `gh issue list --repo ${REPO} --state all --limit 500 --json title`,
      { encoding: 'utf8' }
    );
    return new Set(JSON.parse(out).map(i => i.title.trim()));
  } catch {
    return new Set();
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
const issues = parseIssuesRobust(ISSUES_FILE);
console.log(`\n🚀  Posting issues to ${REPO}`);
console.log(`📋  Found ${issues.length} issues in ISSUES_TO_POST.txt\n`);

if (issues.length === 0) {
  console.error('❌  No issues parsed. Check ISSUES_TO_POST.txt format.');
  process.exit(1);
}

console.log('🔍  Checking for existing issues on GitHub...');
const existing = getExistingTitles();
console.log(`    ${existing.size} already exist — will skip those\n`);

let created = 0;
let skipped = 0;
let failed  = 0;
const tmpFile = path.join(__dirname, '_tmp_body.md');

for (let i = 0; i < issues.length; i++) {
  const { title, labels, body } = issues[i];
  const num = i + 1;

  if (existing.has(title)) {
    console.log(`⏭️   [${num}/${issues.length}] SKIP — ${title}`);
    skipped++;
    continue;
  }

  // Write body to temp file to avoid shell escaping issues
  fs.writeFileSync(tmpFile, body, 'utf8');

  // Only use labels that are valid (avoid failures from unknown labels)
  const safeLabels = labels
    .filter(l => ['Stellar Wave','enhancement','bug','documentation','testing','chore','ci','high complexity','medium complexity','trivial'].includes(l))
    .map(l => `--label "${l}"`)
    .join(' ');

  const safeTitle = title.replace(/"/g, '\\"').replace(/`/g, '\\`');

  try {
    execSync(
      `gh issue create --repo ${REPO} --title "${safeTitle}" --body-file "${tmpFile}" ${safeLabels}`,
      { stdio: 'pipe' }
    );
    console.log(`✅  [${num}/${issues.length}] CREATED — ${title}`);
    created++;
  } catch (err) {
    const errMsg = err.stderr?.toString().trim() || err.message;
    console.error(`❌  [${num}/${issues.length}] FAILED  — ${title}`);
    console.error(`    ${errMsg}`);
    failed++;
  }

  if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
}

console.log(`\n─────────────────────────────────────────────────`);
console.log(`✅  Created : ${created}`);
console.log(`⏭️   Skipped : ${skipped}`);
if (failed > 0) console.log(`❌  Failed  : ${failed}`);
console.log(`🔗  View    : https://github.com/${REPO}/issues`);
console.log(`─────────────────────────────────────────────────\n`);
