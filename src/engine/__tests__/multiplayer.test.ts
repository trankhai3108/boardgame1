import { describe, expect, it } from 'vitest';
import { HEROES, HERO_LIST } from '../../data/heroes';
import type { Action } from '../actions';
import { legalActions, reduce, type HeroLookup } from '../reducer';
import {
  KOTH_HEALTH,
  MODES,
  RULES,
  createGame,
  healthOf,
  opponentsOf,
  playerCountFor,
  teammatesOf,
  type GameMode,
  type GameState,
} from '../state';
import { needsTargetingRoll, resolveTargetRoll } from '../targeting';
import { activateThrough } from './support';

const lookup: HeroLookup = (id) => HEROES[id];
const act = (state: GameState, action: Action) => reduce(state, action, lookup);

/** Paladin first, so tests can lean on a hero whose abilities they know. */
const heroes = [
  HEROES.paladin,
  ...HERO_LIST.filter((h) => h.id !== 'paladin'),
];

function seat(mode: GameMode, count = playerCountFor(mode), seed = 5): GameState {
  return createGame(
    Array.from({ length: count }, (_, i) => ({
      id: `p${i + 1}`,
      name: `P${i + 1}`,
      hero: heroes[i % heroes.length],
    })),
    { mode, seed },
  );
}

describe('table setup', () => {
  it('seats 1v1 as two teams of one', () => {
    const game = seat('1v1');
    expect(game.players).toHaveLength(2);
    expect(game.teams).toHaveLength(2);
    expect(game.teams.every((t) => t.health === RULES.startingHealth)).toBe(true);
  });

  it.each([
    ['2v2', 4, 2],
    ['3v3', 6, 2],
    ['2v2v2', 6, 3],
  ] as const)('%s seats %i players into %i teams', (mode, players, teams) => {
    const game = seat(mode);
    expect(game.players).toHaveLength(players);
    expect(game.teams).toHaveLength(teams);
  });

  it('zigzags the seating so turn order alternates teams', () => {
    const game = seat('2v2');
    expect(game.players.map((p) => p.team)).toEqual([0, 1, 0, 1]);
  });

  it('seats 2v2v2 so teammates sit three apart', () => {
    const game = seat('2v2v2');
    expect(game.players.map((p) => p.team)).toEqual([0, 1, 2, 0, 1, 2]);
    expect(teammatesOf(game, 0)).toEqual([3]);
  });

  it('shares one Health Dial per team', () => {
    const game = seat('2v2');
    expect(healthOf(game, 0)).toBe(RULES.startingHealth);
    expect(healthOf(game, 2)).toBe(RULES.startingHealth);
    game.teams[0].health -= 10;
    // Teammates 0 and 2 read the same dial; opponents are untouched.
    expect(healthOf(game, 2)).toBe(RULES.startingHealth - 10);
    expect(healthOf(game, 1)).toBe(RULES.startingHealth);
  });

  it.each([3, 4, 5])('gives King of the Hill %i players their own dial', (n) => {
    const game = seat('koth', n);
    expect(game.teams).toHaveLength(n);
    expect(game.teams.every((t) => t.health === KOTH_HEALTH[n])).toBe(true);
  });

  it('refuses a head count the mode cannot seat', () => {
    expect(() => seat('2v2', 3)).toThrow(/needs 4 players/);
    expect(() => seat('koth', 6)).toThrow(/3 to 5/);
  });
});

describe('opponents and targeting order', () => {
  it('lists opponents clockwise from the attacker, skipping teammates', () => {
    const game = seat('2v2');
    // Seats 0..3 are teams [0,1,0,1]; player 0's rivals are seats 1 and 3.
    expect(opponentsOf(game, 0)).toEqual([1, 3]);
    expect(opponentsOf(game, 1)).toEqual([2, 0]);
  });

  it('drops opponents whose team is already out', () => {
    const game = seat('2v2v2');
    game.teams[1].health = 0;
    expect(opponentsOf(game, 0)).toEqual([2, 5]);
  });

  it('needs no targeting roll when only one rival can be hit', () => {
    expect(needsTargetingRoll('1v1', [1])).toBe(false);
    expect(needsTargetingRoll('2v2', [1])).toBe(false);
    expect(needsTargetingRoll('2v2', [1, 3])).toBe(true);
  });
});

describe('the targeting table', () => {
  it('reads 1-2 left, 3-4 right, 5 defenders choose, 6 attacker chooses', () => {
    const opps = [1, 3];
    expect(resolveTargetRoll('2v2', opps, 1)).toEqual({ kind: 'fixed', target: 1 });
    expect(resolveTargetRoll('2v2', opps, 2)).toEqual({ kind: 'fixed', target: 1 });
    expect(resolveTargetRoll('2v2', opps, 3)).toEqual({ kind: 'fixed', target: 3 });
    expect(resolveTargetRoll('2v2', opps, 4)).toEqual({ kind: 'fixed', target: 3 });
    expect(resolveTargetRoll('2v2', opps, 5)).toEqual({ kind: 'defendersChoose' });
    expect(resolveTargetRoll('2v2', opps, 6)).toEqual({ kind: 'attackerChooses' });
  });

  it('reads 1-2 left, 3-4 middle, 5-6 right for three opponents', () => {
    const opps = [1, 3, 5];
    expect(resolveTargetRoll('3v3', opps, 2)).toEqual({ kind: 'fixed', target: 1 });
    expect(resolveTargetRoll('3v3', opps, 4)).toEqual({ kind: 'fixed', target: 3 });
    expect(resolveTargetRoll('3v3', opps, 6)).toEqual({ kind: 'fixed', target: 5 });
  });

  it('lets King of the Hill pick freely', () => {
    expect(resolveTargetRoll('koth', [1, 2, 3], 4)).toEqual({ kind: 'attackerChooses' });
  });
});

