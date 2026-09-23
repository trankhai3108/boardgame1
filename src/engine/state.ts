import type { AbilityLevel, Die, Effect, Hero } from './types';
import type { DamageModifier, DamageType } from './damage';
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
  /** Current level of each ability slot, keyed by ability id. */
  abilityLevels: Record<string, AbilityLevel>;
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
      abilityLevels: Object.fromEntries(hero.abilities.map((a) => [a.id, a.level])),
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

/** Teammates of `index`, excluding themselves. */
export function teammatesOf(state: GameState, index: number): number[] {
  return teamOf(state, index).members.filter((i) => i !== index);
}
