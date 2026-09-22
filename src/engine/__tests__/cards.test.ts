import { describe, expect, it } from 'vitest';
import { HEROES } from '../../data/heroes';
import { NINJA } from '../../data/heroes/season1/ninja';
import { PALADIN } from '../../data/heroes/season1/paladin';
import { BARBARIAN } from '../../data/heroes/season1/barbarian';
import type { Action } from '../actions';
import { canAct } from '../authority';
import { legalActions, reduce, type HeroLookup } from '../reducer';
import {
  RULES,
  createGame,
  healthOf,
  topPending,
  type GameState,
  type PlayerState,
} from '../state';

const lookup: HeroLookup = (id) => HEROES[id];
const act = (state: GameState, action: Action) => reduce(state, action, lookup);
const next = (state: GameState) => act(state, { type: 'nextPhase' });

function newGame(a = PALADIN, b = BARBARIAN, seed = 7): GameState {
  return createGame(
    [
      { id: 'p1', name: 'One', hero: a },
      { id: 'p2', name: 'Two', hero: b },
    ],
    seed,
  );
}

/** Puts a specific card in a player's hand and gives them the CP to play it. */
function deal(player: PlayerState, cardId: string, cp = 9): string {
  const instance = `${cardId}#0`;
  player.hand.unshift(instance);
  player.cp = cp;
  return instance;
}

/** Drives the game to a pending attack so Instants have something to answer. */
function attackPending(seed = 7): GameState {
  let game = newGame(PALADIN, BARBARIAN, seed);
  for (let i = 0; i < 400 && !game.attack; i++) {
    const options = legalActions(game, lookup);
    const step = topPending(game);
    if (step) {
      const pick =
        options.find((o) => o.type === 'rollPending') ??
        options.find((o) => o.type === 'confirmPending') ??
        options.find((o) => o.type === 'answerChoice');
      if (!pick) break;
      game = act(game, pick);
      continue;
    }
    if (game.phase === 'offensiveRoll') {
      const attack = options.find((o) => o.type === 'activateAbility');
      if (attack) {
        game = act(game, attack);
        continue;
      }
      if (game.roll!.attemptsUsed < game.roll!.maxAttempts) {
        game = act(game, { type: 'rollDice' });
        continue;
      }
      game = act(game, { type: 'skipAttack' });
      continue;
    }
    const advance = options.find((o) => o.type === 'nextPhase');
    if (!advance) break;
    game = act(game, advance);
  }
  return game;
}

/* ------------------------------------------------------------------ */
/* Instant and Roll Phase cards                                         */
/* ------------------------------------------------------------------ */

describe('Instant cards', () => {
  it('can be played by the defender, not only by whoever is on turn', () => {
    const game = attackPending();
    expect(game.attack).not.toBeNull();

    const defender = game.players[game.attack!.defender];
    const card = deal(defender, 'common-card-next-time');

    const options = legalActions(game, lookup);
    const play = options.find((o) => o.type === 'playCard' && o.cardId === card);
    expect(play, 'the defender is offered their Instant').toBeDefined();
    expect(canAct(game, game.attack!.defender, play!)).toBe(true);
  });

  it('folds its prevention into the pending attack', () => {
    let game = attackPending();
    const defenderIndex = game.attack!.defender;
    const card = deal(game.players[defenderIndex], 'common-card-next-time');
    const before = game.attack!.modifiers.length;

    game = act(game, { type: 'playCard', cardId: card, playerId: game.players[defenderIndex].id });

    expect(game.attack!.modifiers.length).toBe(before + 1);
    expect(game.attack!.modifiers.at(-1)).toMatchObject({ kind: 'prevent', amount: 6 });
  });

  it('is refused when its window is closed', () => {
    const game = newGame();
    const card = deal(game.players[0], 'common-card-next-time');
    // No attack on the table, so there is nothing to prevent.
    expect(legalActions(game, lookup).some((o) => o.type === 'playCard' && o.cardId === card)).toBe(
      false,
    );
    expect(() => act(game, { type: 'playCard', cardId: card })).toThrow(/cannot be played/);
  });

  it('draws cards without asking anything', () => {
    let game = newGame();
    const card = deal(game.players[0], 'common-card-double');
    const before = game.players[0].hand.length;

    game = act(game, { type: 'playCard', cardId: card });

    // One card left the hand, two came in.
    expect(game.players[0].hand.length).toBe(before + 1);
    expect(topPending(game)).toBeNull();
  });
});

