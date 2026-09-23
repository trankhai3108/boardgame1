import type { DamageModifier } from './damage';
import type { Effect } from './types';

/**
 * What each status token actually *does*, as opposed to what its leaflet text
 * says. The engine consults this table; hero data only says which tokens a
 * hero brings to the game.
 *
 * Anything that needs a human decision the engine cannot make (choosing which
 * token to remove, choosing between two effects) is recorded in `manual`
 * rather than silently approximated.
 */
export interface StatusBehaviour {
  /** Spend while damage is pending against you. */
  spendToPrevent?: DamageModifier;

  /**
   * Spend with no attack on the table at all.
   *
   * Most tokens answer an attack, but several do not: Cleanse sheds a status,
   * a Sapling is cashed in for health and CP, Wellspring is rolled in a Main
   * Phase, a Seedling re-rolls one of your own dice. `when` says where the
   * token may be cashed, and `effects` is what cashing it does.
   */
  spendFreely?: {
    /** 'any' is any point in your own turn; 'roll' needs dice on the table. */
    when: 'any' | 'roll';
    effects: Effect[];
  };

  /** Spend while your own attack's damage is pending. */
  spendToBoost?: {
    /** Chi: may not be spent for damage on the turn it was gained. */
    notTheTurnGained?: boolean;
    /** Minimum damage the attack must already deal (Crit needs 5). */
    minDamage?: number;
    /** Flat damage added. */
    add?: number;
    /** Roll 1 die and add a value derived from the result. */
    rollAdd?: (roll: number) => number;
    /** Makes the attack undefendable rather than adding damage. */
    undefendable?: boolean;
  };

  /** Spend and roll; damage is avoided entirely on these die results. */
  spendToAvoid?: { avoidOn: number[] };

  /** Avoids damage from an opponent's Offensive Roll Phase with no roll. */
  autoAvoid?: boolean;

  /** Resolved during the holder's Upkeep Phase. */
  upkeep?: { damagePerToken?: number; removeTokens?: number };

  /** Resolved at the end of the holder's turn. */
  endOfTurn?: { damagePerToken?: number; removeTokens?: number };

  /** Holder gets this many fewer Roll Attempts in their next Offensive Roll Phase. */
  rollAttemptPenalty?: number;

  /** Holder must pay this much CP before their Offensive Roll Phase or skip it. */
  skipOrpUnlessPaid?: number;

  /** Holder skips their Income Phase, then the token is removed. */
  skipIncome?: boolean;

  /** Damage per Roll Attempt beyond the first, capped per turn. */
  damagePerExtraRollAttempt?: { amount: number; maxPerTurn: number };

  /** Attacks against the holder deal this much more. Persistent. */
  incomingBonus?: number;

  /** On concluding an Offensive Roll Phase, roll 1 die; these results fail it. */
  failOrpOn?: number[];

  /** Instead of being defeated, health is set to this and the token removed. */
  preventDefeatSetHealth?: number;

  /** The attacker takes another Offensive Roll Phase against the same target. */
  grantsExtraOrpToInflicter?: boolean;

  /** Explains anything above that still needs a player decision. */
  manual?: string;
}

export const STATUS_BEHAVIOUR: Record<string, StatusBehaviour> = {
  /* --- Paladin --- */
  protect: {
    spendToPrevent: { source: 'Protect', kind: 'preventFraction', divisor: 2 },
  },
  retribution: {
    spendToPrevent: { source: 'Retribution', kind: 'reflectFraction', divisor: 2 },
  },
  crit: {
    spendToBoost: { minDamage: 5, add: 4 },
  },
  accuracy: {
    spendToBoost: { undefendable: true },
  },
  'blessing-of-divinity': {
    preventDefeatSetHealth: 1,
    manual: 'Does not prevent damage from an opponent’s Ultimate.',
  },

  /* --- Barbarian --- */
  stun: {
    grantsExtraOrpToInflicter: true,
    manual: 'While stunned the holder may take no actions of any kind.',
  },
  concussion: { skipIncome: true },

  /* --- Monk --- */
  chi: {
    spendToPrevent: { source: 'Chi', kind: 'prevent', amount: 1 },
    // Printed on the token: not on the turn it was gained.
    spendToBoost: { add: 1, notTheTurnGained: true },
  },
  evasive: { spendToAvoid: { avoidOn: [1, 2] } },
  knockdown: { skipOrpUnlessPaid: 2 },
  cleanse: {
    spendFreely: {
      when: 'any',
      effects: [
        {
          t: 'choose',
          request: { pick: 'status', scope: 'own' },
          effects: [{ t: 'removeStatus', target: 'chosen' }],
        },
      ],
    },
  },

  /* --- Moon Elf --- */
  blind: { failOrpOn: [1, 2] },
  entangle: { rollAttemptPenalty: 1 },
  targeted: { incomingBonus: 2 },

  /* --- Pyromancer --- */
  burn: { upkeep: { damagePerToken: 2 } },
  'fire-mastery': {
    upkeep: { removeTokens: 1 },
    manual: 'Fire Mastery increases the power of several abilities.',
  },

  /* --- Shadow Thief --- */
  shadows: {
    autoAvoid: true,
    manual: 'Discard after the holder starts and concludes a turn under its effects.',
  },
  'sneak-attack': {
    spendToBoost: { rollAdd: (roll) => roll },
  },
  poison: { upkeep: { damagePerToken: 1 } },

  /* --- Ninja --- */
  'delayed-poison': { endOfTurn: { damagePerToken: 3, removeTokens: 99 } },
  'smoke-bomb': { spendToAvoid: { avoidOn: [1, 2, 3] } },
  ninjutsu: {
    spendToBoost: { rollAdd: (roll) => (roll <= 3 ? 1 : 2) },
    manual: 'On a 6, choose instead to inflict Delayed Poison or become undefendable.',
  },

  /* --- Treant --- */
  seedling: {
    spendFreely: {
      when: 'roll',
      effects: [
        { t: 'choose', request: { pick: 'die', scope: 'own' }, effects: [{ t: 'rerollDie' }] },
      ],
    },
  },
  sapling: {
    spendFreely: {
      when: 'any',
      effects: [
        { t: 'heal', amount: 1 },
        { t: 'gainCP', amount: 1 },
      ],
    },
    manual: 'May instead be spent with 1 CP to draw a card.',
  },
  dryad: {
    spendToBoost: { add: 3 },
    manual: 'May instead be spent to prevent an incoming negative status effect.',
  },
  'barbed-vine': {
    damagePerExtraRollAttempt: { amount: 1, maxPerTurn: 2 },
  },
  wellspring: {
    spendFreely: {
      when: 'any',
      effects: [
        {
          t: 'subRoll',
          dice: 1,
          outcomes: [],
          total: [{ t: 'heal', amount: { perPip: 1, halve: true } }],
        },
      ],
    },
  },
};

export function behaviourOf(statusId: string): StatusBehaviour {
  return STATUS_BEHAVIOUR[statusId] ?? {};
}
