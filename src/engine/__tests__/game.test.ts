import { describe, expect, it } from 'vitest';
import { HEROES } from '../../data/heroes';
import { PALADIN } from '../../data/heroes/season1/paladin';
import { BARBARIAN } from '../../data/heroes/season1/barbarian';
import { PYROMANCER } from '../../data/heroes/season1/pyromancer';
import { SHADOW_THIEF } from '../../data/heroes/season1/shadowThief';
import type { Action } from '../actions';
import { legalActions, reduce, type HeroLookup } from '../reducer';
import { RULES, createGame, healthOf, type GameState } from '../state';

const lookup: HeroLookup = (id) => HEROES[id];

function newGame(a = PALADIN, b = BARBARIAN, seed = 7): GameState {
  return createGame(
    [
      { id: 'p1', name: 'One', hero: a },
      { id: 'p2', name: 'Two', hero: b },
    ],
    seed,
  );
}

const act = (state: GameState, action: Action) => reduce(state, action, lookup);
const next = (state: GameState) => act(state, { type: 'nextPhase' });

describe('setup', () => {
  it('starts both players on the rulebook numbers', () => {
    const game = newGame();
    game.players.forEach((player, i) => {
      expect(healthOf(game, i)).toBe(RULES.startingHealth);
      expect(player.cp).toBe(RULES.startingCp);
    });
  });

  it('opens in Main Phase 1, because the start player skips their first Income Phase', () => {
    expect(newGame().phase).toBe('main1');
  });

  it('is deterministic for a given seed', () => {
    const a = newGame(PALADIN, BARBARIAN, 42);
    const b = newGame(PALADIN, BARBARIAN, 42);
    expect(next(a).roll?.dice).toEqual(next(b).roll?.dice);
  });
});

describe('phases', () => {
  it('walks a turn through to the next player', () => {
    let game = newGame();
    expect(game.phase).toBe('main1');

    game = next(game); // -> offensiveRoll, dice rolled
    expect(game.phase).toBe('offensiveRoll');
    expect(game.roll?.dice).toHaveLength(RULES.diceCount);

    game = act(game, { type: 'skipAttack' }); // -> main2
    expect(game.phase).toBe('main2');

    game = next(game); // -> discard
    game = next(game); // -> next player's upkeep
    expect(game.phase).toBe('upkeep');
    expect(game.active).toBe(1);
  });

  it('spends a Roll Attempt per roll and keeps kept dice', () => {
    let game = next(newGame());
    const first = game.roll!.dice.map((d) => d.value);

    game = act(game, { type: 'setKeep', dieIds: game.roll!.dice.map((d) => d.id) });
    game = act(game, { type: 'rollDice' });

    expect(game.roll!.attemptsUsed).toBe(2);
    expect(game.roll!.dice.map((d) => d.value)).toEqual(first);
  });

  it('refuses a fourth Roll Attempt', () => {
    let game = next(newGame());
    game = act(game, { type: 'rollDice' });
    game = act(game, { type: 'rollDice' });
    expect(game.roll!.attemptsUsed).toBe(3);
    expect(() => act(game, { type: 'rollDice' })).toThrow(/Roll Attempts/);
  });
});

describe('income and upkeep', () => {
  it('gives 1 CP and a draw in the Income Phase', () => {
    let game = newGame();
    game.phase = 'upkeep';
    game.players[0].cp = 5;
    game = next(game);
    expect(game.phase).toBe('income');
    expect(game.players[0].cp).toBe(6);
  });

  it('skips the Income Phase under Concussion and removes the token', () => {
    let game = newGame();
    game.phase = 'upkeep';
    game.players[0].cp = 5;
    game.players[0].statuses.concussion = 1;
    game = next(game);
    expect(game.players[0].cp).toBe(5);
    expect(game.players[0].statuses.concussion).toBeUndefined();
  });

  it('deals Burn damage during the holder’s Upkeep Phase', () => {
    let game = newGame(PALADIN, PYROMANCER);
    // Finish player 1's turn so player 2 reaches their Upkeep with Burn on them.
    game.players[1].statuses.burn = 1;
    game = next(game);
    game = act(game, { type: 'skipAttack' });
    game = next(game);
    game = next(game);
    expect(game.active).toBe(1);
    expect(game.phase).toBe('upkeep');
    expect(healthOf(game, 1)).toBe(RULES.startingHealth - 2);
    // Burn is persistent, so it stays.
    expect(game.players[1].statuses.burn).toBe(1);
  });

  it('removes one Fire Mastery per Upkeep Phase', () => {
    let game = newGame(PYROMANCER, BARBARIAN);
    game.players[0].statuses['fire-mastery'] = 3;
    // Upkeep effects fire on *entering* the phase, so end player 2's turn to
    // hand play back to player 1.
    game.active = 1;
    game.phase = 'discard';
    game = next(game);
    expect(game.active).toBe(0);
    expect(game.phase).toBe('upkeep');
    expect(game.players[0].statuses['fire-mastery']).toBe(2);
  });
});

