import { describe, expect, it } from 'vitest';
import { HEROES } from '../../data/heroes';
import { runBots } from '../bot';
import { reduce, type HeroLookup } from '../reducer';
import { createGame, type GameState } from '../state';
import { activateThrough } from './support';

const lookup: HeroLookup = (id) => HEROES[id];
const step = (state: GameState, action: Parameters<typeof reduce>[1]) =>
  reduce(state, action, lookup);

function game(seed = 11, bots = false): GameState {
  return createGame(
    [
      { id: 'p1', name: 'One', hero: HEROES.barbarian, isBot: bots },
      { id: 'p2', name: 'Two', hero: HEROES.ninja, isBot: bots },
    ],
    { seed },
  );
}

describe('the table event channel', () => {
  it('starts empty and describes only the action just applied', () => {
    const start = game();
    expect(start.events).toEqual([]);

    const next = step(start, { type: 'nextPhase' });
    expect(next.events).toEqual([]);
  });

  it('names the card that was played', () => {
    let state = game();
    state.players[0].hand.unshift('common-card-what-status#0');
    state.players[0].cp = 9;
    state = step(state, { type: 'playCard', cardId: 'common-card-what-status#0' });

    expect(state.events).toContainEqual({
      kind: 'card',
      player: 0,
      cardId: 'common-card-what-status',
    });
  });



  it('reports damage against the seat that took it', () => {
    const state = game();
    const team = state.teams[1];
    const before = team.health;

    // Drive an attack through by hand: the ability does not matter, only that
    // the damage lands.
    let next = step(state, { type: 'nextPhase' });
    next.roll!.dice = [
      { id: 'd0', value: 1, kept: true },
      { id: 'd1', value: 1, kept: true },
      { id: 'd2', value: 1, kept: true },
      { id: 'd3', value: 2, kept: true },
      { id: 'd4', value: 2, kept: true },
    ];
    next = activateThrough(next, 'smack', 0);
    while (next.attack && !next.attack.defenseResolved) {
      next = step(next, { type: 'chooseDefense', abilityId: null });
    }
    next = step(next, { type: 'resolveAttack' });

    const damage = next.events.filter((e) => e.kind === 'damage');
    expect(damage.length).toBeGreaterThan(0);
    expect(damage[0]).toMatchObject({ kind: 'damage', player: 1 });
    expect(next.teams[1].health).toBeLessThan(before);
  });

  it('keeps every event of a whole bot turn, not just the last action', () => {
    /*
     * A bot turn reaches the table as one state, and every reduce clears the
     * event list before it runs. The carry in runBots is the only thing that
     * stops the table seeing nothing but the bot's last action, so this drives
     * runBots with a scripted stand-in for reduce and checks the whole run
     * arrives.
     */
    const start = { ...game(3, true), events: [{ kind: 'card', player: 0, cardId: 'opener' }] };

    let n = 0;
    const scripted = (state: GameState): GameState => {
      n += 1;
      return {
        ...state,
        // Stop after three, so the loop ends rather than hitting the cap.
        players: n >= 3 ? state.players.map((p) => ({ ...p, isBot: false })) : state.players,
        events: [{ kind: 'damage', player: 1, amount: n, type: 'normal' }],
      };
    };

    const out = runBots(start as GameState, lookup, scripted);

    expect(n).toBe(3);
    // The opener the human's own action produced, plus one per bot step.
    expect(out.events).toEqual([
      { kind: 'card', player: 0, cardId: 'opener' },
      { kind: 'damage', player: 1, amount: 1, type: 'normal' },
      { kind: 'damage', player: 1, amount: 2, type: 'normal' },
      { kind: 'damage', player: 1, amount: 3, type: 'normal' },
    ]);
  });

  it('leaves a state runBots never touched exactly as it was', () => {
    const start = game(3, false); // no bot seats, so nothing runs
    expect(runBots(start, lookup, step)).toBe(start);
  });
});
