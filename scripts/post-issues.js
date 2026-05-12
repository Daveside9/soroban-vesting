#!/usr/bin/env node
/**
 * post-issues.js
 * Parses ISSUES_TO_POST.txt and creates all issues on GitHub via the REST API.
 * Skips issues that already exist (matched by title) to avoid duplicates.
 *
 * Usage:
 *   GITHUB_TOKEN=your_pat_here node scripts/post-issues.js
 *
 * In GitHub Actions, set a repository secret named ISSUES_PAT with a
 * Personal Access Token that has the 'public_repo' scope.
 *
 * Get a PAT at: https://github.com/settings/tokens
 */

const https = require('https');
const fs    = require('fs');
const path  = require('path');

// ── Config ────────────────────────────────────────────────────────────────────

const REPO_OWNER  = 'Daveside9';
const REPO_NAME   = 'soroban-vesting';
const ISSUES_FILE = path.join(__dirname, '..', 'ISSUES_TO_POST.txt');
const DELAY_MS    = 2000; // 2 s between requests — respects GitHub rate limits

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

// ── GitHub API helper ─────────────────────────────────────────────────────────

function githubRequest(method, apiPath, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;

    const options = {
      hostname: 'api.github.com',
      path:     apiPath,
      method,
      headers: {
        'Authorization':        `token ${GITHUB_TOKEN}`,
        'Content-Type':         'application/json',
        'User-Agent':           'soroban-vesting-issue-poster',
        'Accept':               'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ── Fetch all existing issue titles (handles pagination) ──────────────────────

async function fetchExistingTitles() {
  const titles = new Set();
  let page = 1;

  while (true) {
    const { status, body } = await githubRequest(
      'GET',
      `/repos/${REPO_OWNER}/${REPO_NAME}/issues?state=all&per_page=100&page=${page}`
    );

    if (status !== 200 || !Array.isArray(body) || body.length === 0) break;

    for (const issue of body) {
      titles.add(issue.title.trim());
    }

    if (body.length < 100) break;
    page++;
  }

  return titles;
}

// ── Parser ────────────────────────────────────────────────────────────────────

function parseIssues(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const issues  = [];

  const blocks = content.split(/═{10,}/);

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🚀  Posting issues to ${REPO_OWNER}/${REPO_NAME}\n`);

  // Parse issues file
  const issues = parseIssues(ISSUES_FILE);
  console.log(`📋  Found ${issues.length} issues in ISSUES_TO_POST.txt`);

  // Fetch already-existing issues to avoid duplicates
  console.log(`🔍  Checking for existing issues...\n`);
  const existingTitles = await fetchExistingTitles();
  console.log(`    ${existingTitles.size} issues already exist on GitHub\n`);

  let created = 0;
  let skipped = 0;
  let failed  = 0;

  for (let i = 0; i < issues.length; i++) {
    const issue = issues[i];
    const num   = i + 1;

    // Skip if already exists
    if (existingTitles.has(issue.title)) {
      console.log(`⏭️   [${num}/${issues.length}] SKIP (already exists) — ${issue.title}`);
      skipped++;
      continue;
    }

    try {
      const { status, body } = await githubRequest(
        'POST',
        `/repos/${REPO_OWNER}/${REPO_NAME}/issues`,
        { title: issue.title, body: issue.body, labels: issue.labels }
      );

      if (status === 201) {
        console.log(`✅  [${num}/${issues.length}] #${body.number} created — ${issue.title}`);
        created++;
      } else {
        console.error(`❌  [${num}/${issues.length}] HTTP ${status} — ${issue.title}`);
        console.error(`    ${JSON.stringify(body)}`);
        failed++;
      }
    } catch (err) {
      console.error(`❌  [${num}/${issues.length}] ERROR — ${issue.title}`);
      console.error(`    ${err.message}`);
      failed++;
    }

    // Respect GitHub rate limits
    if (i < issues.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  console.log(`\n─────────────────────────────────────────────────`);
  console.log(`✅  Created : ${created}`);
  console.log(`⏭️   Skipped : ${skipped} (already existed)`);
  if (failed > 0) console.log(`❌  Failed  : ${failed}`);
  console.log(`🔗  View    : https://github.com/${REPO_OWNER}/${REPO_NAME}/issues`);
  console.log(`─────────────────────────────────────────────────\n`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
