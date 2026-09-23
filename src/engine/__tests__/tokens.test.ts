import { describe, expect, it } from 'vitest';
import { HEROES } from '../../data/heroes';
import { legalActions, reduce, type HeroLookup } from '../reducer';
import { STATUS_BEHAVIOUR } from '../statusBehaviour';
import { createGame, statusCount, topPending, type GameState } from '../state';

const lookup: HeroLookup = (id) => HEROES[id];
const act = (s: GameState, a: Parameters<typeof reduce>[1]) => reduce(s, a, lookup);

function game(first: string, second = 'barbarian', seed = 5): GameState {
  return createGame(
    [
      { id: 'p1', name: 'One', hero: HEROES[first] },
      { id: 'p2', name: 'Two', hero: HEROES[second] },
    ],
    { seed },
  );
}

const spend = (state: GameState, seat: number, statusId: string) =>
  act(state, { type: 'spendStatus', playerId: state.players[seat].id, statusId });

const canSpend = (state: GameState, seat: number, statusId: string) =>
  legalActions(state, lookup).some(
    (o) => o.type === 'spendStatus' && o.playerId === state.players[seat].id && o.statusId === statusId,
  );

describe('tokens that are spent outside an attack', () => {
  /*
   * Most tokens are spent while damage is pending, but several are not: they
   * are spent in a Main Phase or over your own dice, with no attack anywhere.
   * The engine used to refuse every one of them.
   */
  it('lets the Monk spend Cleanse to shed a token', () => {
    let state = game('monk');
    state.players[0].statuses.cleanse = 1;
    state.players[0].statuses.knockdown = 1;

    expect(canSpend(state, 0, 'cleanse')).toBe(true);
    state = spend(state, 0, 'cleanse');

    // It asks which token to shed.
    const step = topPending(state);
    expect(step).not.toBeNull();
    const answer = legalActions(state, lookup).find(
      (o) => o.type === 'answerChoice' && o.answer.status?.statusId === 'knockdown',
    );
    expect(answer).toBeDefined();
    state = act(state, answer!);

    expect(statusCount(state.players[0], 'knockdown')).toBe(0);
    expect(statusCount(state.players[0], 'cleanse')).toBe(0);
  });

  it('lets the Treant spend a Sapling for health and CP', () => {
    let state = game('treant');
    state.players[0].statuses.sapling = 1;
    state.teams[0].health -= 5;
    const health = state.teams[0].health;
    const cp = state.players[0].cp;

    expect(canSpend(state, 0, 'sapling')).toBe(true);
    state = spend(state, 0, 'sapling');

    expect(state.teams[0].health).toBe(health + 1);
    expect(state.players[0].cp).toBe(cp + 1);
    expect(statusCount(state.players[0], 'sapling')).toBe(0);
  });

  it('lets the Treant spend Wellspring to roll and heal', () => {
    let state = game('treant');
    state.players[0].statuses.wellspring = 1;
    state.teams[0].health -= 6;
    const health = state.teams[0].health;

    expect(canSpend(state, 0, 'wellspring')).toBe(true);
    state = spend(state, 0, 'wellspring');

    // It parks a die for its owner to throw.
    expect(topPending(state)?.request.kind).toBe('roll');
    state = act(state, { type: 'rollPending' });
    state = act(state, { type: 'confirmPending' });

    expect(state.teams[0].health).toBeGreaterThan(health);
    expect(statusCount(state.players[0], 'wellspring')).toBe(0);
  });

  it('lets the Treant spend a Seedling to re-roll a die', () => {
    let state = game('treant');
    state = act(state, { type: 'nextPhase' }); // -> offensiveRoll, dice on the table
    state.players[0].statuses.seedling = 1;

    expect(state.roll).not.toBeNull();
    expect(canSpend(state, 0, 'seedling')).toBe(true);
    state = spend(state, 0, 'seedling');

    const pick = legalActions(state, lookup).find(
      (o) => o.type === 'answerChoice' && o.answer.dieId,
    );
    expect(pick, 'it asks which die to re-roll').toBeDefined();
    state = act(state, pick!);
    expect(statusCount(state.players[0], 'seedling')).toBe(0);
  });
});

