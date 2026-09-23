/**
 * Core domain types for Dice Throne.
 *
 * Everything in `data/` is plain data that conforms to these types, so adding a
 * hero never means touching the engine — only writing a new definition file.
 */

/* ------------------------------------------------------------------ */
/* Dice                                                                */
/* ------------------------------------------------------------------ */

/**
 * Every hero's 5 dice share the same 6 faces, but each hero renames them.
 * The engine only cares about the face *index* (1-6); `DieSymbol` is the
 * hero-agnostic vocabulary used by ability requirements.
 */
export type DieSymbol = string;

/** One face of a hero's die: which pip value it is and what symbol it shows. */
export interface DieFace {
  /** Pip value 1-6. Straights are computed from this, not from the symbol. */
  value: number;
  /** Hero-specific symbol id, e.g. 'sword' | 'helmet' | 'life' | 'prayer'. */
  symbol: DieSymbol;
  /** Display label printed on the leaflet, e.g. 'SWORD'. */
  label: string;
}

/** A die currently on the table. */
export interface Die {
  id: string;
  /** Pip value showing, 1-6. */
  value: number;
  /** Locked dice are kept between rolls. */
  kept: boolean;
}

/* ------------------------------------------------------------------ */
/* Ability requirements                                                */
/* ------------------------------------------------------------------ */

export type DiceRequirement =
  /** N dice showing specific symbols, e.g. 3 swords + 2 helmets. */
  | { kind: 'symbols'; symbols: Record<DieSymbol, number> }
  /** A run of consecutive values. 4 = small straight, 5 = large straight. */
  | { kind: 'straight'; length: number }
  /** N dice showing the same value (any value). */
  | { kind: 'ofAKind'; count: number }
  /** Defensive abilities roll a fixed number of dice instead of matching. */
  | { kind: 'defenseRoll'; dice: number };

/* ------------------------------------------------------------------ */
/* Effects                                                             */
/* ------------------------------------------------------------------ */

export type Target =
  | 'self'
  | 'opponent'
  | 'chosenPlayer'
  | 'allOpponents'
  | 'attacker'
  /** Whoever the player picked in the enclosing `choose` effect. */
  | 'chosen';

/**
 * A question the engine puts to a player before the surrounding effects run.
 *
 * `scope` reads from the point of view of whoever is resolving the effect, so
 * 'opponents' means *their* opponents, not the active player's.
 */
export type ChoiceSpec =
  /** Pick a player. */
  | { pick: 'player'; scope?: 'any' | 'opponents' | 'others'; optional?: boolean }
  /** Pick one status token, on any player the scope allows. */
  | {
      pick: 'status';
      scope?: 'any' | 'own' | 'opponents';
      polarity?: 'positive' | 'negative';
      /** Only these tokens are on offer, e.g. "you may discard Wellspring". */
      only?: string[];
      optional?: boolean;
    }
  /** Pick a die from the roll currently on the table. */
  | { pick: 'die'; scope?: 'any' | 'own' | 'opponents'; optional?: boolean }
  /**
   * Pick a pip value.
   *
   * 'any' offers 1-6, 'shown' only values already on the table (Me Too!), and
   * 'adjacent' only one step either side of the die just picked (Flick!).
   */
  | { pick: 'dieValue'; mode?: 'any' | 'shown' | 'adjacent' }
  /**
   * Pick one of a named set of branches — "gain Evasive or gain Cleanse".
   * The body then runs `when: { chose: id }` for whichever was taken.
   */
  | { pick: 'oneOf'; options: { id: string; label: string }[]; optional?: boolean };

/**
 * A structured, executable description of what an ability or card does.
 *
 * Card text is rendered from `text` fields on the card, not from these — these
 * exist so the engine can actually resolve the effect.
 */
