import type { AbilityLevel, Die, Effect, Hero } from './types';
import type { DamageModifier, DamageType } from './damage';
import type { ChoiceAnswer, EffectOutcome, EffectRequest } from './effects';
import { createRng, shuffle, type RngState } from './rng';

/** Fixed numbers from the rulebook. */
export const RULES = {
  /** Per team in 1v1 and in every team mode; King of the Hill differs. */
  startingHealth: 50,
  startingCp: 2,
  maxCp: 15,
  startingHand: 4,
  /** Sell down to this many cards in the Discard Phase. */
  handLimit: 6,
  diceCount: 5,
  /** Roll Attempts in an Offensive Roll Phase. */
  rollAttempts: 3,
  /** CP gained per card sold, regardless of its printed cost. */
  sellValue: 1,
  /** CP gained at the start of the Income Phase. */
  incomeCp: 1,
  incomeDraw: 1,
} as const;

/**
 * Supported table layouts.
 *
 * Every team mode shares one Health Dial per team, starting at 50. King of the
 * Hill is a free-for-all where each player is their own team and starting
 * health depends on the head count.
 */
export type GameMode = '1v1' | '2v2' | '3v3' | '2v2v2' | 'koth';

export interface ModeSpec {
  teams: number;
  /** Players on each team. */
  perTeam: number;
  label: string;
}

export const MODES: Record<GameMode, ModeSpec> = {
  '1v1': { teams: 2, perTeam: 1, label: '1v1' },
  '2v2': { teams: 2, perTeam: 2, label: '2v2' },
  '3v3': { teams: 2, perTeam: 3, label: '3v3' },
  '2v2v2': { teams: 3, perTeam: 2, label: '2v2v2' },
  // King of the Hill takes 3-5 players; `perTeam` is filled in at setup.
  koth: { teams: 0, perTeam: 1, label: 'King of the Hill' },
};

/** King of the Hill starting health, by head count. */
export const KOTH_HEALTH: Record<number, number> = { 3: 35, 4: 25, 5: 20 };

export function playerCountFor(mode: GameMode, kothPlayers = 4): number {
  if (mode === 'koth') return kothPlayers;
  const spec = MODES[mode];
  return spec.teams * spec.perTeam;
}

export type Phase =
  | 'upkeep'
  | 'income'
  | 'main1'
  | 'offensiveRoll'
  /** Only entered when an attack has more than one possible defender. */
  | 'targetingRoll'
  | 'defensiveRoll'
  | 'main2'
  | 'discard'
  | 'gameOver';

/** Phases of a turn, in order. `defensiveRoll` is entered only on an attack. */
export const TURN_PHASES: Phase[] = [
  'upkeep',
  'income',
  'main1',
  'offensiveRoll',
  'main2',
  'discard',
];

export interface TeamState {
  id: string;
  name: string;
  /** Teammates share one Health Dial in every team mode. */
  health: number;
  maxHealth: number;
  /** Indexes into `GameState.players`. */
  members: number[];
}

export interface PlayerState {
  id: string;
  name: string;
  heroId: string;
  /** Index into `GameState.teams`. */
  team: number;
  /** Seat order around the table; turn order follows it. */
  seat: number;
  cp: number;
  hand: string[];
  deck: string[];
  discard: string[];
  /** Token counts, keyed by status effect id. */
  statuses: Record<string, number>;
  /** Stack limits raised above the printed one, keyed by status effect id. */
  stackLimits: Record<string, number>;
  /** Current level of each ability slot, keyed by ability id. */
  abilityLevels: Record<string, AbilityLevel>;
  /** Roll Attempts owed by a card, spent when the matching phase opens. */
  extraAttempts: { offensive: number; defensive: number };
  /** Statuses gained this turn — Chi may not be spent for damage on these. */
  gainedThisTurn: string[];
  /** Barbed Vine damage already taken this turn, capped per its rules. */
  barbedVineDamageThisTurn: number;
  /** Set when the player has taken at least one full turn. */
  hasTakenTurn: boolean;
  /** True when the engine plays this seat. */
  isBot: boolean;
}

export interface RollState {
  kind: 'offensive' | 'defensive';
  /** Index into `players` of whoever is rolling. */
  playerIndex: number;
  dice: Die[];
  attemptsUsed: number;
  maxAttempts: number;
}

/**
 * An announced ability waiting on the Targeting Roll Phase. The ability does
 * not resolve until a defender is known, because most of its effects need one.
 */
export interface PendingActivation {
  abilityId: string;
  tierIndex: number;
  /** Dice that satisfied the requirement, kept for "N x symbol" amounts. */
  usedDice: Die[];
  /** Opponents in left-to-right order, as the targeting table reads them. */
  opponents: number[];
  /** Set once the die has been rolled; null while the roll is still owed. */
  roll: number | null;
  /** Who may pick, when the roll defers the choice to a player. */
  chooser: 'attacker' | 'defenders' | null;
}