describe('Roll Phase cards', () => {
  it('sets a die to the value the player picked', () => {
    let game = next(newGame()); // -> offensiveRoll, dice on the table
    const card = deal(game.players[0], 'common-card-play-six');

    game = act(game, { type: 'playCard', cardId: card });

    const step = topPending(game);
    expect(step?.request.kind).toBe('choice');

    const pick = legalActions(game, lookup).find((o) => o.type === 'answerChoice');
    expect(pick).toBeDefined();
    const dieId = pick?.type === 'answerChoice' ? pick.answer.dieId : undefined;
    game = act(game, pick!);

    expect(topPending(game)).toBeNull();
    expect(game.roll!.dice.find((d) => d.id === dieId)!.value).toBe(6);
  });

  it('needs dice on the table', () => {
    const game = newGame(); // main1, no roll
    const card = deal(game.players[0], 'common-card-play-six');
    expect(legalActions(game, lookup).some((o) => o.type === 'playCard' && o.cardId === card)).toBe(
      false,
    );
  });
});

/* ------------------------------------------------------------------ */
/* Cards that strip status effects                                      */
/* ------------------------------------------------------------------ */

describe('status removal cards', () => {
  it('Bye Bye! takes the token the player picks', () => {
    let game = newGame();
    game.players[1].statuses.concussion = 1;
    const card = deal(game.players[0], 'common-card-bye-bye');

    game = act(game, { type: 'playCard', cardId: card });

    const options = legalActions(game, lookup).filter((o) => o.type === 'answerChoice');
    const pick = options.find(
      (o) => o.type === 'answerChoice' && o.answer.status?.statusId === 'concussion',
    );
    expect(pick, 'the opponent’s Concussion is on offer').toBeDefined();

    game = act(game, pick!);

    expect(game.players[1].statuses.concussion).toBeUndefined();
    expect(topPending(game)).toBeNull();
  });

  it('What Status? clears every token on the chosen player', () => {
    let game = newGame();
    game.players[1].statuses = { concussion: 1, burn: 2 };
    const card = deal(game.players[0], 'common-card-what-status');

    game = act(game, { type: 'playCard', cardId: card });
    const pick = legalActions(game, lookup).find(
      (o) => o.type === 'answerChoice' && o.answer.player === 1,
    );
    game = act(game, pick!);

    expect(game.players[1].statuses).toEqual({});
  });

  it('does not strand the table when there is nothing to remove', () => {
    let game = newGame();
    // Nobody holds a token, so Bye Bye! has no legal answer.
    game.players.forEach((p) => (p.statuses = {}));
    const card = deal(game.players[0], 'common-card-bye-bye');

    game = act(game, { type: 'playCard', cardId: card });

    expect(topPending(game), 'the card resolves instead of hanging').toBeNull();
    const options = legalActions(game, lookup);
    expect(options.some((o) => o.type === 'nextPhase')).toBe(true);
  });

  it('Transfer Status! moves a token from one player to another', () => {
    let game = newGame();
    game.players[0].statuses.burn = 1;
    const card = deal(game.players[0], 'common-card-transfer-status');

    game = act(game, { type: 'playCard', cardId: card });
    game = act(
      game,
      legalActions(game, lookup).find(
        (o) => o.type === 'answerChoice' && o.answer.status?.statusId === 'burn',
      )!,
    );
    game = act(
      game,
      legalActions(game, lookup).find((o) => o.type === 'answerChoice' && o.answer.player === 1)!,
    );

    expect(game.players[0].statuses.burn).toBeUndefined();
    expect(game.players[1].statuses.burn).toBe(1);
  });
});

/* ------------------------------------------------------------------ */
/* Rolls the player makes by hand                                       */
/* ------------------------------------------------------------------ */

describe('defence rolls', () => {
  it('waits for the defender to throw the dice themselves', () => {
    let game = attackPending();
    const defenderIndex = game.attack!.defender;
    const defence = legalActions(game, lookup).find(
      (o) => o.type === 'chooseDefense' && o.abilityId !== null,
    );
    if (!defence) return; // that defender's ability needs no roll

    game = act(game, defence);

    const step = topPending(game);
    expect(step, 'the defence roll is owed to the defender').not.toBeNull();
    expect(step!.who).toBe(defenderIndex);
    expect(step!.request.kind).toBe('roll');
    expect(step!.rolled).toBe(false);
    expect(game.attack!.defenseResolved).toBe(false);

    // Only the defender may throw them.
    expect(canAct(game, defenderIndex, { type: 'rollPending' })).toBe(true);
    expect(canAct(game, game.attack!.attacker, { type: 'rollPending' })).toBe(false);

    game = act(game, { type: 'rollPending' });
    const thrown = topPending(game)!;
    expect(thrown.rolled).toBe(true);
    expect(thrown.dice.length).toBe(
      thrown.request.kind === 'roll' ? thrown.request.dice : 0,
    );

    game = act(game, { type: 'confirmPending' });
    expect(topPending(game)).toBeNull();
    expect(game.attack!.defenseResolved).toBe(true);
  });
});