export type Effect =
  | {
      t: 'damage';
      amount: number | DynamicAmount;
      undefendable?: boolean;
      /** Pure dmg: not defendable, and nothing may reduce or avoid it. */
      pure?: boolean;
      target?: Target;
    }
  | { t: 'heal'; amount: number | DynamicAmount; target?: Target }
  | { t: 'gainCP'; amount: number | DynamicAmount; target?: Target }
  | { t: 'drawCard'; amount: number | DynamicAmount; target?: Target }
  | { t: 'discardCard'; amount: number; target?: Target }
  | { t: 'gainStatus'; status: string; amount?: number | DynamicAmount; target?: Target }
  | { t: 'removeStatus'; status?: string; amount?: number; target?: Target }
  /** Strip every token from the target, e.g. "What Status?". */
  | { t: 'removeAllStatus'; target?: Target }
  | { t: 'transferStatus'; from: Target; to: Target; amount: number }
  | { t: 'setHealth'; amount: number; target?: Target }
  /**
   * Roll extra dice, then apply per-outcome effects (e.g. Holy Light).
   *
   * The dice are rolled by hand: resolution suspends until the player whose
   * effect this is has rolled them, and `rerolls` says how many of those dice
   * they may send back before the result stands.
   */
  | {
      t: 'subRoll';
      dice: number;
      outcomes: SubRollOutcome[];
      /** Applied once per die that matched no outcome. */
      otherwise?: Effect[];
      /** Dice the player may re-roll before the result is applied. */
      rerolls?: number;
      /**
       * Resolved once for the roll as a whole, with every die in context, so
       * `perPip` reads the total. This is what "deal damage equal to the total
       * roll value" needs.
       */
      total?: Effect[];
    }
  /** Re-roll dice, optionally at a CP cost (e.g. Tithe). */
  | { t: 'reroll'; dice: number }
  /** Make this attack undefendable. */
  | { t: 'undefendable' }
  /** Defensive abilities: subtract a flat amount from incoming damage. */
  | { t: 'prevent'; amount: number | DynamicAmount }
  /** Defensive abilities: prevent ceil(subtotal / divisor) of incoming damage. */
  | { t: 'preventFraction'; divisor: number }

  /* --- asked of a player before the nested effects run --- */
  /** Put `request` to the resolving player, then run `effects` with the answer. */
  | { t: 'choose'; request: ChoiceSpec; effects: Effect[] }

  /** Run `effects` only when the condition holds, else `otherwise`. */
  | { t: 'when'; cond: Condition; effects: Effect[]; otherwise?: Effect[] }

  /* --- act on the dice currently on the table --- */
  /** Set the chosen die to `value`, or nudge it by `delta`, clamped to 1-6. */
  | { t: 'setDie'; value?: number; delta?: number; fromChoice?: boolean }
  /** Re-roll the chosen die. */
  | { t: 'rerollDie' }
  /** Grant an extra Roll Attempt in the named phase. */
  | { t: 'extraRollAttempt'; phase: 'offensive' | 'defensive'; target?: Target }

  /* --- act on the attack currently pending --- */
  /** Prevent flat damage from the pending attack, e.g. "Next Time!". */
  | { t: 'preventDamage'; amount: number | DynamicAmount }
  /** Add damage to the pending attack — an Attack Modifier card. */
  | { t: 'attackBonus'; amount: number | DynamicAmount }
  /** Inflict a status on whoever the pending attack is aimed at. */
  | { t: 'statusOnDefender'; status: string; amount?: number }

  /* --- Treant's spirit ladder --- */
  /** Grow N spirits: promote sapling -> dryad, seedling -> sapling, else plant. */
  | { t: 'growSpirit'; amount: number | DynamicAmount }
  /** Remove up to N spirits, lowest first, for 1 CP each. */
  /**
   * Spend Spirits from the top of the ladder down. Each one pays out `cp` CP
   * (the printed Harvest) or adds `damage` to the attack on the table.
   */
  | { t: 'harvestSpirits'; max: number; cp?: number; damage?: number }
  /**
   * Spend up to `max` of a token to fuel the attack on the table: Combustion's
   * "remove up to 4 Fire Mastery and deal 3 undefendable dmg per token".
   */
  | {
      t: 'spendTokens';
      status: string;
      max: number;
      damage?: number;
      undefendable?: boolean;
      cp?: number;
    }

  /* --- misc --- */
  /** Raise a status effect's stack limit for the rest of the game. */
  | { t: 'stackLimitBonus'; status: string; amount: number }
  /**
   * Turn aside the next `amount` negative tokens somebody tries to inflict on
   * the target — Thick Skin II's "prevent 1 incoming status effect", and what
   * a Dryad may be spent on instead of damage.
   */
  | { t: 'wardStatus'; amount: number; target?: Target }
  /** Spend any amount of CP, gaining `status` once per CP spent. */
  | { t: 'spendCpForStatus'; status: string }
  /** Anything not yet modelled: the engine surfaces it for manual resolution. */
  | { t: 'manual'; note: string };

