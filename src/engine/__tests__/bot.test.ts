import { describe, expect, it } from 'vitest';
import { HEROES, HERO_LIST } from '../../data/heroes';
import { chooseBotAction, runBots, seatToAct, waitingOnBot } from '../bot';
import { reduce, type HeroLookup } from '../reducer';
import {
  RULES,
  createGame,
  healthOf,
  playerCountFor,
  topPending,
  type GameMode,
  type GameState,
} from '../state';

const lookup: HeroLookup = (id) => HEROES[id];
const step = (state: GameState, action: Parameters<typeof reduce>[1]) =>
  reduce(state, action, lookup);

function table(mode: GameMode, count = playerCountFor(mode), bots = count, seed = 9): GameState {
  return createGame(
    Array.from({ length: count }, (_, i) => ({
      id: `p${i + 1}`,
      name: `P${i + 1}`,
      hero: HERO_LIST[i % HERO_LIST.length],
      isBot: i >= count - bots,
    })),
    { mode, seed },
  );
}

describe('bot seats', () => {
  it('marks which seats the engine plays', () => {
    const game = table('1v1', 2, 1);
    expect(game.players.map((p) => p.isBot)).toEqual([false, true]);
  });

  it('knows when it is waiting on a bot', () => {
    const human = table('1v1', 2, 1);
    expect(seatToAct(human)).toBe(0);
    expect(waitingOnBot(human)).toBe(false);

    const allBots = table('1v1', 2, 2);
    expect(waitingOnBot(allBots)).toBe(true);
  });

  it('only ever proposes an action the rules allow', () => {
    let game = table('1v1', 2, 2, 31);
    for (let i = 0; i < 300 && game.phase !== 'gameOver'; i++) {
      const seat = seatToAct(game);
      const action = chooseBotAction(game, seat, lookup);
      if (!action) break;
      // reduce() throws on an illegal action, so this loop is the assertion.
      game = step(game, action);
    }
    expect(game.log.length).toBeGreaterThan(10);
  });
});

describe('bot decisions', () => {
  it('commits to the Ultimate when it is available', () => {
    let game = table('1v1', 2, 2, 5);
    // Paladin sits at seat 4 in HERO_LIST order, so drive seat 0's hero instead.
    game = step(game, { type: 'nextPhase' });
    const hero = HEROES[game.players[0].heroId];
    const ultimate = hero.abilities.find((a) => a.ultimate)!;
    const req = ultimate.tiers[0].requirement;
    if (req.kind !== 'symbols') return;
    // Build the exact hand the Ultimate needs.
    const symbol = Object.keys(req.symbols)[0];
    const value = hero.dieFaces.findIndex((f) => f.symbol === symbol) + 1;
    game.roll!.dice = game.roll!.dice.map((d, i) => ({ ...d, id: `d${i}`, value, kept: true }));

    const action = chooseBotAction(game, 0, lookup);
    expect(action?.type).toBe('activateAbility');
    expect(action && 'abilityId' in action && action.abilityId).toBe(ultimate.id);
  });

  it('defends rather than taking the hit', () => {
    const game = table('1v1', 2, 2, 7);
    game.phase = 'defensiveRoll';
    game.attack = {
      attacker: 0,
      defender: 1,
      abilityId: 'x',
      abilityName: 'X',
      incoming: 9,
      type: 'normal',
      modifiers: [],
      afterDamage: [],
      defenseResolved: false,
    };
    const action = chooseBotAction(game, 1, lookup);
    expect(action?.type).toBe('chooseDefense');
    expect(action && 'abilityId' in action && action.abilityId).not.toBeNull();
  });

  it('spends Crit on an attack big enough to qualify', () => {
    const game = table('1v1', 2, 2, 7);
    game.players[0].statuses.crit = 1;
    game.phase = 'defensiveRoll';
    game.attack = {
      attacker: 0,
      defender: 1,
      abilityId: 'x',
      abilityName: 'X',
      incoming: 8,
      type: 'normal',
      modifiers: [],
      afterDamage: [],
      defenseResolved: true,
    };
    const action = chooseBotAction(game, 0, lookup);
    expect(action).toEqual({ type: 'spendStatus', playerId: 'p1', statusId: 'crit' });
  });

  it('aims the targeting choice at whoever is closest to out', () => {
    const game = table('2v2', 4, 4, 13);
    game.teams[1].health = 8;
    game.phase = 'targetingRoll';
    game.targeting = {
      abilityId: 'x',
      tierIndex: 0,
      usedDice: [],
      opponents: [1, 3],
      roll: 6,
      chooser: 'attacker',
    };
    const action = chooseBotAction(game, 0, lookup);
    // Seats 1 and 3 share team 1's dial, so either is the weakest; the point is
    // that it picks a legal target rather than stalling.
    expect(action?.type).toBe('chooseTarget');
    expect([1, 3]).toContain(action && 'target' in action ? action.target : -1);
  });
});