describe('status effects in play', () => {
  it('Blessing of Divinity converts a lethal hit into 1 health', () => {
    let game = newGame();
    game.teams[game.players[1].team].health = 4;
    game.players[1].statuses['blessing-of-divinity'] = 1;
    game.phase = 'defensiveRoll';
    game.attack = {
      attacker: 0,
      defender: 1,
      abilityId: 'holy-attack',
      abilityName: 'Holy Attack',
      incoming: 20,
      type: 'normal',
      modifiers: [],
      afterDamage: [],
      defenseResolved: true,
    };

    game = act(game, { type: 'resolveAttack' });
    expect(healthOf(game, 1)).toBe(1);
    expect(game.players[1].statuses['blessing-of-divinity']).toBeUndefined();
    expect(game.winner).toBeNull();
  });

  it('Crit needs an attack of at least 5 damage', () => {
    const game = newGame();
    game.phase = 'defensiveRoll';
    game.players[0].statuses.crit = 1;
    game.attack = {
      attacker: 0,
      defender: 1,
      abilityId: 'x',
      abilityName: 'X',
      incoming: 4,
      type: 'normal',
      modifiers: [],
      afterDamage: [],
      defenseResolved: true,
    };
    expect(() => act(game, { type: 'spendStatus', playerId: 'p1', statusId: 'crit' })).toThrow(
      /at least 5/,
    );
  });

  it('Crit adds 4 to an attack that qualifies', () => {
    let game = newGame();
    game.phase = 'defensiveRoll';
    game.players[0].statuses.crit = 1;
    game.attack = {
      attacker: 0,
      defender: 1,
      abilityId: 'x',
      abilityName: 'X',
      incoming: 6,
      type: 'normal',
      modifiers: [],
      afterDamage: [],
      defenseResolved: true,
    };
    game = act(game, { type: 'spendStatus', playerId: 'p1', statusId: 'crit' });
    game = act(game, { type: 'resolveAttack' });
    expect(healthOf(game, 1)).toBe(RULES.startingHealth - 10);
  });

  it('Targeted adds 2 to incoming attacks automatically', () => {
    let game = newGame();
    game.players[1].statuses.targeted = 1;
    game = next(game);
    // Force a known ability rather than depending on the roll.
    game.roll!.dice = [1, 2, 3, 4, 6].map((value, i) => ({ id: `d${i}`, value, kept: true }));
    game = act(game, { type: 'activateAbility', abilityId: 'holy-attack', tierIndex: 0 });
    expect(game.attack?.modifiers).toContainEqual({ source: 'Targeted', kind: 'add', amount: 2 });
  });

  it('Knockdown skips the Offensive Roll Phase when the CP cannot be paid', () => {
    let game = newGame();
    game.players[0].statuses.knockdown = 1;
    game.players[0].cp = 1;
    game = next(game);
    expect(game.phase).toBe('main2');
    expect(game.players[0].statuses.knockdown).toBeUndefined();
  });

  it('paying the Knockdown tax keeps the Offensive Roll Phase', () => {
    let game = newGame();
    game.players[0].statuses.knockdown = 1;
    game.players[0].cp = 3;
    game = act(game, { type: 'payKnockdown' });
    expect(game.players[0].cp).toBe(1);
    game = next(game);
    expect(game.phase).toBe('offensiveRoll');
  });

  it('Entangle costs a Roll Attempt', () => {
    let game = newGame();
    game.players[0].statuses.entangle = 1;
    game = next(game);
    expect(game.roll!.maxAttempts).toBe(RULES.rollAttempts - 1);
  });

  it('Delayed Poison fires at the end of the turn and removes itself', () => {
    let game = newGame();
    game.players[0].statuses['delayed-poison'] = 2;
    game.phase = 'discard';
    game = next(game);
    expect(healthOf(game, 0)).toBe(RULES.startingHealth - 6);
    expect(game.players[0].statuses['delayed-poison']).toBeUndefined();
  });
});

describe('ability targeting', () => {
  it('gives "a chosen player" bonus to the caster, not the opponent', () => {
    let game = newGame();
    game = next(game); // -> offensiveRoll
    // Retaliate needs 3 HELMET (3/4) + 1 PRAYER (6).
    game.roll!.dice = [3, 3, 4, 6, 1].map((value, i) => ({ id: `d${i}`, value, kept: true }));
    game = act(game, { type: 'activateAbility', abilityId: 'retaliate' });

    expect(game.players[0].statuses.retribution).toBe(1);
    expect(game.players[1].statuses.retribution).toBeUndefined();
    expect(game.players[0].cp).toBe(RULES.startingCp + 3);
  });

  it('inflicts negative status on the opponent', () => {
    let game = newGame(BARBARIAN, PALADIN);
    game = next(game);
    // Crit Bash needs 4 POW (6) for the Barbarian.
    game.roll!.dice = [6, 6, 6, 6, 1].map((value, i) => ({ id: `d${i}`, value, kept: true }));
    game = act(game, { type: 'activateAbility', abilityId: 'crit-bash' });
    expect(game.players[1].statuses.stun).toBe(1);
  });
});

