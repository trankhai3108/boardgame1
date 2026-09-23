import { describe, expect, it } from 'vitest';
import { HEROES } from '../../data/heroes';
import {
  emptyOutcome,
  pipTotal,
  resolveAmount,
  resolveEffects,
  subRollEffects,
  type EffectContext,
} from '../effects';
import { createGame, statusCount, type GameState } from '../state';
import type { Die } from '../types';
import type { Effect } from '../types';

function game(first = HEROES.treant, second = HEROES.barbarian, seed = 7): GameState {
  return createGame(
    [
      { id: 'p1', name: 'One', hero: first },
      { id: 'p2', name: 'Two', hero: second },
    ],
    { seed },
  );
}

/** The dice an ability activated on, spelled as pip values. */
function dice(...values: number[]): Die[] {
  return values.map((value, i) => ({ id: `d${i}`, value, kept: true }));
}

function ctxFor(state: GameState, heroId = state.players[0].heroId, used: Die[] = []): EffectContext {
  return { state, self: 0, target: 1, hero: HEROES[heroId], usedDice: used };
}

function run(state: GameState, effects: Effect[], ctx = ctxFor(state)) {
  return resolveEffects(effects, ctx, emptyOutcome());
}

describe('dynamic amounts', () => {
  it('counts CP off the dial', () => {
    const state = game();
    state.players[0].cp = 7;
    const hero = HEROES.shadowThief;
    expect(resolveAmount({ perCp: 1 }, hero, [], state.players[0])).toBe(7);
    // Shifty Strike halves, rounding up.
    expect(resolveAmount({ perCp: 1, halve: true }, hero, [], state.players[0])).toBe(4);
    expect(resolveAmount({ base: 5, perCp: 1 }, hero, [], state.players[0])).toBe(12);
  });

  it('counts pips on the dice in context', () => {
    expect(pipTotal(dice(3, 5, 6))).toBe(14);
    expect(resolveAmount({ perPip: 1 }, HEROES.monk, dice(3, 5, 6))).toBe(14);
    // Shadow Dance: half the value of one die, rounded up.
    expect(resolveAmount({ perPip: 1, halve: true }, HEROES.shadowThief, dice(5))).toBe(3);
  });

  it('counts tokens the resolving player holds', () => {
    const state = game(HEROES.pyromancer);
    state.players[0].statuses['fire-mastery'] = 4;
    const amount = { base: 5, perStatus: { 'fire-mastery': 1 } };
    expect(resolveAmount(amount, HEROES.pyromancer, [], state.players[0])).toBe(9);
  });
});

describe('sub-rolls', () => {
  it('resolves the `total` slot once, before the per-die faces', () => {
    const total: Effect[] = [{ t: 'damage', amount: { perPip: 1 } }];
    const expanded = subRollEffects(HEROES.monk, dice(4, 4, 5), [], [], total);
    expect(expanded).toEqual(total);
  });

  it('fires an `atLeast` outcome once for the whole roll', () => {
    // Ninja faces: 6 is a Mask.
    const outcomes = [
      { on: 'mask' as const, atLeast: 2, effects: [{ t: 'gainStatus' as const, status: 'smoke-bomb' }] },
    ];
    expect(subRollEffects(HEROES.ninja, dice(6, 6, 1), outcomes, [])).toHaveLength(1);
    expect(subRollEffects(HEROES.ninja, dice(6, 1, 1), outcomes, [])).toHaveLength(0);
  });
});

describe('conditions', () => {
  it('reads the roll total for `rollAtLeast`', () => {
    const state = game(HEROES.barbarian);
    const hit: Effect[] = [
      {
        t: 'when',
        cond: { rollAtLeast: 14 },
        effects: [{ t: 'gainStatus', status: 'concussion', target: 'opponent' }],
      },
    ];
    run(state, hit, ctxFor(state, 'barbarian', dice(5, 5, 4)));
    expect(statusCount(state.players[1], 'concussion')).toBe(1);

    const cold = game(HEROES.barbarian);
    run(cold, hit, ctxFor(cold, 'barbarian', dice(2, 3, 4)));
    expect(statusCount(cold.players[1], 'concussion')).toBe(0);
  });
});

describe('spending tokens for damage', () => {
  it('turns Fire Mastery into undefendable damage, capped by the printed max', () => {
    const state = game(HEROES.pyromancer);
    state.players[0].statuses['fire-mastery'] = 6;
    const out = run(state, [
      { t: 'spendTokens', status: 'fire-mastery', max: 4, damage: 3, undefendable: true },
    ], ctxFor(state, 'pyromancer'));
    expect(out.damage).toBe(12);
    expect(out.undefendable).toBe(true);
    expect(statusCount(state.players[0], 'fire-mastery')).toBe(2);
  });

  it('does nothing when there is nothing to spend', () => {
    const state = game(HEROES.pyromancer);
    const out = run(state, [
      { t: 'spendTokens', status: 'fire-mastery', max: 4, damage: 3 },
    ], ctxFor(state, 'pyromancer'));
    expect(out.damage).toBe(0);
  });

  it('harvests Spirits from the top of the ladder down', () => {
    const state = game();
    const cpBefore = state.players[0].cp;
    state.players[0].statuses.dryad = 1;
    state.players[0].statuses.seedling = 2;
    const out = run(state, [{ t: 'harvestSpirits', max: 2, cp: 0, damage: 4 }]);
    expect(out.damage).toBe(8);
    expect(statusCount(state.players[0], 'dryad')).toBe(0);
    expect(statusCount(state.players[0], 'seedling')).toBe(1);
    // Harvested for damage, so the dial does not move.
    expect(state.players[0].cp).toBe(cpBefore);
  });
});

describe('growing Spirits', () => {
  it("climbs the Treant's ladder", () => {
    const state = game();
    run(state, [{ t: 'growSpirit', amount: 3 }]);
    const self = state.players[0];
    const total =
      statusCount(self, 'seedling') + statusCount(self, 'sapling') + statusCount(self, 'dryad');
    expect(total).toBeGreaterThan(0);
  });
});

describe('every hero ability resolves to something', () => {
  it('leaves no rule to the players', () => {
    for (const hero of Object.values(HEROES)) {
      for (const ability of hero.abilities) {
        for (const tier of ability.tiers) {
          expect(tier.effects.length, `${hero.name}: ${ability.name} is empty`).toBeGreaterThan(0);
          const walk = (effects: readonly Effect[]): void => {
            for (const effect of effects) {
              expect(effect.t, `${hero.name}: ${ability.name}`).not.toBe('manual');
              if (effect.t === 'choose') walk(effect.effects);
              if (effect.t === 'when') walk([...effect.effects, ...(effect.otherwise ?? [])]);
              if (effect.t === 'subRoll') {
                for (const o of effect.outcomes) walk(o.effects);
                walk(effect.otherwise ?? []);
                walk(effect.total ?? []);
              }
            }
          };
          walk(tier.effects);
        }
      }
    }
  });
});