describe('bots and the steps the engine stops for', () => {
  it('throws the dice a sub-roll or a defence owes, rather than stalling', () => {
    let game = table('1v1', 2, 2, 31);
    let sawPending = false;

    for (let i = 0; i < 4000 && game.phase !== 'gameOver'; i++) {
      const step0 = topPending(game);
      if (step0) {
        sawPending = true;
        // The seat that owes the step is the seat the bot runner will pick.
        expect(seatToAct(game)).toBe(step0.who);
      }
      const seat = seatToAct(game);
      const action = chooseBotAction(game, seat, lookup);
      expect(action, 'a bot always has something legal to do').not.toBeNull();
      game = step(game, action!);
    }

    expect(sawPending, 'a real game reaches at least one pending step').toBe(true);
    expect(game.phase).toBe('gameOver');
  });

  it('answers a card question instead of picking at random', () => {
    let game = table('1v1', 2, 2, 12);
    // Bye Bye! removes a token; the bot should take the one hurting itself.
    game.players[0].statuses.concussion = 1;
    game.players[1].statuses.crit = 1;
    game.players[0].hand.unshift('common-card-bye-bye#0');
    game.players[0].cp = 9;

    game = step(game, { type: 'playCard', cardId: 'common-card-bye-bye#0' });
    const pending = topPending(game);
    expect(pending?.request.kind).toBe('choice');

    const action = chooseBotAction(game, pending!.who, lookup);
    game = step(game, action!);

    expect(game.players[0].statuses.concussion, 'its own burden goes first').toBeUndefined();
    expect(game.players[1].statuses.crit).toBe(1);
  });

  it('does not dump its hand now that selling is always on offer', () => {
    let game = table('1v1', 2, 2, 8);
    game = step(game, { type: 'nextPhase' }); // offensiveRoll
    game = step(game, { type: 'skipAttack' }); // main2
    game = step(game, { type: 'nextPhase' }); // discard
    expect(game.phase).toBe('discard');

    const held = game.players[0].hand.length;
    expect(held).toBeLessThanOrEqual(RULES.handLimit);

    const action = chooseBotAction(game, 0, lookup);
    expect(action?.type, 'under the limit there is nothing to sell').toBe('nextPhase');
  });
});

describe('bots finish games', () => {
  const tables: [GameMode, number][] = [
    ['1v1', 2],
    ['2v2', 4],
    ['3v3', 6],
    ['2v2v2', 6],
    ['koth', 3],
    ['koth', 5],
  ];

  it.each(tables)('%s with %i bots reaches a winner', (mode, count) => {
    let game = table(mode, count, count, 777);
    let steps = 0;
    while (game.phase !== 'gameOver' && steps < 30000) {
      const before = game;
      game = runBots(game, lookup, step, 50);
      if (game === before) break;
      steps += 1;
    }
    expect(game.phase, `${mode} stalled`).toBe('gameOver');
    expect(game.teams.filter((t) => t.health > 0).length).toBeLessThanOrEqual(1);
  });

  it('plays a human seat against a bot without touching the human', () => {
    let game = table('1v1', 2, 1, 21);
    // Hand the turn to the bot and let it run until it is the human's move.
    game = step(game, { type: 'nextPhase' });
    game = step(game, { type: 'skipAttack' });
    game = step(game, { type: 'nextPhase' });
    game = step(game, { type: 'nextPhase' });
    expect(game.active).toBe(1);

    game = runBots(game, lookup, step);
    // Control comes back to the human, and the bot did something on the way.
    expect(waitingOnBot(game)).toBe(false);
    expect(game.log.some((e) => e.player === 'P2')).toBe(true);
  });

  it('never leaves a bot game stuck on the same state', () => {
    let game = table('koth', 4, 4, 404);
    const seen = new Set<string>();
    for (let i = 0; i < 2000 && game.phase !== 'gameOver'; i++) {
      const seat = seatToAct(game);
      const action = chooseBotAction(game, seat, lookup);
      if (!action) break;
      const next = step(game, action);
      const key = `${next.round}:${next.active}:${next.phase}:${next.teams.map((t) => t.health)}`;
      // The same situation may recur, but health must keep moving overall.
      seen.add(key);
      game = next;
    }
    expect(seen.size).toBeGreaterThan(50);
    expect(game.teams.some((t) => t.health < RULES.startingHealth)).toBe(true);
    void healthOf;
  });
});
