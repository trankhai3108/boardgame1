import type { Die, DieFace, DieSymbol, Hero } from './types';
import { rollDie, type RngState } from './rng';

/** The pip value a die shows maps to one of the hero's six printed faces. */
export function faceOf(hero: Hero, value: number): DieFace {
  const face = hero.dieFaces[value - 1];
  if (!face) throw new Error(`${hero.name} has no die face for value ${value}`);
  return face;
}

export function symbolOf(hero: Hero, value: number): DieSymbol {
  return faceOf(hero, value).symbol;
}

export function makeDice(count: number, rng: RngState): Die[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `d${i}`,
    value: rollDie(rng),
    kept: false,
  }));
}

/** Re-rolls every die that is not kept. Returns a new array. */
export function rerollUnkept(dice: readonly Die[], rng: RngState): Die[] {
  return dice.map((die) => (die.kept ? die : { ...die, value: rollDie(rng) }));
}

/** How many dice show each symbol. */
export function symbolCounts(hero: Hero, dice: readonly Die[]): Record<DieSymbol, number> {
  const counts: Record<DieSymbol, number> = {};
  for (const die of dice) {
    const symbol = symbolOf(hero, die.value);
    counts[symbol] = (counts[symbol] ?? 0) + 1;
  }
  return counts;
}

/** How many dice show each pip value, indexed 1-6. */
export function valueCounts(dice: readonly Die[]): number[] {
  const counts = new Array(7).fill(0);
  for (const die of dice) counts[die.value]++;
  return counts;
}

/** Length of the longest run of consecutive pip values present. */
export function longestStraight(dice: readonly Die[]): number {
  const present = new Set(dice.map((d) => d.value));
  let best = 0;
  let run = 0;
  for (let v = 1; v <= 6; v++) {
    run = present.has(v) ? run + 1 : 0;
    if (run > best) best = run;
  }
  return best;
}

/** Largest N-of-a-kind present (same pip value, not same symbol). */
export function largestOfAKind(dice: readonly Die[]): number {
  return Math.max(0, ...valueCounts(dice));
}
