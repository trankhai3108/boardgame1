import { describe, expect, it } from 'vitest';
import { halveUp, resolveDamage, type DamageModifier } from '../damage';

describe('halveUp', () => {
  it('always rounds up, as all division in Dice Throne does', () => {
    expect(halveUp(7)).toBe(4);
    expect(halveUp(8)).toBe(4);
    expect(halveUp(1)).toBe(1);
    expect(halveUp(0)).toBe(0);
  });
});

describe('resolveDamage', () => {
  it('applies adds and subtracts before multipliers', () => {
    const result = resolveDamage(10, 'normal', [
      { source: 'Get Some', kind: 'add', amount: 4 },
      { source: 'Divine Defense', kind: 'prevent', amount: 3 },
    ]);
    expect(result.subtotal).toBe(11);
    expect(result.final).toBe(11);
  });

  /**
   * The rulebook's Barbarian vs Paladin example: two Protect tokens spent on
   * the same odd subtotal each prevent ceil(S/2) computed from the *same*
   * subtotal, so together they prevent S + 1 — all of it.
   */
  it('computes each fractional modifier from the untouched subtotal', () => {
    const modifiers: DamageModifier[] = [
      { source: 'Protect', kind: 'preventFraction', divisor: 2 },
      { source: 'Protect', kind: 'preventFraction', divisor: 2 },
    ];
    const result = resolveDamage(11, 'normal', modifiers);
    expect(result.subtotal).toBe(11);
    // ceil(11/2) = 6, twice = 12, so all 11 is prevented (never negative).
    expect(result.final).toBe(0);
  });

  it('does not let a second Protect chain off the first one', () => {
    // Sequential halving would give 11 -> 6 -> 3; the rules give 0.
    const sequential = resolveDamage(11, 'normal', [
      { source: 'Protect', kind: 'preventFraction', divisor: 2 },
    ]);
    expect(sequential.final).toBe(5);
  });

  it('reflects damage without reducing what the defender takes', () => {
    const result = resolveDamage(9, 'normal', [
      { source: 'Retribution', kind: 'reflectFraction', divisor: 2 },
    ]);
    expect(result.final).toBe(9);
    expect(result.reflected).toBe(5); // ceil(9/2)
  });

  it('combines Retribution and Protect independently', () => {
    const result = resolveDamage(9, 'normal', [
      { source: 'Retribution', kind: 'reflectFraction', divisor: 2 },
      { source: 'Protect', kind: 'preventFraction', divisor: 2 },
    ]);
    // Both read the same subtotal of 9.
    expect(result.final).toBe(4);
    expect(result.reflected).toBe(5);
  });

  it('ignores prevention against Ultimate damage but allows increases', () => {
    const result = resolveDamage(10, 'ultimate', [
      { source: 'Protect', kind: 'preventFraction', divisor: 2 },
      { source: 'Divine Defense', kind: 'prevent', amount: 4 },
      { source: 'Crit', kind: 'add', amount: 4 },
    ]);
    expect(result.final).toBe(14);
  });

  it('does not let Attack Modifiers raise pure damage', () => {
    const result = resolveDamage(6, 'pure', [{ source: 'Crit', kind: 'add', amount: 4 }]);
    expect(result.final).toBe(6);
  });

  it('still lets pure damage be prevented', () => {
    const result = resolveDamage(6, 'pure', [
      { source: 'Protect', kind: 'preventFraction', divisor: 2 },
    ]);
    expect(result.final).toBe(3);
  });

  it('avoids everything when a token says so', () => {
    const result = resolveDamage(20, 'normal', [
      { source: 'Evasive', kind: 'avoid' },
      { source: 'Crit', kind: 'add', amount: 4 },
    ]);
    expect(result.final).toBe(0);
    expect(result.reflected).toBe(0);
  });

  it('cannot be reduced below zero', () => {
    const result = resolveDamage(3, 'normal', [
      { source: 'Absolution', kind: 'prevent', amount: 99 },
    ]);
    expect(result.subtotal).toBe(0);
    expect(result.final).toBe(0);
  });
});
