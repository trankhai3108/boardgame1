/**
 * Seeded PRNG.
 *
 * The engine never calls Math.random: every roll goes through here so a game
 * can be replayed exactly from its seed, which is what makes the reducer
 * testable.
 */

export interface RngState {
  seed: number;
}

export function createRng(seed: number): RngState {
  // Avoid the degenerate 0 state of the xorshift below.
  return { seed: seed >>> 0 || 0x9e3779b9 };
}

/** xorshift32 — small, fast, and good enough for dice. */
function next(state: RngState): number {
  let x = state.seed;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  state.seed = x >>> 0;
  return state.seed;
}

/** Integer in [1, sides], advancing `state` in place. */
export function rollDie(state: RngState, sides = 6): number {
  return (next(state) % sides) + 1;
}

/** Integer in [0, n), advancing `state` in place. */
export function randomIndex(state: RngState, n: number): number {
  return next(state) % n;
}

/** Fisher-Yates, returning a new array and advancing `state` in place. */
export function shuffle<T>(state: RngState, items: readonly T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = next(state) % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