describe('Chi', () => {
  // Printed on the token: Chi may not be spent to increase damage on the turn
  // it was gained.
  it('cannot boost damage on the turn it was gained', () => {
    const state = game('monk');
    state.players[0].statuses.chi = 3;
    state.players[0].gainedThisTurn = ['chi'];
    state.attack = {
      attacker: 0,
      defender: 1,
      abilityId: 'fist-strike',
      abilityName: 'Fist Strike',
      incoming: 4,
      type: 'normal',
      modifiers: [],
      afterDamage: [],
      defenseResolved: true,
    };
    state.phase = 'defensiveRoll';

    expect(canSpend(state, 0, 'chi')).toBe(false);
    expect(() => spend(state, 0, 'chi')).toThrow();
  });

  it('can boost damage on a later turn', () => {
    const state = game('monk');
    state.players[0].statuses.chi = 3;
    state.players[0].gainedThisTurn = [];
    state.attack = {
      attacker: 0,
      defender: 1,
      abilityId: 'fist-strike',
      abilityName: 'Fist Strike',
      incoming: 4,
      type: 'normal',
      modifiers: [],
      afterDamage: [],
      defenseResolved: true,
    };
    state.phase = 'defensiveRoll';

    expect(canSpend(state, 0, 'chi')).toBe(true);
  });
});

describe('Stun', () => {
  /*
   * "While stunned the holder may take no actions of any kind."
   *
   * The token exists so the player who inflicted it can take an extra
   * Offensive Roll Phase against a defenceless opponent, so the lockout is on
   * answering somebody else's turn — not on the stunned player's own, which
   * would deadlock the game.
   */
  function stunnedUnderAttack(): GameState {
    const state = game('barbarian', 'monk');
    state.players[1].statuses.stun = 1;
    state.players[1].statuses.chi = 3;
    state.attack = {
      attacker: 0,
      defender: 1,
      abilityId: 'smack',
      abilityName: 'Smack',
      incoming: 6,
      type: 'normal',
      modifiers: [],
      afterDamage: [],
      defenseResolved: false,
    };
    state.phase = 'defensiveRoll';
    return state;
  }

  it('stops the holder defending', () => {
    const state = stunnedUnderAttack();
    const defences = legalActions(state, lookup).filter(
      (o) => o.type === 'chooseDefense' && o.abilityId !== null,
    );
    expect(defences).toHaveLength(0);
  });

  it('stops the holder spending anything', () => {
    const state = stunnedUnderAttack();
    state.attack!.defenseResolved = true;
    expect(canSpend(state, 1, 'chi')).toBe(false);
  });

  it('leaves the holder their own turn', () => {
    const state = game('barbarian', 'monk');
    state.players[0].statuses.stun = 1;
    expect(legalActions(state, lookup).length).toBeGreaterThan(0);
  });
});

describe('the behaviour table', () => {
  it('leaves no token that can be held but never used', () => {
    const unusable: string[] = [];
    for (const [id, b] of Object.entries(STATUS_BEHAVIOUR)) {
      const doesSomething =
        b.spendToPrevent || b.spendToBoost || b.spendToAvoid || b.autoAvoid ||
        b.spendFreely || b.upkeep || b.endOfTurn || b.rollAttemptPenalty !== undefined ||
        b.skipOrpUnlessPaid !== undefined || b.skipIncome || b.damagePerExtraRollAttempt ||
        b.incomingBonus !== undefined || b.failOrpOn || b.preventDefeatSetHealth !== undefined ||
        b.grantsExtraOrpToInflicter;
      if (!doesSomething) unusable.push(id);
    }
    expect(unusable, `tokens the engine cannot act on: ${unusable.join(', ')}`).toHaveLength(0);
  });
});
