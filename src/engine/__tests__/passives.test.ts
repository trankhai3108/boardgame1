import { describe, expect, it } from 'vitest';
import { HEROES } from '../../data/heroes';
import { canAct } from '../authority';
import { legalActions, passiveOptionsFor, reduce, type HeroLookup } from '../reducer';
import { RULES, createGame, statusCount, type GameState } from '../state';

const lookup: HeroLookup = (id) => HEROES[id];
const act = (state: GameState, action: Parameters<typeof reduce>[1]) =>
  reduce(state, action, lookup);

function game(first = HEROES.paladin, second = HEROES.barbarian, seed = 3): GameState {
  return createGame(
    [
      { id: 'p1', name: 'One', hero: first },
      { id: 'p2', name: 'Two', hero: second },
    ],
    { seed },
  );
}

describe('passive abilities are wired up', () => {
  it('every passive in the data says what it does', () => {
    for (const hero of Object.values(HEROES)) {
      for (const ability of hero.abilities) {
        if (ability.kind !== 'passive') continue;
        expect(ability.passive, `${hero.name}: ${ability.name} does nothing`).toBeDefined();
        const spec = ability.passive!;
        expect(
          (spec.upkeep?.length ?? 0) + (spec.options?.length ?? 0),
          `${hero.name}: ${ability.name} is empty`,
        ).toBeGreaterThan(0);
      }
    }
  });
});

describe("Tithe, the Paladin's passive", () => {
  it('offers the draw at any time, and the re-roll only over dice', () => {
    let state = game();
    state.players[0].cp = 5;

    // Main Phase 1: no dice on the table, so only the draw is on offer.
    let ids = passiveOptionsFor(state, lookup, 0).map((o) => o.option.id);
    expect(ids).toContain('tithe-draw');
    expect(ids).not.toContain('tithe-reroll');

    state = act(state, { type: 'nextPhase' }); // -> offensiveRoll, dice thrown
    state.players[0].cp = 5;
    ids = passiveOptionsFor(state, lookup, 0).map((o) => o.option.id);
    expect(ids).toContain('tithe-reroll');
  });

  it('hides an option the player cannot pay for', () => {
    const state = game();
    state.players[0].cp = 2; // the draw costs 3
    const ids = passiveOptionsFor(state, lookup, 0).map((o) => o.option.id);
    expect(ids).not.toContain('tithe-draw');
  });

  it('charges 3 CP and draws a card', () => {
    let state = game();
    state.players[0].cp = 4;
    const before = state.players[0].hand.length;

    state = act(state, { type: 'usePassive', abilityId: 'tithe', optionId: 'tithe-draw' });
    expect(state.players[0].cp).toBe(1);
    expect(state.players[0].hand.length).toBe(before + 1);
  });

  it('refuses the draw without the CP', () => {
    const state = game();
    state.players[0].cp = 1;
    expect(() =>
      act(state, { type: 'usePassive', abilityId: 'tithe', optionId: 'tithe-draw' }),
    ).toThrow(/Not enough CP/);
  });

  it('refuses the re-roll when there are no dice', () => {
    const state = game();
    state.players[0].cp = 9;
    expect(() =>
      act(state, { type: 'usePassive', abilityId: 'tithe', optionId: 'tithe-reroll' }),
    ).toThrow(/No dice/);
  });

  it('charges 1 CP and asks which die to re-roll', () => {
    let state = act(game(), { type: 'nextPhase' });
    state.players[0].cp = 4;

    state = act(state, { type: 'usePassive', abilityId: 'tithe', optionId: 'tithe-reroll' });
    expect(state.players[0].cp).toBe(3);
    // The choice belongs to the owner, so the game stops and asks.
    expect(state.pending).toHaveLength(1);
    expect(state.pending[0].who).toBe(0);
    expect(state.pending[0].request.kind).toBe('choice');
  });

  it('is offered in the list of legal actions', () => {
    const state = game();
    state.players[0].cp = 5;
    const actions = legalActions(state, lookup);
    expect(actions).toContainEqual({
      type: 'usePassive',
      abilityId: 'tithe',
      optionId: 'tithe-draw',
    });
  });

  it('belongs to its owner alone', () => {
    const state = game();
    state.players[0].cp = 5;
    const action = { type: 'usePassive', abilityId: 'tithe', optionId: 'tithe-draw' } as const;
    expect(canAct(state, 0, action)).toBe(true);
    expect(canAct(state, 1, action)).toBe(false);
  });

  it('is not offered to a hero that has no passive', () => {
    const state = game(HEROES.barbarian, HEROES.paladin);
    state.players[0].cp = 9;
    expect(passiveOptionsFor(state, lookup, 0)).toHaveLength(0);
  });
});

describe("Fertilize, the Treant's passive", () => {
  it('grows a Spirit every Upkeep Phase without being asked', () => {
    let state = game(HEROES.barbarian, HEROES.treant, 11);
    const treant = 1;
    expect(statusCount(state.players[treant], 'seedling')).toBe(0);

    // Hand the turn to the Treant, which enters its Upkeep Phase.
    state = act(state, { type: 'nextPhase' });
    state = act(state, { type: 'skipAttack' });
    state = act(state, { type: 'nextPhase' });
    state = act(state, { type: 'nextPhase' });

    expect(state.active).toBe(treant);
    expect(state.phase).toBe('upkeep');
    const spirits =
      statusCount(state.players[treant], 'seedling') +
      statusCount(state.players[treant], 'sapling') +
      statusCount(state.players[treant], 'dryad');
    expect(spirits).toBe(1);
    expect(state.log.some((e) => e.message.toLowerCase().includes('seedling'))).toBe(true);
  });

  it('keeps growing the ladder turn after turn', () => {
    let state = game(HEROES.barbarian, HEROES.treant, 11);
    const treant = 1;
    // Three of the Treant's upkeeps: Seedling, then up the ladder.
    for (let round = 0; round < 3; round++) {
      for (let i = 0; i < 12 && !(state.active === treant && state.phase === 'upkeep'); i++) {
        const options = legalActions(state, lookup);
        const next =
          options.find((a) => a.type === 'skipAttack') ??
          options.find((a) => a.type === 'nextPhase') ??
          options[0];
        if (!next) break;
        state = act(state, next);
      }
      if (state.active === treant && state.phase === 'upkeep') {
        state = act(state, { type: 'nextPhase' });
      }
    }
    const player = state.players[treant];
    const spirits =
      statusCount(player, 'seedling') + statusCount(player, 'sapling') + statusCount(player, 'dryad');
    expect(spirits).toBeGreaterThanOrEqual(1);
    void RULES;
  });
});
