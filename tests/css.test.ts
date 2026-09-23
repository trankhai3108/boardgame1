import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * `calc()` is silently unforgiving: multiplying two lengths gives px², which is
 * not a length, so the browser drops the whole declaration without a word. The
 * card and ability frames both scale every internal measurement from one
 * width variable, so a dropped `font-size` leaves every `em` inside resolving
 * against the inherited 16px and the layout comes apart at any size but the
 * default. This catches that class of typo.
 */
function stylesheets(dir: string): [string, string][] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry): [string, string][] => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return stylesheets(path);
    return entry.name.endsWith('.css') ? [[path, readFileSync(path, 'utf8')]] : [];
  });
}

/**
 * The dimension of one calc() term, in powers of length.
 *
 * A length is degree 1 and a bare number degree 0; `*` adds the degrees and
 * `/` subtracts them. So `w * 16 / 450` is degree 1 — a length — while
 * `w / 450 * 16px` is degree 2, which is px squared and not a length at all.
 */
function degreeOf(term: string): number {
  const tokens = term.match(/\/|\*|var\(--[\w-]+\)|-?\d*\.?\d+[a-z%]*/g) ?? [];
  let degree = 0;
  let dividing = false;
  for (const token of tokens) {
    if (token === '*') continue;
    if (token === '/') {
      dividing = true;
      continue;
    }
    let d = 0;
    if (token.startsWith('var(')) {
      // Variables that name a width or a height hold a length; the rest are
      // ratios and counts, which are dimensionless.
      d = /(-w|-width|-h|-height)\)$/.test(token) ? 1 : 0;
    } else {
      d = /\d(px|rem|em|vh|vw|ch|%)$/.test(token) ? 1 : 0;
    }
    degree += dividing ? -d : d;
    dividing = false;
  }
  return degree;
}

/** The highest dimension any addend of an expression reaches. */
function worstDegree(expression: string): number {
  let depth = 0;
  let term = '';
  const terms: string[] = [];
  for (const ch of expression) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (depth === 0 && (ch === '+' || ch === '-')) {
      terms.push(term);
      term = '';
      continue;
    }
    term += ch;
  }
  terms.push(term);
  return Math.max(...terms.map(degreeOf));
}

describe('stylesheets', () => {
  const files = stylesheets('src');

  it('reads the stylesheets it is checking', () => {
    expect(files.length).toBeGreaterThan(0);
    // Vite's `?raw` glob hands back empty strings for CSS, which made an
    // earlier version of this test pass without reading anything.
    for (const [file, css] of files) expect(css.length, file).toBeGreaterThan(0);
  });

  it('measures the dimension of a calc() term', () => {
    expect(degreeOf('var(--dt-card-w) * 16 / 450')).toBe(1);
    expect(degreeOf('var(--dt-card-w) / 450 * 16px')).toBe(2);
    // An addition is not a product: each addend is measured on its own.
    expect(worstDegree('100% - 2rem')).toBe(1);
    expect(degreeOf('var(--dt-ability-w) * 1.5')).toBe(1);
  });

  it('never multiplies two lengths inside calc()', () => {
    const bad: string[] = [];
    for (const [file, css] of files) {
      for (const [, expression] of css.matchAll(/calc\(([^;{}]*)\)/g)) {
        if (worstDegree(expression) > 1) bad.push(`${file}: calc(${expression.trim()})`);
      }
    }
    expect(bad, `px squared is not a length:\n${bad.join('\n')}`).toHaveLength(0);
  });
});
