import { describe, expect, it } from 'vitest';
import { HEROES } from '../../data/heroes';
import { DAMAGE_TYPES } from '../damage';
import { legalActions, reduce, type HeroLookup } from '../reducer';
import { createGame, statusCount, type GameState } from '../state';

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

const options = (s: GameState) => legalActions(s, lookup);

/** Advances until it is `seat`'s Upkeep Phase, taking the plainest move each step. */
function toUpkeepOf(state: GameState, seat: number): GameState {
  let current = state;
  for (let i = 0; i < 60; i++) {
    if (current.phase === 'upkeep' && current.active === seat) return current;
    const opts = options(current);
    const move =
      opts.find((o) => o.type === 'skipAttack') ??
      opts.find((o) => o.type === 'nextPhase') ??
      opts.find((o) => o.type === 'resolveAttack') ??
      opts.find((o) => o.type === 'chooseDefense') ??
      opts[0];
    if (!move) break;
    current = act(current, move);
  }
  throw new Error(`never reached seat ${seat}'s Upkeep (stopped in ${current.phase})`);
}

describe('typeless damage', () => {
  /*
   * rulepop: "Damage that occurs outside of an Attack (i.e. via a status
   * effect or a Defensive Ability) does not have a damage type. That damage
   * can be avoided, but is not modifiable or defendable."
   */
  it('is avoidable, but neither defendable nor modifiable', () => {
    expect(DAMAGE_TYPES.typeless).toEqual({
      defendable: false,
      avoidable: true,
      modifiable: false,
    });
  });

  it('opens a window the holder can answer before Burn lands', () => {
    let state = game('pyromancer');
    state.players[0].statuses.burn = 2;
    state.players[0].statuses.chi = 0;
    const health = state.teams[0].health;

    state = toUpkeepOf(state, 0);

    // The damage is waiting, not applied.
    expect(state.attack?.window).toBe(true);
    expect(state.attack?.type).toBe('typeless');
    expect(state.teams[0].health).toBe(health);

    // Nothing else may be done until it is settled.
    expect(options(state).every((o) => ['spendStatus', 'resolveAttack', 'playCard'].includes(o.type))).toBe(true);

    state = act(state, { type: 'resolveAttack' });
    expect(state.teams[0].health).toBeLessThan(health);
    expect(state.attack).toBeNull();
    // And the turn carries on from where it was.
    expect(state.phase).toBe('upkeep');
  });

  it('can be prevented with a token', () => {
    let state = game('monk');
    state.players[0].statuses.poison = 3;
    state.players[0].statuses.chi = 2;
    const health = state.teams[0].health;

    state = toUpkeepOf(state, 0);

    expect(state.attack?.window).toBe(true);
    const chi = options(state).find(
      (o) => o.type === 'spendStatus' && o.statusId === 'chi',
    );
    expect(chi, 'Chi prevents 1, and typeless damage is avoidable').toBeDefined();

    state = act(state, chi!);
    state = act(state, { type: 'resolveAttack' });

    // 3 Poison is 3 dmg; one Chi takes it to 2.
    expect(health - state.teams[0].health).toBe(2);
    expect(statusCount(state.players[0], 'chi')).toBe(1);
  });

  it('offers no defensive ability against it', () => {
    let state = game('monk');
    state.players[0].statuses.poison = 1;

    state = toUpkeepOf(state, 0);

    expect(options(state).some((o) => o.type === 'chooseDefense')).toBe(false);
  });

  it('lets the attacker answer damage Retribution sends back', () => {
    // Retribution reflects half the subtotal at the attacker. That comes from
    // outside an Attack, so it is typeless and the attacker may answer it.
    let state = game('paladin', 'barbarian');
    state.players[1].statuses.retribution = 1;
    state.attack = {
      attacker: 0,
      defender: 1,
      abilityId: 'smack',
      abilityName: 'Smack',
      incoming: 8,
      type: 'normal',
      modifiers: [],
      afterDamage: [],
      defenseResolved: true,
    };
    state.phase = 'defensiveRoll';

    state = act(state, { type: 'spendStatus', playerId: state.players[1].id, statusId: 'retribution' });
    const attackerHealth = state.teams[0].health;
    state = act(state, { type: 'resolveAttack' });

    // The reflected damage waits on the attacker rather than just landing.
    expect(state.attack?.window).toBe(true);
    expect(state.attack?.defender).toBe(0);
    expect(state.teams[0].health).toBe(attackerHealth);

    // And the Roll Phase that the attack belonged to has already ended, so
    // settling the window does not strand the turn.
    expect(state.phase).not.toBe('defensiveRoll');

    state = act(state, { type: 'resolveAttack' });
    expect(state.teams[0].health).toBe(attackerHealth - 4);
    expect(state.attack).toBeNull();
    expect(state.phase).toBe('main2');
  });

  it('sends a Defensive Ability\'s damage back the same way Retribution does', () => {
    // Serenity deals 1 dmg per FIST rolled. That damage is dealt outside the
    // attack being resolved, so the rules make it typeless — it used to land
    // on the dial the moment the defence resolved, typed as the attack, with
    // the attacker given no say in it at all.
    let state = game('paladin', 'monk');
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

    state = act(state, { type: 'chooseDefense', abilityId: 'serenity' });
    state = act(state, { type: 'rollPending' });
    // Four FISTs, so the Monk sends 4 back.
    const step = state.pending[state.pending.length - 1];
    step.dice = step.dice.map((d) => ({ ...d, value: 1 }));
    state = act(state, { type: 'confirmPending' });

    const attackerHealth = state.teams[0].health;
    expect(state.attack?.damageBack?.amount).toBe(4);
    // Not a point of it while the attack it answers is still on the table.
    expect(state.teams[0].health).toBe(attackerHealth);

    state = act(state, { type: 'resolveAttack' });

    // It waits on the attacker, typeless, exactly as Retribution's does.
    expect(state.attack?.window).toBe(true);
    expect(state.attack?.defender).toBe(0);
    expect(state.attack?.type).toBe('typeless');
    expect(state.teams[0].health).toBe(attackerHealth);

    state = act(state, { type: 'resolveAttack' });
    expect(state.teams[0].health).toBe(attackerHealth - 4);
  });

  it('lets the attacker answer what a Defensive Ability sent back', () => {
    // The point of the window: the attacker gets the same chance to answer
    // this damage that any other player gets to answer damage aimed at them.
    let state = game('paladin', 'monk');
    state.players[0].hand.unshift('common-card-next-time#0');
    state.players[0].cp = 9;
    state.attack = {
      attacker: 0,
      defender: 1,
      abilityId: 'smack',
      abilityName: 'Smack',
      incoming: 0,
      type: 'normal',
      modifiers: [],
      afterDamage: [],
      defenseResolved: false,
    };
    state.phase = 'defensiveRoll';

    state = act(state, { type: 'chooseDefense', abilityId: 'serenity' });
    state = act(state, { type: 'rollPending' });
    const step = state.pending[state.pending.length - 1];
    step.dice = step.dice.map((d) => ({ ...d, value: 1 }));
    state = act(state, { type: 'confirmPending' });
    state = act(state, { type: 'resolveAttack' });

    const attackerHealth = state.teams[0].health;
    const answer = options(state).find(
      (o) => o.type === 'playCard' && o.cardId === 'common-card-next-time#0',
    );
    expect(answer, 'the attacker may answer the damage aimed at them').toBeDefined();

    state = act(state, answer!);
    state = act(state, { type: 'resolveAttack' });

    // Next Time! prevents 6, which is more than the 4 coming back.
    expect(state.teams[0].health).toBe(attackerHealth);
  });
});