/** Damage waiting to be applied at the conclusion of the Roll Phase. */
export interface PendingAttack {
  attacker: number;
  defender: number;
  abilityId: string;
  abilityName: string;
  incoming: number;
  type: DamageType;
  modifiers: DamageModifier[];
  /** Effects held back by a "then" clause until after damage resolves. */
  afterDamage: Effect[];
  /** True once the defender has rolled (or declined) their Defensive Ability. */
  defenseResolved: boolean;
}

/* ------------------------------------------------------------------ */
/* Pending steps                                                        */
/* ------------------------------------------------------------------ */

/** Enough of an `EffectContext` to rebuild it after a suspension. */
export interface PendingCtx {
  self: number;
  target: number;
  heroId: string;
  usedDice: Die[];
  defensive: boolean;
  chosen: ChoiceAnswer | null;
}

/** Where a finished effect run sends its outcome. */
export type PendingSink =
  /** An Offensive Ability mid-activation. */
  | { kind: 'ability'; abilityId: string; tierIndex: number; defender: number }
  /** A Defensive Ability mid-resolution. */
  | { kind: 'defense'; abilityId: string }
  /** An action card mid-resolution. */
  | { kind: 'card'; cardId: string; cardName: string; playerIndex: number }
  /** A status token being spent, which resolves from the die it rolls. */
  | { kind: 'status'; statusId: string; playerIndex: number }
  /** A passive ability option the owner paid for, e.g. Tithe's re-roll. */
  | { kind: 'passive'; abilityId: string; optionId: string; playerIndex: number };

/**
 * A step the game is waiting on one player to take.
 *
 * Sub-rolls and choices both stop an effect list part-way: the dice belong to
 * the player who has to throw them and the choice is theirs to make, so the
 * engine parks everything left to do here and picks it up again afterwards.
 */
export interface PendingStep {
  /** Index of the player who must act. */
  who: number;
  /** Ability, card or token that asked — shown in the prompt. */
  source: string;
  request: EffectRequest;
  /** Dice thrown so far, for a roll request. */
  dice: Die[];
  /** True once the dice have been thrown at least once. */
  rolled: boolean;
  /** Re-rolls still on offer. */
  rerolls: number;
  /** Effects still owed once this step completes. */
  rest: Effect[];
  /** Leading entries of `rest` that a declined optional choice discards. */
  bodyLength: number;
  /** Everything accumulated before the suspension. */
  outcome: EffectOutcome;
  ctx: PendingCtx;
  sink: PendingSink;
}

export interface LogEntry {
  round: number;
  phase: Phase;
  player?: string;
  message: string;
}

export interface GameState {
  mode: GameMode;
  players: PlayerState[];
  teams: TeamState[];
  /** Index of the active player. */
  active: number;
  phase: Phase;
  round: number;
  roll: RollState | null;
  /** Set while the Targeting Roll Phase is deciding who gets hit. */
  targeting: PendingActivation | null;
  attack: PendingAttack | null;
  /**
   * Steps waiting on a player, innermost last.
   *
   * A stack rather than a single slot because an Instant played *into* a
   * pending defence roll can itself stop to ask a question; answering it
   * uncovers the roll that was waiting underneath.
   */
  pending: PendingStep[];
  /** Extra Offensive Roll Phases owed to the active player by Stun. */
  extraOrp: number;
  rng: RngState;
  log: LogEntry[];
  /** Id of the winning team once the game is over. */
  winner: string | null;
}

export interface PlayerSetup {
  id: string;
  name: string;
  hero: Hero;
  /** Seats the engine plays itself. */
  isBot?: boolean;
}

export interface GameOptions {
  seed?: number;
  mode?: GameMode;
}

/**
 * Seats are dealt out so that walking clockwise alternates teams, which is the
 * zigzag turn order the rulebook asks for: seat i belongs to team i % teams.
 */
export function teamForSeat(seat: number, teams: number): number {
  return seat % teams;
}

