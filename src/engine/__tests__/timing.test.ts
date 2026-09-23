import { describe, expect, it } from 'vitest';
import { HEROES } from '../../data/heroes';
import { canPlayCard, legalActions, reduce, type HeroLookup } from '../reducer';
import { createGame, type GameState } from '../state';
import type { Card } from '../types';

const lookup: HeroLookup = (id) => HEROES[id];
const act = (s: GameState, a: Parameters<typeof reduce>[1]) => reduce(s, a, lookup);

function game(seed = 5): GameState {
  return createGame(
    [
      { id: 'p1', name: 'One', hero: HEROES.barbarian },
      { id: 'p2', name: 'Two', hero: HEROES['moon-elf'] },
    ],
    { seed },
  );
}

/** Puts a card in a hand with the CP to pay for it. */
function give(state: GameState, seat: number, cardId: string): string {
  const instance = `${cardId}#t`;
  state.players[seat].hand.unshift(instance);
  state.players[seat].cp = 6;
  return instance;
}

const cardOf = (heroId: string, cardId: string): Card =>
  HEROES[heroId].cards.find((c) => c.id === cardId)!;

/** Walks the game to the Offensive Roll Phase with dice on the table. */
function toOffensiveRoll(state: GameState): GameState {
  return act(state, { type: 'nextPhase' });
}

describe('Roll Phase Action cards (the orange ones)', () => {
  /*
   * Rulebook v2.4.1 p.9: "May only be played during an Offensive Roll Phase,
   * Defensive Roll Phase, or Targeting Roll Phase. May be played during any
   * player's turn."
   */
  const orange = 'common-card-play-six';

  it('cannot be played in a Main Phase', () => {
    const state = game();
    const id = give(state, 0, orange);
    expect(state.phase).toBe('main1');
    expect(canPlayCard(state, 0, cardOf('barbarian', orange), id, lookup)).toBe(false);
  });

  it('can be played during the Offensive Roll Phase', () => {
    let state = game();
    const id = give(state, 0, orange);
    state = toOffensiveRoll(state);
    expect(state.phase).toBe('offensiveRoll');
    expect(canPlayCard(state, 0, cardOf('barbarian', orange), id, lookup)).toBe(true);
  });

  it('can be played by the player whose turn it is not', () => {
    let state = game();
    const id = give(state, 1, orange);
    state = toOffensiveRoll(state);
    expect(state.active).toBe(0);
    expect(canPlayCard(state, 1, cardOf('moon-elf', orange), id, lookup)).toBe(true);
  });
});

describe('Attack Modifiers', () => {
  /*
   * Rulebook v2.4.1 p.10: "Attack Modifiers can only be played on an Attack
   * you are activating during your turn (unless otherwise noted)."
   */
  it('are tagged in the data wherever the card text says so', () => {
    for (const hero of Object.values(HEROES)) {
      for (const card of hero.cards) {
        if (!/attack modifier/i.test(card.text.join(' '))) continue;
        expect(card.tags, `${hero.name}: ${card.name}`).toContain('Attack Modifier');
      }
    }
  });

  it('cannot be played with no attack on the table', () => {
    let state = game(7);
    const id = give(state, 0, 'moon-elf-watch-out');
    state = toOffensiveRoll(state);
    const card = cardOf('moon-elf', 'moon-elf-watch-out');
    expect(state.attack).toBeNull();
    expect(canPlayCard(state, 0, card, id, lookup)).toBe(false);
  });

  it('cannot be played by the defender', () => {
    const state = game(7);
    const id = give(state, 1, 'moon-elf-watch-out');
    state.attack = {
      attacker: 0,
      defender: 1,
      abilityId: 'smack',
      abilityName: 'Smack',
      incoming: 4,
      type: 'normal',
      modifiers: [],
      afterDamage: [],
      defenseResolved: false,
    };
    state.phase = 'defensiveRoll';
    const card = cardOf('moon-elf', 'moon-elf-watch-out');
    expect(canPlayCard(state, 1, card, id, lookup)).toBe(false);
  });
});

describe('an Ultimate, once activated', () => {
  /*
   * Rulebook v2.4.1 p.10: "Opponents may take no action of any kind from the
   * time it is Activated until the conclusion of the Roll Phase."
   */
  function ultimateOnTheTable(): GameState {
    const state = game(3);
    state.players[1].statuses.evasive = 1;
    state.attack = {
      attacker: 0,
      defender: 1,
      abilityId: 'rage',
      abilityName: 'Rage!',
      incoming: 10,
      type: 'ultimate',
      modifiers: [],
      afterDamage: [],
      defenseResolved: true,
    };
    state.phase = 'defensiveRoll';
    return state;
  }

  it('lets the defender spend nothing', () => {
    const state = ultimateOnTheTable();
    const mine = legalActions(state, lookup).filter(
      (o) => o.type === 'spendStatus' && o.playerId === state.players[1].id,
    );
    expect(mine).toHaveLength(0);
  });

  it('lets the defender play no card', () => {
    const state = ultimateOnTheTable();
    const id = give(state, 1, 'common-card-next-time');
    const card = cardOf('moon-elf', 'common-card-next-time');
    expect(canPlayCard(state, 1, card, id, lookup)).toBe(false);
  });

  it('still lets the attacker add to it', () => {
    const state = ultimateOnTheTable();
    state.players[0].statuses.crit = 1;
    const theirs = legalActions(state, lookup).filter(
      (o) => o.type === 'spendStatus' && o.playerId === state.players[0].id,
    );
    expect(theirs.length).toBeGreaterThan(0);
  });
});