describe('token spends that roll', () => {
  it('hands the die to the token holder instead of rolling it in the log', () => {
    let game = attackPending();
    const defenderIndex = game.attack!.defender;
    const defender = game.players[defenderIndex];
    defender.statuses['smoke-bomb'] = 1;
    game.attack!.defenseResolved = true;

    game = act(game, {
      type: 'spendStatus',
      playerId: defender.id,
      statusId: 'smoke-bomb',
    });

    const step = topPending(game);
    expect(step?.who).toBe(defenderIndex);
    expect(step?.source).toBe('smoke-bomb');
    // The token is spent whatever the die says.
    expect(game.players[defenderIndex].statuses['smoke-bomb']).toBeUndefined();

    game = act(game, { type: 'rollPending' });
    const rolled = topPending(game)!.dice[0].value;
    game = act(game, { type: 'confirmPending' });

    expect(topPending(game)).toBeNull();
    const avoided = game.attack!.modifiers.some((m) => m.kind === 'avoid');
    expect(avoided).toBe(rolled <= 3);
  });
});

describe('sub-rolls inside an ability', () => {
  it('stops for the player rather than rolling behind their back', () => {
    let game = next(newGame(NINJA, BARBARIAN, 3));
    // Force the dice Death Blossom needs: 3 Ninjato + 2 Shuriken.
    game.roll!.dice = [
      { id: 'd0', value: 1, kept: false },
      { id: 'd1', value: 2, kept: false },
      { id: 'd2', value: 3, kept: false },
      { id: 'd3', value: 4, kept: false },
      { id: 'd4', value: 5, kept: false },
    ];

    game = act(game, { type: 'activateAbility', abilityId: 'death-blossom', tierIndex: 0 });

    const step = topPending(game);
    expect(step?.request.kind).toBe('roll');
    expect(step?.who).toBe(0);
    expect(game.attack, 'no attack until the sub-roll lands').toBeNull();

    game = act(game, { type: 'rollPending' });
    game = act(game, { type: 'confirmPending' });

    expect(topPending(game)).toBeNull();
    // Death Blossom always deals something on 5 dice, so an attack is pending.
    expect(game.attack).not.toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* Discard Phase                                                        */
/* ------------------------------------------------------------------ */

describe('Discard Phase', () => {
  it('offers selling even when the hand is already at the limit', () => {
    let game = newGame();
    game = next(game); // offensiveRoll
    game = act(game, { type: 'skipAttack' }); // main2
    game = next(game); // discard
    expect(game.phase).toBe('discard');
    expect(game.players[0].hand.length).toBeLessThanOrEqual(RULES.handLimit);

    const options = legalActions(game, lookup);
    const sells = options.filter((o) => o.type === 'sellCard');
    expect(sells.length).toBe(game.players[0].hand.length);
    expect(options.some((o) => o.type === 'nextPhase')).toBe(true);
  });

  it('will not let the turn end over the hand limit', () => {
    let game = newGame();
    game = next(game);
    game = act(game, { type: 'skipAttack' });
    game = next(game); // discard
    while (game.players[0].hand.length <= RULES.handLimit) {
      game.players[0].hand.push('common-card-double#0');
    }

    const options = legalActions(game, lookup);
    expect(options.some((o) => o.type === 'nextPhase')).toBe(false);
    expect(options.some((o) => o.type === 'sellCard')).toBe(true);
  });

  it('sells for CP', () => {
    let game = newGame();
    game = next(game);
    game = act(game, { type: 'skipAttack' });
    game = next(game); // discard
    const cp = game.players[0].cp;
    const card = game.players[0].hand[0];

    game = act(game, { type: 'sellCard', cardId: card });

    expect(game.players[0].cp).toBe(cp + RULES.sellValue);
    expect(game.players[0].discard).toContain(card);
  });
});

/* ------------------------------------------------------------------ */
/* Cards with no choice attached still do their job                     */
/* ------------------------------------------------------------------ */

describe('plain hero cards', () => {
  it('Knife Fan! deals its damage straight to the dial', () => {
    let game = newGame(NINJA, BARBARIAN);
    const card = deal(game.players[0], 'ninja-ninja-card-knife-fan');
    const before = healthOf(game, 1);

    game = act(game, { type: 'playCard', cardId: card });

    expect(healthOf(game, 1)).toBe(before - 1);
  });

  it('Training! grants the token it promises', () => {
    let game = newGame(NINJA, BARBARIAN);
    const card = deal(game.players[0], 'ninja-ninja-card-training');

    game = act(game, { type: 'playCard', cardId: card });

    expect(game.players[0].statuses.ninjutsu).toBe(1);
  });

  it('Fan the Flames! raises the stack limit it says it does', () => {
    const PYRO = HEROES.pyromancer;
    let game = newGame(PYRO, BARBARIAN);
    const card = deal(game.players[0], 'pyromancer-card-fan-the-flames');

    game = act(game, { type: 'playCard', cardId: card });

    expect(game.players[0].stackLimits['fire-mastery']).toBeGreaterThan(
      PYRO.statusEffects.find((s) => s.id === 'fire-mastery')!.stackLimit,
    );
    expect(game.players[0].statuses['fire-mastery']).toBe(2);
  });
});