/** Builds the starting state. Deterministic given `seed`. */
export function createGame(setups: PlayerSetup[], options: GameOptions | number = {}): GameState {
  const opts: GameOptions = typeof options === 'number' ? { seed: options } : options;
  const mode: GameMode = opts.mode ?? '1v1';
  const seed = opts.seed ?? 1;

  if (setups.length < 2) throw new Error('A game needs at least 2 players');
  if (mode !== 'koth' && setups.length !== playerCountFor(mode)) {
    throw new Error(`${MODES[mode].label} needs ${playerCountFor(mode)} players`);
  }
  if (mode === 'koth' && (setups.length < 3 || setups.length > 5)) {
    throw new Error('King of the Hill takes 3 to 5 players');
  }

  const rng: RngState = createRng(seed);
  const teamCount = mode === 'koth' ? setups.length : MODES[mode].teams;
  const teamHealth = mode === 'koth' ? KOTH_HEALTH[setups.length] : RULES.startingHealth;

  const players = setups.map<PlayerState>(({ id, name, hero, isBot }, seat) => {
    // A card with N copies appears N times in the deck.
    const cardIds = hero.cards.flatMap((card) =>
      Array.from({ length: card.copies }, (_, i) => `${card.id}#${i}`),
    );
    const deck = shuffle(rng, cardIds);
    const hand = deck.splice(0, Math.min(RULES.startingHand, deck.length));

    return {
      id,
      name,
      heroId: hero.id,
      team: teamForSeat(seat, teamCount),
      seat,
      cp: RULES.startingCp,
      hand,
      deck,
      discard: [],
      statuses: {},
      stackLimits: {},
      abilityLevels: Object.fromEntries(hero.abilities.map((a) => [a.id, a.level])),
      extraAttempts: { offensive: 0, defensive: 0 },
      gainedThisTurn: [],
      barbedVineDamageThisTurn: 0,
      hasTakenTurn: false,
      isBot: isBot ?? false,
    };
  });

  const teams: TeamState[] = Array.from({ length: teamCount }, (_, i) => {
    const members = players.map((_p, idx) => idx).filter((idx) => players[idx].team === i);
    return {
      id: `team-${i + 1}`,
      name: mode === 'koth' ? players[members[0]].name : `Team ${i + 1}`,
      health: teamHealth,
      maxHealth: teamHealth,
      members,
    };
  });

  return {
    mode,
    players,
    teams,
    active: 0,
    // The start player skips their first Income Phase, so the game opens in
    // Main Phase 1 rather than Upkeep.
    phase: 'main1',
    round: 1,
    roll: null,
    targeting: null,
    attack: null,
    pending: [],
    extraOrp: 0,
    rng,
    log: [{ round: 1, phase: 'main1', message: `Game start (${MODES[mode].label})` }],
    winner: null,
  };
}

/* ------------------------------------------------------------------ */
/* Small helpers used across the engine                                */
/* ------------------------------------------------------------------ */

/** The Health Dial a player shares with their team. */
export function teamOf(state: GameState, playerIndex: number): TeamState {
  return state.teams[state.players[playerIndex].team];
}

export function healthOf(state: GameState, playerIndex: number): number {
  return teamOf(state, playerIndex).health;
}

/** True while the player's team still has health. */
export function isAlive(state: GameState, playerIndex: number): boolean {
  return healthOf(state, playerIndex) > 0;
}

export function statusCount(player: PlayerState, statusId: string): number {
  return player.statuses[statusId] ?? 0;
}

/**
 * How many of a token a player may hold.
 *
 * The printed limit comes from the hero that brought the token into the game;
 * a card such as Fan the Flames raises it for its owner only.
 */
export function limitFor(
  _state: GameState,
  holder: PlayerState,
  hero: Hero,
  statusId: string,
): number {
  const raised = holder.stackLimits[statusId];
  if (raised !== undefined) return raised;
  return hero.statusEffects.find((s) => s.id === statusId)?.stackLimit ?? 1;
}

export function addStatus(player: PlayerState, statusId: string, amount: number, limit: number): void {
  const next = Math.min(limit, statusCount(player, statusId) + amount);
  player.statuses[statusId] = next;
  if (!player.gainedThisTurn.includes(statusId)) player.gainedThisTurn.push(statusId);
}

export function removeStatus(player: PlayerState, statusId: string, amount = 1): void {
  const next = statusCount(player, statusId) - amount;
  if (next > 0) player.statuses[statusId] = next;
  else delete player.statuses[statusId];
}

export function gainCp(player: PlayerState, amount: number): void {
  player.cp = Math.max(0, Math.min(RULES.maxCp, player.cp + amount));
}

/** Draws `n` cards, reshuffling the discard pile into the deck when it runs out. */
export function drawCards(state: GameState, player: PlayerState, n: number): string[] {
  const drawn: string[] = [];
  for (let i = 0; i < n; i++) {
    if (player.deck.length === 0) {
      if (player.discard.length === 0) break;
      player.deck = shuffle(state.rng, player.discard);
      player.discard = [];
    }
    const card = player.deck.shift();
    if (card === undefined) break;
    player.hand.push(card);
    drawn.push(card);
  }
  return drawn;
}

/**
 * Opponents of `index`, in clockwise seat order starting from the seat after
 * theirs. That order is what the Targeting Roll Phase calls left -> right.
 */
export function opponentsOf(state: GameState, index: number): number[] {
  const me = state.players[index];
  const n = state.players.length;
  const out: number[] = [];
  for (let step = 1; step < n; step++) {
    const seat = (me.seat + step) % n;
    const other = state.players.findIndex((p) => p.seat === seat);
    if (other >= 0 && state.players[other].team !== me.team && isAlive(state, other)) {
      out.push(other);
    }
  }
  return out;
}

/** First available opponent, used where a single target is implied. */
export function opponentOf(state: GameState, index: number): number {
  return opponentsOf(state, index)[0] ?? index;
}

/** The step currently blocking play, if any. */
export function topPending(state: GameState): PendingStep | null {
  return state.pending[state.pending.length - 1] ?? null;
}

/** Teammates of `index`, excluding themselves. */
export function teammatesOf(state: GameState, index: number): number[] {
  return teamOf(state, index).members.filter((i) => i !== index);
}
