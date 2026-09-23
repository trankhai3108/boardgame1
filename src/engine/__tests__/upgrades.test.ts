import { describe, expect, it } from 'vitest';
import { HEROES } from '../../data/heroes';
import { bestAbilities, levelOf, tiersAt } from '../combos';
import { reduce, type HeroLookup } from '../reducer';
import { createGame, type GameState } from '../state';

const lookup: HeroLookup = (id) => HEROES[id];
const act = (s: GameState, a: Parameters<typeof reduce>[1]) => reduce(s, a, lookup);

function game(seed = 5): GameState {
  return createGame(
    [
      { id: 'p1', name: 'One', hero: HEROES.barbarian },
      { id: 'p2', name: 'Two', hero: HEROES.ninja },
    ],
    { seed },
  );
}

/** Rolls the given faces and activates an ability with them. */
function attackWith(state: GameState, abilityId: string, faces: number[]): GameState {
  let next = act(state, { type: 'nextPhase' });
  next.roll!.dice = faces.map((value, i) => ({ id: `d${i}`, value, kept: true }));
  return act(next, { type: 'activateAbility', abilityId });
}

describe('ability levels', () => {
  it('keeps the level below when a level adds nothing of its own', () => {
    const ability = { id: 'x', name: 'X', kind: 'offensive', level: 'I', tiers: [1] } as never;
    expect(tiersAt(ability, 'I')).toHaveLength(1);
    expect(tiersAt(ability, 'II')).toHaveLength(1);
    expect(tiersAt(ability, 'III')).toHaveLength(1);
  });

  it('reads the level a player has upgraded a slot to', () => {
    const state = game();
    const smack = HEROES.barbarian.abilities.find((a) => a.id === 'smack')!;
    expect(levelOf(smack, state.players[0].abilityLevels)).toBe('I');
    state.players[0].abilityLevels.smack = 'II';
    expect(levelOf(smack, state.players[0].abilityLevels)).toBe('II');
  });
});

describe('an upgrade card', () => {
  /*
   * The point of the 73 upgrade cards in the game: paying the CP has to change
   * what the slot does, or the card is a CP sink with a picture on it.
   */
  it('raises the slot and changes what the ability does', () => {
    const before = attackWith(game(), 'smack', [1, 1, 1, 2, 2]);
    const baseDamage = before.attack!.incoming;
    expect(baseDamage).toBeGreaterThan(0);

    let state = game();
    state.players[0].cp = 6;
    state.players[0].hand.unshift('barbarian-card-slap-2#0');
    state = act(state, { type: 'playCard', cardId: 'barbarian-card-slap-2#0' });
    expect(state.players[0].abilityLevels.smack).toBe('II');

    const after = attackWith(state, 'smack', [1, 1, 1, 2, 2]);
    expect(
      after.attack!.incoming,
      'Smack II hits harder than Smack I',
    ).toBeGreaterThan(baseDamage);
  });

  it('marks the upgraded tiers as live from the upgraded rules', () => {
    const state = game();
    state.players[0].abilityLevels.smack = 'II';
    const hero = HEROES.barbarian;
    const dice = [1, 1, 1, 2, 2].map((value, i) => ({ id: `d${i}`, value, kept: true }));

    const atOne = bestAbilities(hero, dice);
    const atTwo = bestAbilities(hero, dice, state.players[0].abilityLevels);
    expect(atOne.some((m) => m.ability.id === 'smack')).toBe(true);
    expect(atTwo.some((m) => m.ability.id === 'smack')).toBe(true);
  });
});

describe('every upgrade card', () => {
  it('names a slot the hero actually has', () => {
    const broken: string[] = [];
    for (const hero of Object.values(HEROES)) {
      for (const card of hero.cards) {
        if (card.type !== 'upgrade') continue;
        if (!card.upgrades || !card.upgradeLevel) {
          broken.push(`${hero.name}: ${card.name} upgrades nothing`);
          continue;
        }
        if (!hero.abilities.some((a) => a.id === card.upgrades)) {
          broken.push(`${hero.name}: ${card.name} -> unknown slot "${card.upgrades}"`);
        }
      }
    }
    expect(broken, broken.join('\n')).toHaveLength(0);
  });
});

describe('what the dice tell an ability', () => {
  /*
   * "Draw 1 card per Card face" reads the dice on the table, not the two the
   * requirement asked for — Carducopia used to draw exactly two however many
   * Cards were showing.
   */
  function carducopiaWith(faces: number[]): number {
    const state = createGame(
      [
        { id: 'p1', name: 'One', hero: HEROES['shadow-thief'] },
        { id: 'p2', name: 'Two', hero: HEROES.barbarian },
      ],
      { seed: 5 },
    );
    let next = act(state, { type: 'nextPhase' });
    next.roll!.dice = faces.map((value, i) => ({ id: `d${i}`, value, kept: true }));
    const before = next.players[0].hand.length;
    next = act(next, { type: 'activateAbility', abilityId: 'carducopia' });
    return next.players[0].hand.length - before;
  }

  it('draws one card per Card face rolled', () => {
    // Shadow Thief: 5 is the Card face.
    expect(carducopiaWith([5, 5, 1, 2, 3])).toBe(2);
    expect(carducopiaWith([5, 5, 5, 5, 1])).toBe(4);
  });
});