describe('Shadow Thief has two Defensive Abilities', () => {
  it('offers both and uses whichever is chosen', () => {
    const game = newGame(PALADIN, SHADOW_THIEF);
    game.phase = 'defensiveRoll';
    game.attack = {
      attacker: 0,
      defender: 1,
      abilityId: 'holy-attack',
      abilityName: 'Holy Attack',
      incoming: 8,
      type: 'normal',
      modifiers: [],
      afterDamage: [],
      defenseResolved: false,
    };
    const defences = legalActions(game, lookup).filter((a) => a.type === 'chooseDefense');
    const ids = defences.map((a) => (a.type === 'chooseDefense' ? a.abilityId : null));
    expect(ids).toContain('shadow-defense');
    expect(ids).toContain('counter-strike');
    expect(ids).toContain(null);
  });
});

describe('Stun', () => {
  it('grants the attacker another Offensive Roll Phase', () => {
    let game = newGame(BARBARIAN, PALADIN);
    game.players[1].statuses.stun = 1;
    game.phase = 'defensiveRoll';
    game.attack = {
      attacker: 0,
      defender: 1,
      abilityId: 'crit-bash',
      abilityName: 'Crit Bash',
      incoming: 5,
      type: 'undefendable',
      modifiers: [],
      afterDamage: [],
      defenseResolved: true,
    };
    game = act(game, { type: 'resolveAttack' });
    expect(game.phase).toBe('offensiveRoll');
    expect(game.active).toBe(0);
    expect(game.players[1].statuses.stun).toBeUndefined();
  });
});

describe('an ultimate cannot be defended', () => {
  it('rejects a Defensive Ability against Ultimate damage', () => {
    const game = newGame();
    game.phase = 'defensiveRoll';
    game.attack = {
      attacker: 0,
      defender: 1,
      abilityId: 'resolute-faith',
      abilityName: 'Resolute Faith!',
      incoming: 10,
      type: 'ultimate',
      modifiers: [],
      afterDamage: [],
      defenseResolved: false,
    };
    expect(() => act(game, { type: 'chooseDefense', abilityId: 'thick-skin' })).toThrow(
      /cannot be defended/,
    );
  });
});

/* ------------------------------------------------------------------ */
/* Full-game smoke test                                                 */
/* ------------------------------------------------------------------ */

/** Picks a reasonable action: attack if possible, otherwise keep the game moving. */
function botAction(state: GameState): Action | null {
  const options = legalActions(state, lookup);
  if (options.length === 0) return null;

  if (state.phase === 'targetingRoll') {
    return options.find((a) => a.type === 'rollTarget') ?? options[0];
  }

  if (state.phase === 'defensiveRoll') {
    const attack = state.attack!;
    if (!attack.defenseResolved) {
      return (
        options.find((a) => a.type === 'chooseDefense' && a.abilityId !== null) ??
        options.find((a) => a.type === 'chooseDefense')!
      );
    }
    return { type: 'resolveAttack' };
  }

  if (state.phase === 'offensiveRoll') {
    const roll = state.roll!;
    const attack = options.find((a) => a.type === 'activateAbility');
    // Use every Roll Attempt before settling for whatever is on the table.
    if (roll.attemptsUsed < roll.maxAttempts && !attack) return { type: 'rollDice' };
    return attack ?? { type: 'skipAttack' };
  }

  return options.find((a) => a.type === 'nextPhase') ?? options[0];
}

describe('full game', () => {
  it('plays to a winner without stalling', () => {
    let game = newGame(PALADIN, BARBARIAN, 2024);
    let steps = 0;

    while (game.phase !== 'gameOver' && steps < 20000) {
      const action = botAction(game);
      if (!action) break;
      game = act(game, action);
      steps++;
    }

    expect(game.phase).toBe('gameOver');
    expect(game.winner).not.toBeUndefined();
    expect(game.teams.some((t) => t.health === 0)).toBe(true);
    expect(steps).toBeLessThan(20000);
  });

  it('plays every Season 1 matchup to completion', () => {
    const heroes = Object.values(HEROES);
    for (const [i, a] of heroes.entries()) {
      const b = heroes[(i + 1) % heroes.length];
      let game = newGame(a, b, 100 + i);
      let steps = 0;
      while (game.phase !== 'gameOver' && steps < 20000) {
        const action = botAction(game);
        if (!action) break;
        game = act(game, action);
        steps++;
      }
      expect(game.phase, `${a.name} vs ${b.name}`).toBe('gameOver');
    }
  });
});
