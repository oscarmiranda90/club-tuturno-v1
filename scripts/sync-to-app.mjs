#!/usr/bin/env node
/**
 * Copy the Club's shared source into the full app.
 *
 * The Club lives twice: this repo, which is the isolated handoff package, and
 * `../app`, the complete product it is a part of. Most files under `src/` are
 * byte-identical between them, and nothing keeps them that way — so they drift
 * silently, and a fix made here quietly fails to reach the app.
 *
 * This script is the mechanism, run on purpose rather than on a hook. It copies
 * only files that already exist on both sides and that are genuinely shared:
 * anything the app owns differently stays untouched.
 *
 *   node scripts/sync-to-app.mjs          # report what would change
 *   node scripts/sync-to-app.mjs --write  # actually copy
 *
 * It refuses to overwrite a file the app has modified but not committed, since
 * that is uncommitted work with no way back. Commit or stash there, then rerun.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const CLUB = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP = join(CLUB, '..', 'app');

/*
  Files the app legitimately owns a different version of.

  These are not drift. `types.ts` and `index.ts` carry domain the Club has no
  use for, and `ClubScreen` is wired to the app's own navigation and dev tools
  rather than to the demo harness. Copying any of them breaks the app.

  A file listed here is a standing decision to diverge — if one stops being
  genuinely different, take it off the list rather than leaving it excluded.
*/
const APP_OWNED = new Set([
  'src/domain/types.ts',
  'src/domain/index.ts',
  'src/screens/ClubScreen.tsx',
]);

/*
  Directories that exist only to run the Club in isolation: the demo harness,
  the handoff data contract, and the standalone entry screen. The app has its
  own state and its own home, so these have no destination there.
*/
const CLUB_ONLY = ['src/demo/', 'src/data/', 'src/screens/ClubHandoffHome.tsx'];

function sourceFiles(dir, found = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      sourceFiles(full, found);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      found.push(relative(CLUB, full));
    }
  }
  return found;
}

/** Paths with uncommitted changes in the app, which must not be overwritten. */
function appDirtyFiles() {
  try {
    const out = execFileSync('git', ['-C', APP, 'status', '--porcelain'], {
      encoding: 'utf8',
    });
    return new Set(
      out
        .split('\n')
        .filter(Boolean)
        .map((line) => line.slice(3).trim()),
    );
  } catch {
    // No git in the app checkout: report it rather than assuming it is clean.
    console.warn('! Could not read git status in ../app — skipping the dirty check.\n');
    return new Set();
  }
}

const write = process.argv.includes('--write');
const dirty = appDirtyFiles();

const changed = [];
const blocked = [];
const missing = [];

for (const file of sourceFiles(join(CLUB, 'src'))) {
  if (APP_OWNED.has(file)) continue;
  if (CLUB_ONLY.some((prefix) => file.startsWith(prefix))) continue;

  const target = join(APP, file);
  if (!existsSync(target)) {
    // A component the app does not have. Creating it would be a guess about
    // where it belongs, so this only reports.
    missing.push(file);
    continue;
  }

  const source = readFileSync(join(CLUB, file), 'utf8');
  if (source === readFileSync(target, 'utf8')) continue;

  if (dirty.has(file)) {
    blocked.push(file);
    continue;
  }

  changed.push(file);
  if (write) writeFileSync(target, source);
}

for (const file of changed) console.log(`${write ? 'synced' : 'would sync'}  ${file}`);
for (const file of blocked) console.log(`BLOCKED (uncommitted in app)  ${file}`);
for (const file of missing) console.log(`only in club (not copied)  ${file}`);

console.log(
  `\n${changed.length} ${write ? 'synced' : 'to sync'}` +
    `${blocked.length ? `, ${blocked.length} blocked` : ''}` +
    `${missing.length ? `, ${missing.length} club-only` : ''}`,
);

if (blocked.length) {
  console.log('\nCommit or stash those files in ../app, then run again.');
  process.exit(1);
}
if (!write && changed.length) console.log('\nRun with --write to copy.');
