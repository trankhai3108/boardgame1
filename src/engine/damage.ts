/**
 * The Final DMG Total pipeline.
 *
 * The rulebook is specific about the order, and getting it wrong changes
 * outcomes, so it is implemented literally:
 *
 *   1. Determine incoming damage.
 *   2. Apply everything that adds or subtracts a specific amount -> subtotal.
 *   3. Apply everything that multiplies or divides. Every such modifier is
 *      computed independently from the *same* subtotal, regardless of the
 *      order it was declared in, and all division rounds up.
 *
 * Because step 3 works off the untouched subtotal, two Protect tokens on an
 * odd subtotal S prevent 2 * ceil(S/2) = S + 1 damage, i.e. all of it — which
 * is the worked example in the rulebook.
 */

export type DamageType =
  | 'normal'
  | 'undefendable'
  | 'pure'
  | 'collateral'
  | 'ultimate'
  /**
   * Damage from outside an Attack: a status effect in Upkeep, a Defensive
   * Ability hitting back. The rules call this typeless rather than a sixth
   * damage type, but it behaves as one: "That damage can be avoided, but is
   * not modifiable or defendable."
   */
  | 'typeless';

interface TypeAttributes {
  /** The defender may activate their Defensive Ability against it. */
  defendable: boolean;
  /** Cards and status effects may reduce, prevent or avoid it. */
  avoidable: boolean;
  /** Attack Modifiers may increase it. */
  modifiable: boolean;
}

export const DAMAGE_TYPES: Record<DamageType, TypeAttributes> = {
  normal: { defendable: true, avoidable: true, modifiable: true },
  undefendable: { defendable: false, avoidable: true, modifiable: true },
  pure: { defendable: false, avoidable: true, modifiable: false },
  collateral: { defendable: false, avoidable: true, modifiable: false },
  // Ultimate damage is modifiable, but may only ever be increased.
  ultimate: { defendable: false, avoidable: false, modifiable: true },
  typeless: { defendable: false, avoidable: true, modifiable: false },
};

export type DamageModifier =
  /** A specific amount added in step 2 (Attack Modifiers, Crit, Chi, ...). */
  | { source: string; kind: 'add'; amount: number }
  /** A specific amount subtracted in step 2 (Divine Defense, Absolution, ...). */
  | { source: string; kind: 'prevent'; amount: number }
  /** Step 3: prevents ceil(subtotal / divisor), e.g. Protect. */
  | { source: string; kind: 'preventFraction'; divisor: number }
  /** Step 3: deals ceil(subtotal / divisor) to the attacker, e.g. Retribution. */
  | { source: string; kind: 'reflectFraction'; divisor: number }
  /** Avoids the damage entirely (Evasive, Smoke Bomb, Shadows). */
  | { source: string; kind: 'avoid' };

export interface DamageResult {
  incoming: number;
  subtotal: number;
  /** Damage the defender actually takes, never below 0. */
  final: number;
  /** Damage sent back to the attacker. */
  reflected: number;
  /** Human-readable trace of how the total was reached. */
  steps: string[];
}

/** All division in Dice Throne rounds up. */
export function halveUp(n: number, divisor = 2): number {
  return Math.ceil(n / divisor);
}

export function resolveDamage(
  incoming: number,
  type: DamageType,
  modifiers: readonly DamageModifier[],
): DamageResult {
  const attrs = DAMAGE_TYPES[type];
  const steps: string[] = [`incoming ${incoming} (${type})`];

  // Ultimate damage may only ever be increased, so drop anything reductive.
  const applicable = modifiers.filter((mod) => {
    if (mod.kind === 'add') return attrs.modifiable;
    return attrs.avoidable;
  });

  if (applicable.some((mod) => mod.kind === 'avoid')) {
    const source = applicable.find((mod) => mod.kind === 'avoid')!.source;
    steps.push(`${source}: damage avoided entirely`);
    return { incoming, subtotal: 0, final: 0, reflected: 0, steps };
  }

  // --- Step 2: add and subtract ---
  let subtotal = incoming;
  for (const mod of applicable) {
    if (mod.kind === 'add') {
      subtotal += mod.amount;
      steps.push(`${mod.source}: +${mod.amount} -> ${subtotal}`);
    } else if (mod.kind === 'prevent') {
      subtotal -= mod.amount;
      steps.push(`${mod.source}: -${mod.amount} -> ${subtotal}`);
    }
  }
  subtotal = Math.max(0, subtotal);
  steps.push(`subtotal ${subtotal}`);

  // --- Step 3: multiply and divide, each against the untouched subtotal ---
  let prevented = 0;
  let reflected = 0;
  for (const mod of applicable) {
    if (mod.kind === 'preventFraction') {
      const amount = halveUp(subtotal, mod.divisor);
      prevented += amount;
      steps.push(`${mod.source}: prevents ceil(${subtotal}/${mod.divisor}) = ${amount}`);
    } else if (mod.kind === 'reflectFraction') {
      const amount = halveUp(subtotal, mod.divisor);
      reflected += amount;
      steps.push(`${mod.source}: reflects ceil(${subtotal}/${mod.divisor}) = ${amount}`);
    }
  }

  const final = Math.max(0, subtotal - prevented);
  steps.push(`final ${final}${reflected ? `, ${reflected} back to attacker` : ''}`);

  return { incoming, subtotal, final, reflected, steps };
}