describe('the Targeting Roll Phase in play', () => {
  function reachTargeting(): GameState {
    let game = seat('2v2', 4, 11);
    game = act(game, { type: 'nextPhase' }); // -> offensiveRoll
    // Paladin sits at seat 0; force a small straight to activate Holy Attack.
    game.roll!.dice = [1, 2, 3, 4, 6].map((value, i) => ({ id: `d${i}`, value, kept: true }));
    return activateThrough(game, 'holy-attack', 0);
  }

  it('stops for a targeting roll when two rivals are alive', () => {
    const game = reachTargeting();
    expect(game.phase).toBe('targetingRoll');
    expect(game.targeting?.opponents).toEqual([1, 3]);
    expect(legalActions(game, lookup)).toContainEqual({ type: 'rollTarget' });
  });

  it('resolves into a defence once the die names a defender', () => {
    let game = reachTargeting();
    game = act(game, { type: 'rollTarget' });
    if (game.targeting?.chooser) {
      game = act(game, { type: 'chooseTarget', target: game.targeting.opponents[0] });
    }
    expect(game.phase).toBe('defensiveRoll');
    expect([1, 3]).toContain(game.attack!.defender);
  });

  it('refuses a target the die did not allow', () => {
    let game = reachTargeting();
    game = act(game, { type: 'rollTarget' });
    if (!game.targeting?.chooser) return; // the die fixed a target; nothing to refuse
    expect(() => act(game, { type: 'chooseTarget', target: 2 })).toThrow(/not a legal target/);
  });
});

describe('damage against a shared dial', () => {
  it('reduces the team dial, not one player', () => {
    let game = seat('2v2', 4, 3);
    game.phase = 'defensiveRoll';
    game.attack = {
      attacker: 0,
      defender: 1,
      abilityId: 'x',
      abilityName: 'X',
      incoming: 12,
      type: 'undefendable',
      modifiers: [],
      afterDamage: [],
      defenseResolved: true,
    };
    game = act(game, { type: 'resolveAttack' });
    expect(healthOf(game, 1)).toBe(RULES.startingHealth - 12);
    expect(healthOf(game, 3)).toBe(RULES.startingHealth - 12);
    expect(healthOf(game, 0)).toBe(RULES.startingHealth);
  });

  it('ends the game when one team is left standing', () => {
    let game = seat('2v2', 4, 3);
    game.teams[1].health = 3;
    game.phase = 'defensiveRoll';
    game.attack = {
      attacker: 0,
      defender: 1,
      abilityId: 'x',
      abilityName: 'X',
      incoming: 9,
      type: 'undefendable',
      modifiers: [],
      afterDamage: [],
      defenseResolved: true,
    };
    game = act(game, { type: 'resolveAttack' });
    expect(game.phase).toBe('gameOver');
    expect(game.winner).toBe(game.teams[0].id);
  });
});

/* ------------------------------------------------------------------ */
/* Full games at every table size                                       */
/* ------------------------------------------------------------------ */

function botAction(state: GameState): Action | null {
  const options = legalActions(state, lookup);
  if (options.length === 0) return null;

  // A pending roll or choice blocks everything else: settle it first.
  const step = state.pending[state.pending.length - 1];
  if (step) {
    return (
      options.find((a) => a.type === 'rollPending') ??
      options.find((a) => a.type === 'confirmPending') ??
      options.find((a) => a.type === 'answerChoice') ??
      options[0]
    );
  }

  // A declared attack holds the table until every opponent has had their say.
  if (state.response) {
    return options.find((a) => a.type === 'passResponse') ?? options[0];
  }

  if (state.phase === 'targetingRoll') {
    return (
      options.find((a) => a.type === 'rollTarget') ??
      options.find((a) => a.type === 'chooseTarget') ??
      options[0]
    );
  }
  if (state.phase === 'defensiveRoll') {
    if (!state.attack!.defenseResolved) {
      return (
        options.find((a) => a.type === 'chooseDefense' && a.abilityId !== null) ??
        options.find((a) => a.type === 'chooseDefense')!
      );
    }
    return { type: 'resolveAttack' };
  }
  if (state.phase === 'offensiveRoll') {
    const attack = options.find((a) => a.type === 'activateAbility');
    if (state.roll!.attemptsUsed < state.roll!.maxAttempts && !attack) return { type: 'rollDice' };
    return attack ?? { type: 'skipAttack' };
  }
  return options.find((a) => a.type === 'nextPhase') ?? options[0];
}

describe('full games', () => {
  const tables: [GameMode, number][] = [
    ['1v1', 2],
    ['2v2', 4],
    ['3v3', 6],
    ['2v2v2', 6],
    ['koth', 3],
    ['koth', 5],
  ];

  it.each(tables)('%s with %i players plays to a winner', (mode, count) => {
    let game = seat(mode, count, 4242);
    let steps = 0;
    while (game.phase !== 'gameOver' && steps < 40000) {
      const action = botAction(game);
      if (!action) break;
      game = act(game, action);
      steps++;
    }
    expect(game.phase, MODES[mode].label).toBe('gameOver');
    expect(game.teams.filter((t) => t.health > 0).length).toBeLessThanOrEqual(1);
  });
});
