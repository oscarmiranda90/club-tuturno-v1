#!/usr/bin/env node
/**
 * Language guard — neutral Spanish only.
 *
 * Tu Turno is a Venezuelan product. Every string a user reads is neutral
 * Spanish: `tú`, never `vos`; `paga`, never `pagá`; `aquí`, never `acá`.
 *
 * This exists because the rule kept being broken by hand. A convention nobody
 * can check is a convention that erodes — so this runs like a test, fails the
 * same way, and names the exact line.
 *
 * Venezuelan terms that ARE the right word stay: el pote, cédula, RIF, SAN.
 *
 * Run: npm run check:language
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = 'src';
const EXTENSIONS = new Set(['.ts', '.tsx']);

/** Second-person voseo pronouns and verb forms. */
const FORBIDDEN_WORDS = [
  'sos', 'vos', 'acá', 'allá', 'tenés', 'querés', 'podés', 'sabés',
  'hacés', 'ponés', 'venís', 'decís', 'vivís', 'salís', 'seguís',
  'cobrás', 'pagás', 'llevás', 'dejás', 'creés', 'debés',
];

/**
 * Voseo imperatives: a command whose stress falls on the final syllable.
 * `pagá`, `elegí`, `sumá` — as opposed to `paga`, `elige`, `suma`.
 *
 * The stressed vowel must END the word, so what follows must not be another
 * letter. Without that guard the pattern matched inside words — `todaví` out of
 * `todavía`, `Escrí` out of `Escríbelos` — and reported them as errors.
 */
const IMPERATIVE = /\b[A-Za-zÁÉÍÓÚÑáéíóúñ]{3,}[áí](?![A-Za-zÁÉÍÓÚÑáéíóúñ])/g;

/**
 * Words that legitimately end in a stressed vowel in neutral Spanish, so the
 * imperative pattern does not flag them.
 */
const ALLOWED = new Set([
  // Ordinary words that end in a stressed vowel.
  'está', 'aquí', 'allí', 'ahí', 'así', 'día', 'país', 'maní', 'aún',
  // Future tense, third person.
  'será', 'habrá', 'tendrá', 'podrá', 'estará', 'vendrá', 'dará',
  'aparecerá', 'aplicará', 'quedará', 'llegará', 'seguirá', 'irá',
  // Proper nouns used in the fixtures.
  'tomás', 'andrés', 'inés', 'josé', 'jesús', 'nicolás',
]);

const problems = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full);
      continue;
    }
    if (!EXTENSIONS.has(extname(full))) continue;
    check(full);
  }
}

function check(file) {
  const lines = readFileSync(file, 'utf8').split('\n');
  let inBlockComment = false;

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Comments are written in English and are not user-facing.
    if (trimmed.startsWith('/*')) inBlockComment = true;
    if (inBlockComment) {
      if (trimmed.includes('*/')) inBlockComment = false;
      return;
    }
    if (trimmed.startsWith('*') || trimmed.startsWith('//')) return;

    const lower = line.toLowerCase();

    for (const word of FORBIDDEN_WORDS) {
      const pattern = new RegExp(`\\b${word}\\b`, 'i');
      if (pattern.test(lower)) {
        problems.push({ file, line: index + 1, found: word, text: trimmed });
      }
    }

    for (const match of line.matchAll(IMPERATIVE)) {
      const word = match[0];
      if (ALLOWED.has(word.toLowerCase())) continue;
      problems.push({ file, line: index + 1, found: word, text: trimmed });
    }
  });
}

walk(ROOT);

if (problems.length === 0) {
  console.log('✓ Neutral Spanish — no Rioplatense forms found');
  process.exit(0);
}

console.error(`\n✗ ${problems.length} Rioplatense form(s) found.\n`);
console.error('  This product is Venezuelan. Use neutral Spanish:');
console.error('  tú not vos · paga not pagá · aquí not acá · eres not sos\n');

for (const p of problems) {
  console.error(`  ${p.file}:${p.line}`);
  console.error(`    found: "${p.found}"`);
  console.error(`    line:  ${p.text.slice(0, 80)}\n`);
}

process.exit(1);
