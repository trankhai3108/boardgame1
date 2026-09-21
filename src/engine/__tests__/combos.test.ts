import { describe, expect, it } from 'vitest';
import { BARBARIAN } from '../../data/heroes/season1/barbarian';
import { PALADIN } from '../../data/heroes/season1/paladin';
import { availableAbilities, bestAbilities, matchRequirement } from '../combos';
import { longestStraight, largestOfAKind } from '../dice';
import type { Die } from '../types';

/** Builds a hand from pip values. */
const hand = (...values: number[]): Die[] =>
  values.map((value, i) => ({ id: `d${i}`, value, kept: false }));

describe('dice helpers', () => {
  it('finds the longest run of consecutive values', () => {
    expect(longestStraight(hand(1, 2, 3, 4, 6))).toBe(4);
    expect(longestStraight(hand(2, 3, 4, 5, 6))).toBe(5);
    expect(longestStraight(hand(1, 1, 3, 5, 5))).toBe(1);
  });

  it('counts N-of-a-kind by pip value, not by symbol', () => {
    // Paladin shows SWORD on both 1 and 2, but that is not a 5-of-a-kind.
    expect(largestOfAKind(hand(1, 2, 1, 2, 1))).toBe(3);
    expect(largestOfAKind(hand(6, 6, 6, 6, 6))).toBe(5);
  });
});

describe('matchRequirement', () => {
  it('matches a symbol requirement and reports the dice used', () => {
    // Paladin: 1-2 SWORD, 3-4 HELMET, 5 LIFE, 6 PRAYER.
    const used = matchRequirement(PALADIN, hand(1, 1, 2, 3, 4), {
      kind: 'symbols',
      symbols: { sword: 3, helmet: 2 },
    });
    expect(used).not.toBeNull();
    expect(used!.map((d) => d.value).sort()).toEqual([1, 1, 2, 3, 4]);
  });

  it('rejects a symbol requirement it cannot fill', () => {
    const used = matchRequirement(PALADIN, hand(1, 1, 2, 5, 6), {
      kind: 'symbols',
      symbols: { sword: 3, helmet: 2 },
    });
    expect(used).toBeNull();
  });

  it('matches a small straight and returns one die per value', () => {
    const used = matchRequirement(PALADIN, hand(1, 2, 3, 4, 6), { kind: 'straight', length: 4 });
    expect(used!.map((d) => d.value)).toEqual([1, 2, 3, 4]);
  });

  it('never matches a defence roll, which is rolled rather than met', () => {
    expect(matchRequirement(PALADIN, hand(1, 2, 3, 4, 5), { kind: 'defenseRoll', dice: 3 })).toBeNull();
  });
});

describe('availableAbilities', () => {
  it('offers both Holy Attack tiers on a large straight', () => {
    const matches = availableAbilities(PALADIN, hand(2, 3, 4, 5, 6));
    const holyAttack = matches.filter((m) => m.ability.id === 'holy-attack');
    expect(holyAttack.map((m) => m.tierIndex)).toEqual([0, 1]);
  });

  it('picks the large straight tier as the best one', () => {
    const best = bestAbilities(PALADIN, hand(2, 3, 4, 5, 6));
    const holyAttack = best.find((m) => m.ability.id === 'holy-attack');
    expect(holyAttack?.tierIndex).toBe(1);
    expect(PALADIN.abilities.find((a) => a.id === 'holy-attack')!.tiers[1].effects).toContainEqual({
      t: 'damage',
      amount: 8,
    });
  });

  it('activates the Ultimate on five Prayers', () => {
    const best = bestAbilities(PALADIN, hand(6, 6, 6, 6, 6));
    expect(best.map((m) => m.ability.id)).toContain('resolute-faith');
  });

  it('never offers the defensive ability as an offensive option', () => {
    const matches = availableAbilities(PALADIN, hand(1, 2, 3, 4, 5));
    expect(matches.map((m) => m.ability.id)).not.toContain('divine-defense');
  });

  it("picks Barbarian's 4-sword Smack tier over the 3-sword one", () => {
    // Barbarian: 1-3 SWORD, 4-5 LIFE, 6 POW.
    const best = bestAbilities(BARBARIAN, hand(1, 2, 3, 1, 4));
    const smack = best.find((m) => m.ability.id === 'smack');
    expect(smack?.tierIndex).toBe(1);
  });
});
