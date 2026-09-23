import { describe, expect, it } from 'vitest';
import { HEROES } from '../../data/heroes';
import { emptyOutcome, resolveEffects, type EffectContext } from '../effects';
import { createGame, type GameState } from '../state';
import type { Effect } from '../types';

const game = (seed = 9): GameState =>
  createGame(
    [
      { id: 'p1', name: 'One', hero: HEROES.pyromancer },
      { id: 'p2', name: 'Two', hero: HEROES.barbarian },
    ],
    { seed },
  );

const ctxFor = (state: GameState): EffectContext => ({
  state,
  self: 0,
  target: 1,
  hero: HEROES[state.players[0].heroId],
  usedDice: [],
});

const collateral: Effect[] = [{ t: 'damage', amount: 3, target: 'allOpponents' }];

describe('collateral damage', () => {
  it('hits every member of every opposing team', () => {
    const state = game();
    const before = state.teams[1].health;
    resolveEffects(collateral, ctxFor(state), emptyOutcome());
    expect(state.teams[1].health).toBe(before - 3);
    // It is dealt outside the attack, so it never reaches the attacker.
    expect(state.teams[0].health).toBe(state.teams[0].maxHealth);
  });

  it('ends the game when it takes the last of a team, like any other damage', () => {
    const state = game();
    state.teams[1].health = 2;
    resolveEffects(collateral, ctxFor(state), emptyOutcome());

    expect(state.teams[1].health).toBe(0);
    expect(state.phase).toBe('gameOver');
    expect(state.winner).toBe(state.teams[0].id);
  });

  it('lets Blessing of Divinity save a player from it', () => {
    const state = game();
    state.teams[1].health = 1;
    state.players[1].statuses['blessing-of-divinity'] = 1;

    resolveEffects(collateral, ctxFor(state), emptyOutcome());

    expect(state.teams[1].health).toBeGreaterThan(0);
    expect(state.phase).not.toBe('gameOver');
  });

  it('reports itself so the table can show it', () => {
    const state = game();
    resolveEffects(collateral, ctxFor(state), emptyOutcome());
    expect(state.events.filter((e) => e.kind === 'damage')).not.toHaveLength(0);
  });
});
