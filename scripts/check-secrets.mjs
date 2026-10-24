#!/usr/bin/env node
// Blocks secrets from being committed.
//   node scripts/check-secrets.mjs          scan what is staged for the next commit (used by the pre-commit hook)
//   node scripts/check-secrets.mjs --all    scan every tracked file in the working tree
// Add `secret-scan:ignore` in a comment on a line to allow a known false positive.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const git = (args, opts = {}) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 1 << 28, ...opts });
const all = process.argv.includes('--all');
const root = git(['rev-parse', '--show-toplevel']).trim();
process.chdir(root);

const files = (all ? git(['ls-files', '-z']) : git(['diff', '--cached', '--name-only', '--diff-filter=ACM', '-z']))
  .split('\0')
  .filter(Boolean);

const FORBIDDEN_PATH = [
  [/(^|\/)\.env(\.[^/]+)?$/i, (p) => !/\.env\.example$/i.test(p), 'environment file (only .env.example may be committed)'],
  [/\.(pem|key|p12|pfx|keystore)$/i, () => true, 'private key / certificate file'],
  [/(^|\/)(service-account|.*credentials).*\.json$/i, () => true, 'credentials file'],
  [/(^|\/)\.localdb\//, () => true, 'local database files'],
];

const PLACEHOLDER = /(example|change-?me|placeholder|your[_-]|xxxx|<[^>]+>|\$\{|process\.env|PASSWORD|campusconnect:campusconnect|dev-callback|test-secret|not-used-in-prod)/i;
const PATTERNS = [
  ['JWT / service key', /eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}/],
  ['AWS access key', /\b(AKIA|ASIA)[0-9A-Z]{16}\b/],
  ['Stripe key', /\b(sk|rk)_(live|test)_[0-9a-zA-Z]{10,}|\bpk_live_[0-9a-zA-Z]{10,}/],
  ['GitHub / Slack token', /\bgh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{20,}|\bxox[baprs]-[A-Za-z0-9-]{10,}/],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['Supabase secret key', /\bsb_secret_[A-Za-z0-9_-]{10,}/],
  ['private key block', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
];
const DB_URL = /postgres(?:ql)?:\/\/[^\s:'"@/]+:([^\s@'"]{4,})@/g;
const ASSIGN = /(?:secret|api[_-]?key|passkey|consumer[_-]?(?:key|secret)|token|password)\s*["']?\s*[:=]\s*["']([A-Za-z0-9/+_=.-]{24,})["']/i;

// Real values from local env files: if one shows up in a file about to be committed, block it.
const envValues = [];
for (const f of ['server/.env', 'deploy/.env', 'web/.env', '.env']) {
  if (!fs.existsSync(f)) continue;
  for (const line of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    const v = m[2].replace(/^["']|["']$/g, '');
    if (!/KEY|SECRET|PASSWORD|PASSKEY|TOKEN|CREDENTIAL|URL/i.test(m[1]) || v.length < 8 || /^https?:\/\/localhost|^(mock|local)$/.test(v) || PLACEHOLDER.test(v)) continue;
    envValues.push([`${f}:${m[1]}`, v]);
    const u = v.match(/^postgres(?:ql)?:\/\/([^:]+):([^@]+)@/);
    if (u) envValues.push([`${f}:${m[1]} (db user)`, u[1]], [`${f}:${m[1]} (db password)`, decodeURIComponent(u[2])]);
  }
}

const BINARY = /\.(png|jpe?g|gif|webp|ico|pdf|mp4|woff2?|ttf|otf|zip|gz)$/i;
const problems = [];
const flag = (file, why) => problems.push(`  ${file}  —  ${why}`);

function textOf(file) {
  if (/\.docx$/i.test(file)) {
    let tmp = null;
    try {
      let target = file;
      if (!all) {
        tmp = path.join(os.tmpdir(), `secret-scan-${process.pid}.docx`);
        fs.writeFileSync(tmp, git(['show', `:${file}`], { encoding: 'buffer' }));
        target = tmp;
      }
      return execFileSync('unzip', ['-p', target, 'word/document.xml'], { encoding: 'utf8', maxBuffer: 1 << 28 });
    } catch {
      return '';
    } finally {
      if (tmp) fs.rmSync(tmp, { force: true });
    }
  }
  if (BINARY.test(file)) return '';
  try { return all ? fs.readFileSync(file, 'utf8') : git(['show', `:${file}`]); } catch { return ''; }
}

for (const file of files) {
  for (const [re, applies, why] of FORBIDDEN_PATH) if (re.test(file) && applies(file)) flag(file, why);
  if (/(^|\/)package-lock\.json$/.test(file)) continue;
  const text = textOf(file);
  if (!text) continue;
  for (const [name, v] of envValues) if (text.includes(v)) flag(file, `contains the real value of ${name}`);
  text.split('\n').forEach((line, i) => {
    if (line.includes('secret-scan:ignore')) return;
    for (const [name, re] of PATTERNS) if (re.test(line)) flag(`${file}:${i + 1}`, name);
    for (const m of line.matchAll(DB_URL)) if (!PLACEHOLDER.test(m[0])) flag(`${file}:${i + 1}`, 'database URL with a password');
    const a = line.match(ASSIGN);
    if (a && !PLACEHOLDER.test(line) && !/^[a-z]+(\.[a-z]+)+$/i.test(a[1])) flag(`${file}:${i + 1}`, 'hardcoded secret-looking value');
  });
}

if (problems.length) {
  console.error(`\nSecret check FAILED (${problems.length}). Nothing was committed.\n${[...new Set(problems)].join('\n')}\n`);
  console.error('Remove the secret (use an environment variable and keep .env out of git), or add "secret-scan:ignore" to a line that is a false positive.');
  console.error('If a real key was already shared anywhere, rotate it: removing it from git does not make it safe again.\n');
  process.exit(1);
}
console.log(`Secret check passed (${files.length} file${files.length === 1 ? '' : 's'} scanned).`);