/** A test an effect list can be gated on. */
export type Condition =
  /** The resolving player holds at least `min` (default 1) of a token. */
  | { has: string; min?: number }
  /** The attack on the table already deals at least this much. */
  | { attackAtLeast: number }
  /** The sub-roll just thrown totalled at least this much. */
  | { rollAtLeast: number }
  /** The player took this branch of the enclosing `pick: 'oneOf'` question. */
  | { chose: string }
  /** The spend just before this removed at least this many tokens. */
  | { spentAtLeast: number }
  /** The dice in context show this many of the same number. */
  | { ofAKind: number }
  /** The dice in context include at least `min` of this face. */
  | { rolled: DieSymbol; min?: number };

/** Per-face results of a sub-roll, keyed by the symbol that came up. */
export interface SubRollOutcome {
  /** Symbol that triggers this outcome, or a pip value. */
  on: DieSymbol | number;
  effects: Effect[];
  /** Require this many matching dice before the effects fire once (default 1). */
  atLeast?: number;
}

/**
 * An amount that scales with the dice rolled, e.g.
 * "Add 1 x helmet + 2 x sword dmg" -> { perSymbol: { helmet: 1, sword: 2 } }.
 */
export interface DynamicAmount {
  /** Flat base added on top of the per-symbol total. */
  base?: number;
  /** Multiplier applied per die showing each symbol. */
  perSymbol?: Record<DieSymbol, number>;
  /** Multiplier applied per token the resolving player holds. */
  perStatus?: Record<string, number>;
  /** Multiplier applied per CP the resolving player has on their dial. */
  perCp?: number;
  /** Multiplier applied per pip showing on the dice in context. */
  perPip?: number;
  /** Halve the total, rounding up — as all division in Dice Throne does. */
  halve?: boolean;
}

/* ------------------------------------------------------------------ */
/* Abilities                                                           */
/* ------------------------------------------------------------------ */

export type AbilityKind = 'offensive' | 'defensive' | 'passive';

export type AbilityLevel = 'I' | 'II' | 'III';

/**
 * One tier of an ability. Most abilities have a single tier; a few (Holy Attack)
 * offer a stronger result for a harder combo on the same ability slot.
 */
export interface AbilityTier {
  requirement: DiceRequirement;
  /** Label under the dice row, e.g. 'SMALL STRAIGHT'. */
  requirementLabel?: string;
  /** Rendered card text lines. */
  text: string[];
  effects: Effect[];
}

/**
 * Something a passive ability lets its owner pay for, at will.
 *
 * Tithe's two lines are the shape this exists for: "you may re-roll 1 die at
 * any time for 1 CP" and "you may draw 1 card at any time for 3 CP".
 */
export interface PassiveOption {
  /** Unique within the ability; also the translation key suffix. */
  id: string;
  /** CP the owner pays each time they use it. */
  cp: number;
  /** Short label, e.g. 'Re-roll a die'. Translated via `passive.<id>`. */
  label: string;
  effects: Effect[];
  /**
   * When it may be used. `roll` means only while the owner has dice on the
   * table; `any` means any phase of their own turn.
   */
  window: 'any' | 'roll';
}

/** What a passive ability does, beyond printing its text on the board. */
export interface PassiveSpec {
  /** Resolved automatically during the owner's Upkeep Phase. */
  upkeep?: Effect[];
  /** Offered to the owner to pay for whenever their window is open. */
  options?: PassiveOption[];
}

