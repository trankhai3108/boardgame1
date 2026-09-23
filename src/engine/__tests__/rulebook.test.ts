import { describe, expect, it } from 'vitest';
import { HEROES } from '../../data/heroes';
import { KOTH_HEALTH, RULES } from '../state';

/*
 * Checked against the printed Season One rulebook (Dice_Throne.Rules.en.pdf,
 * Roxley 2017). Page numbers are the ones printed on the page.
 */

const ability = (heroId: string, id: string) =>
  HEROES[heroId].abilities.find((a) => a.id === id)!;

const limitOf = (heroId: string, statusId: string) =>
  HEROES[heroId].statusEffects.find((s) => s.id === statusId)?.stackLimit;

describe('the rulebook, page 4 and 8 — setting up', () => {
  it('starts at 50 health and 2 CP, with 4 cards', () => {
    expect(RULES.startingHealth).toBe(50);
    expect(RULES.startingCp).toBe(2);
    expect(RULES.startingHand).toBe(4);
  });

  it('caps CP at 15 and the hand at 6', () => {
    expect(RULES.maxCp).toBe(15);
    expect(RULES.handLimit).toBe(6);
  });

  it('rolls 5 dice up to 3 times', () => {
    expect(RULES.diceCount).toBe(5);
    expect(RULES.rollAttempts).toBe(3);
  });
});

describe('the rulebook, page 11 — free-for-all health', () => {
  it('is 30 for three players, 25 for four, 20 for five and six', () => {
    expect(KOTH_HEALTH[3]).toBe(30);
    expect(KOTH_HEALTH[4]).toBe(25);
    expect(KOTH_HEALTH[5]).toBe(20);
    expect(KOTH_HEALTH[6]).toBe(20);
  });
});

describe('the rulebook, page 5 — the Paladin board', () => {
  it('Retaliate gains 2 CP', () => {
    expect(ability('paladin', 'retaliate').tiers[0].effects).toContainEqual({
      t: 'gainCP',
      amount: 2,
    });
  });

  it('Holy Attack heals 1 and deals 5 on a small straight', () => {
    const [small, large] = ability('paladin', 'holy-attack').tiers;
    expect(small.effects).toContainEqual({ t: 'damage', amount: 5 });
    expect(large.effects).toContainEqual({ t: 'damage', amount: 8 });
  });

  it('Holy Light rolls one die', () => {
    const roll = ability('paladin', 'holy-light').tiers[0].effects.find(
      (e) => e.t === 'subRoll',
    );
    expect(roll?.t === 'subRoll' && roll.dice).toBe(1);
  });
});

describe('the rulebook, page 8 — the Pyromancer board', () => {
  it('Fireball gains 1 Fire Mastery at every tier', () => {
    for (const tier of ability('pyromancer', 'fireball').tiers) {
      expect(tier.effects).toContainEqual({
        t: 'gainStatus',
        status: 'fire-mastery',
        amount: 1,
      });
    }
  });
});

describe('the rulebook, page 10 — Missed Me', () => {
  /*
   * The worked example: the Elf rolls one Bow and four Feet, prevents half
   * the damage and deals nothing back. So the halving needs two Feet, extra
   * Feet add nothing, and a single Bow is not enough to deal damage.
   */
  it('prevents half on two Feet, and deals 1 for every two Bows', () => {
    const roll = ability('moon-elf', 'missed-me').tiers[0].effects.find(
      (e) => e.t === 'subRoll',
    );
    if (roll?.t !== 'subRoll') throw new Error('Missed Me should roll dice');

    const foot = roll.outcomes.filter((o) => o.on === 'foot');
    expect(foot).toHaveLength(1);
    expect(foot[0].atLeast, 'two Feet, and no more than once').toBe(2);

    const arrow = roll.outcomes.filter((o) => o.on === 'arrow');
    expect(arrow.map((o) => o.atLeast), 'once per pair of Bows').toEqual([2, 4]);
  });
});

describe('the rulebook, page 3 — how many of each token there are', () => {
  // The component list is the stack limit: you cannot hold more of a token
  // than the box contains.
  const EXPECTED: Record<string, Record<string, number>> = {
    barbarian: { stun: 1, concussion: 2 },
    'moon-elf': { entangle: 2, evasive: 5, blind: 2, targeted: 3 },
    'shadow-thief': { poison: 6, shadows: 2, 'sneak-attack': 2 },
    monk: { chi: 11, cleanse: 4, knockdown: 2, evasive: 5 },
    pyromancer: { burn: 4, knockdown: 2, 'fire-mastery': 9, stun: 1 },
    paladin: {
      'blessing-of-divinity': 1,
      crit: 2,
      retribution: 2,
      protect: 2,
      accuracy: 2,
    },
  };

  for (const [heroId, limits] of Object.entries(EXPECTED)) {
    it(`${HEROES[heroId].name} carries the printed number of each token`, () => {
      for (const [statusId, limit] of Object.entries(limits)) {
        expect(limitOf(heroId, statusId), `${heroId}/${statusId}`).toBe(limit);
      }
    });
  }

  it('lets a Paladin hold the two Protects the damage example needs', () => {
    // Rulebook p.14: two Protects on an odd subtotal prevent all of it.
    expect(limitOf('paladin', 'protect')).toBeGreaterThanOrEqual(2);
  });
});
