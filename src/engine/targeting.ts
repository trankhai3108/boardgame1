import type { GameMode } from './state';

/**
 * The Targeting Roll Phase.
 *
 * With more than one possible defender the attacker rolls a die and the result
 * decides who takes the hit. `opponents` is in clockwise seat order starting
 * from the seat after the attacker, which the rulebook reads as left -> right.
 */
export type TargetOutcome =
  /** The die picked a defender outright. */
  | { kind: 'fixed'; target: number }
  /** The attacker chooses freely. */
  | { kind: 'attackerChooses' }
  /** The defending side chooses which of them takes it. */
  | { kind: 'defendersChoose' };

/**
 * 2v2 (two opponents): 1-2 left, 3-4 right, 5 the opponents choose, 6 the
 * attacker chooses. 3v3 (three opponents): 1-2 left, 3-4 middle, 5-6 right.
 * King of the Hill lets the attacker pick anyone.
 */
export function resolveTargetRoll(
  mode: GameMode,
  opponents: readonly number[],
  roll: number,
): TargetOutcome {
  if (opponents.length <= 1) {
    return { kind: 'fixed', target: opponents[0] };
  }
  if (mode === 'koth') return { kind: 'attackerChooses' };

  if (opponents.length === 2) {
    if (roll <= 2) return { kind: 'fixed', target: opponents[0] };
    if (roll <= 4) return { kind: 'fixed', target: opponents[1] };
    if (roll === 5) return { kind: 'defendersChoose' };
    return { kind: 'attackerChooses' };
  }

  if (opponents.length === 3) {
    if (roll <= 2) return { kind: 'fixed', target: opponents[0] };
    if (roll <= 4) return { kind: 'fixed', target: opponents[1] };
    return { kind: 'fixed', target: opponents[2] };
  }

  // More opponents than the printed tables cover (2v2v2 with both rivals
  // alive): spread the die evenly over them rather than inventing a rule.
  const slot = Math.min(opponents.length - 1, Math.floor(((roll - 1) / 6) * opponents.length));
  return { kind: 'fixed', target: opponents[slot] };
}

/** True when the attacker never has to roll: only one possible defender. */
export function needsTargetingRoll(mode: GameMode, opponents: readonly number[]): boolean {
  return opponents.length > 1 && mode !== '1v1';
}