export interface Ability {
  /** Stable slot id — upgrade cards target this. */
  id: string;
  name: string;
  kind: AbilityKind;
  /** The level the slot starts the game at, which is always I. */
  level: AbilityLevel;
  /** What the slot does at level I. */
  tiers: AbilityTier[];
  /**
   * What it does once it has been upgraded.
   *
   * An upgrade card raises the slot's level; these are the rules that level
   * then plays by. A level with nothing here keeps the tiers below it, so a
   * hero only needs entries for the levels that actually change.
   */
  upgrades?: Partial<Record<Exclude<AbilityLevel, 'I'>, AbilityTier[]>>;
  /**
   * The same thing for a passive slot, which has options rather than tiers.
   */
  passiveUpgrades?: Partial<Record<Exclude<AbilityLevel, 'I'>, PassiveSpec>>;
  /** Passive abilities have no dice requirement, only text. */
  text?: string[];
  /** Text printed below every tier, applying to all of them. */
  footer?: string[];
  /** For `kind: 'passive'`: what the ability actually does. */
  passive?: PassiveSpec;
  /** True for the hero's Ultimate (5 of a kind). */
  ultimate?: boolean;
}

/* ------------------------------------------------------------------ */
/* Cards                                                               */
/* ------------------------------------------------------------------ */

export type CardType =
  | 'mainPhase'
  | 'rollPhase'
  | 'instant'
  | 'upgrade';

/** Extra pill rendered above the card text, e.g. 'Attack Modifier'. */
export type CardTag = 'Attack Modifier' | 'Persistent' | 'Transfer';

/**
 * Extra conditions on when a card is playable.
 *
 * `who` reads against the pending attack, so an Instant tagged
 * `{ who: 'defender' }` is offered only to whoever is being hit.
 */
export interface CardWindow {
  who?: 'anyone' | 'attacker' | 'defender';
  /** Only while an attack is waiting to be resolved. */
  needsAttack?: boolean;
  /** Only while there are dice on the table. */
  needsRoll?: boolean;
  /** Only while the roll on the table belongs to the player. */
  needsOwnRoll?: boolean;
}

export interface Card {
  /** Unique within a hero deck, e.g. 'paladin-tithe-ii'. */
  id: string;
  name: string;
  type: CardType;
  /** Combat Point cost printed in the left rail. */
  cp: number;
  /** Body text, one entry per rendered line/paragraph. */
  text: string[];
  tags?: CardTag[];
  /** How many copies of this card are in the hero's deck. */
  copies: number;
  /** Set code printed on the right edge, e.g. 'PALA 01 V1'. */
  setCode?: string;

  /* --- upgrade cards only --- */
  /** Ability slot id this upgrade replaces. */
  upgrades?: string;
  upgradeLevel?: AbilityLevel;
  /** Dice row shown at the top of an upgrade card. */
  requirement?: DiceRequirement;
  requirementLabel?: string;

  /** Executable form of the card's effect. */
  effects?: Effect[];
  /** Narrows when the card may be played, beyond what `type` implies. */
  window?: CardWindow;
  /** Art asset path, relative to /public. Undefined renders a CSS placeholder. */
  art?: string;
}

/* ------------------------------------------------------------------ */
/* Status effects                                                      */
/* ------------------------------------------------------------------ */

export interface StatusEffect {
  id: string;
  name: string;
  polarity: 'positive' | 'negative' | 'unique' | 'companion';
  stackLimit: number;
  /** Short line shown on the token tooltip. */
  summary: string;
  /** Full leaflet text. */
  text: string;
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

export type Season =
  | 'season1'
  | 'season2'
  | 'marvel'
  | 'xmen'
  | 'outcasts'
  | 'promo';

export interface Hero {
  id: string;
  name: string;
  season: Season;
  /** 1-6 dice shown on the leaflet. */
  complexity: number;
  weapon: string;
  bio: string;
  /** Theme colours used by the board and card frames. */
  palette: {
    primary: string;
    accent: string;
    board: string;
    /** Ability-card colours; heroes with dark boards override these. */
    abilityBg?: string;
    abilityInk?: string;
    abilityEdge?: string;
    /** Ultimate banner colours; defaults to a neutral dark blue. */
    ultimateBg?: string;
    ultimateInk?: string;
    ultimateEdge?: string;
  };
  /** The 6 faces of this hero's dice, indexed by pip value 1-6. */
  dieFaces: DieFace[];
  /** Base (level I) abilities as printed on the hero board. */
  abilities: Ability[];
  /** Status effects this hero brings to the game. */
  statusEffects: StatusEffect[];
  /** The hero's 32-card deck: upgrades + action cards. */
  cards: Card[];
  /** Starting health, 50 in standard play. */
  startingHealth?: number;
  /** Portrait asset path, relative to /public. */
  portrait?: string;
}
