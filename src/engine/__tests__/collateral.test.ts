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

/*
 * Recoil — Reckless and its like — is the other damage that leaves the attack
 * pipeline. It used to come straight off the Health Dial, which skipped
 * everything that losing health means: the dial went below zero, no team was
 * ever announced out, and a player could kill themselves without the game
 * noticing that somebody had won.
 */
const recoil: Effect[] = [{ t: 'damage', amount: 4, target: 'self' }];

describe('recoil', () => {
  it('never takes a Health Dial below zero', () => {
    const state = game();
    state.teams[0].health = 1;
    resolveEffects(recoil, ctxFor(state), emptyOutcome());
    expect(state.teams[0].health).toBe(0);
  });

  it('puts its own team out and ends the game, like any other damage', () => {
    const state = game();
    state.teams[0].health = 3;
    resolveEffects(recoil, ctxFor(state), emptyOutcome());

    expect(state.teams[0].health).toBe(0);
    expect(state.log.some((l) => /is out$/.test(l.message))).toBe(true);
    expect(state.phase).toBe('gameOver');
    expect(state.winner).toBe(state.teams[1].id);
  });

  it('can be refused by a Blessing of Divinity, being typeless', () => {
    const state = game();
    state.teams[0].health = 2;
    state.players[0].statuses['blessing-of-divinity'] = 1;
    resolveEffects(recoil, ctxFor(state), emptyOutcome());

    expect(state.teams[0].health).toBeGreaterThan(0);
    expect(state.phase).not.toBe('gameOver');
  });

  it('reports itself so the table can show it', () => {
    const state = game();
    resolveEffects(recoil, ctxFor(state), emptyOutcome());
    const hits = state.events.filter((e) => e.kind === 'damage');
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ player: 0, amount: 4 });
  });
});
