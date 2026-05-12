#!/usr/bin/env node
/**
 * post-issues.js
 * Parses ISSUES_TO_POST.txt and creates all issues on GitHub via the REST API.
 *
 * Usage:
 *   GITHUB_TOKEN=your_pat_here node scripts/post-issues.js
 *
 * Or create a .env file in the repo root with:
 *   GITHUB_TOKEN=your_pat_here
 *
 * Get a PAT at: https://github.com/settings/tokens
 * Required scope: repo (for private repos) or public_repo (for public repos)
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ── Config ────────────────────────────────────────────────────────────────────

const REPO_OWNER = 'Daveside9';
const REPO_NAME  = 'soroban-vesting';
const ISSUES_FILE = path.join(__dirname, '..', 'ISSUES_TO_POST.txt');

// Load token from env or .env file
let GITHUB_TOKEN = process.env.GITHUB_TOKEN;
if (!GITHUB_TOKEN) {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/^GITHUB_TOKEN=(.+)$/m);
    if (match) GITHUB_TOKEN = match[1].trim();
  }
}
if (!GITHUB_TOKEN) {
  console.error('❌  GITHUB_TOKEN not set. Export it or add it to a .env file.');
  process.exit(1);
}

// ── Parser ────────────────────────────────────────────────────────────────────

function parseIssues(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const issues = [];

  // Split on the separator lines that start each issue block
  const blocks = content.split(/═{10,}/);

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed || trimmed.startsWith('END —')) continue;

    // Must contain an ISSUE # header line
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
    const descMatch = trimmed.match(/^Description:\s*\n([\s\S]+)$/m);
    const body = descMatch ? descMatch[1].trim() : trimmed;

    issues.push({ title, labels, body });
  }

  return issues;
}

// ── GitHub API ────────────────────────────────────────────────────────────────

function createIssue(issue) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      title: issue.title,
      body:  issue.body,
      labels: issue.labels,
    });

    const options = {
      hostname: 'api.github.com',
      path:     `/repos/${REPO_OWNER}/${REPO_NAME}/issues`,
      method:   'POST',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Content-Type':  'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'User-Agent':    'soroban-vesting-issue-poster',
        'Accept':        'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        const json = JSON.parse(data);
        if (res.statusCode === 201) {
          resolve(json);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${json.message || data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// ── Rate limit helper (GitHub allows ~30 issues/min for authenticated users) ──

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🚀  Posting issues to ${REPO_OWNER}/${REPO_NAME}\n`);

  const issues = parseIssues(ISSUES_FILE);
  console.log(`📋  Found ${issues.length} issues to post\n`);

  let created = 0;
  let failed  = 0;

  for (let i = 0; i < issues.length; i++) {
    const issue = issues[i];
    const num   = i + 1;

    try {
      const result = await createIssue(issue);
      console.log(`✅  [${num}/${issues.length}] #${result.number} — ${issue.title}`);
      created++;
    } catch (err) {
      console.error(`❌  [${num}/${issues.length}] FAILED — ${issue.title}`);
      console.error(`    ${err.message}`);
      failed++;
    }

    // Wait 2 seconds between requests to respect GitHub rate limits
    if (i < issues.length - 1) {
      await sleep(2000);
    }
  }

  console.log(`\n─────────────────────────────────────────`);
  console.log(`✅  Created : ${created}`);
  if (failed > 0) {
    console.log(`❌  Failed  : ${failed}`);
  }
  console.log(`🔗  View    : https://github.com/${REPO_OWNER}/${REPO_NAME}/issues`);
  console.log(`─────────────────────────────────────────\n`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
