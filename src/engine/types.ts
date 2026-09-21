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
  | 'attacker';

/**
 * A structured, executable description of what an ability or card does.
 *
 * Card text is rendered from `text` fields on the card, not from these — these
 * exist so the engine can actually resolve the effect.
 */
export type Effect =
  | { t: 'damage'; amount: number | DynamicAmount; undefendable?: boolean; target?: Target }
  | { t: 'heal'; amount: number | DynamicAmount; target?: Target }
  | { t: 'gainCP'; amount: number | DynamicAmount; target?: Target }
  | { t: 'drawCard'; amount: number; target?: Target }
  | { t: 'discardCard'; amount: number; target?: Target }
  | { t: 'gainStatus'; status: string; amount?: number; target?: Target }
  | { t: 'removeStatus'; status?: string; amount?: number; target?: Target }
  | { t: 'transferStatus'; from: Target; to: Target; amount: number }
  | { t: 'setHealth'; amount: number; target?: Target }
  /** Roll extra dice, then apply per-outcome effects (e.g. Holy Light). */
  | { t: 'subRoll'; dice: number; outcomes: SubRollOutcome[] }
  /** Re-roll dice, optionally at a CP cost (e.g. Tithe). */
  | { t: 'reroll'; dice: number }
  /** Make this attack undefendable. */
  | { t: 'undefendable' }
  /** Defensive abilities: subtract a flat amount from incoming damage. */
  | { t: 'prevent'; amount: number | DynamicAmount }
  /** Defensive abilities: prevent ceil(subtotal / divisor) of incoming damage. */
  | { t: 'preventFraction'; divisor: number }
  /** Anything not yet modelled: the engine surfaces it for manual resolution. */
  | { t: 'manual'; note: string };

/** Per-face results of a sub-roll, keyed by the symbol that came up. */
export interface SubRollOutcome {
  /** Symbol that triggers this outcome, or a pip value. */
  on: DieSymbol | number;
  effects: Effect[];
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

export interface Ability {
  /** Stable slot id — upgrade cards target this. */
  id: string;
  name: string;
  kind: AbilityKind;
  level: AbilityLevel;
  tiers: AbilityTier[];
  /** Passive abilities have no dice requirement, only text. */
  text?: string[];
  /** Text printed below every tier, applying to all of them. */
  footer?: string[];
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
