import type { Action } from './actions';
import type { GameState } from './state';
import { teamOf, topPending } from './state';

/**
 * Who is entitled to take an action.
 *
 * `legalActions` says what the rules allow right now; this says whose click it
 * is. A networked server needs both, because most of a turn belongs to the
 * active player but defending, spending tokens and picking a target do not.
 */
export function canAct(state: GameState, playerIndex: number, action: Action): boolean {
  if (state.phase === 'gameOver') return false;
  if (playerIndex < 0 || playerIndex >= state.players.length) return false;

  // A roll or a decision the engine stopped for belongs to one seat, and
  // nothing else may be done until they have settled it.
  const pending = topPending(state);

  switch (action.type) {
    // Spending a token is the token holder's call, whoever's turn it is.
    case 'spendStatus':
      return state.players[playerIndex].id === action.playerId;

    // Instants and Roll Phase cards come from any hand, so the seat named on
    // the action is the one that has to match.
    case 'playCard':
      return action.playerId
        ? state.players[playerIndex].id === action.playerId
        : playerIndex === state.active;

    case 'rollPending':
    case 'rerollPending':
    case 'keepPending':
    case 'confirmPending':
    case 'answerChoice':
      return pending !== null && pending.who === playerIndex;

    // Only the seat being asked may say they are done.
    case 'passResponse':
      return state.players[playerIndex].id === action.playerId;

    case 'chooseDefense':
      return state.attack?.defender === playerIndex;

    case 'chooseTarget': {
      const pending = state.targeting;
      if (!pending) return false;
      if (pending.chooser === 'attacker') return playerIndex === state.active;
      // "Your opponents choose which of them you target" — any of them may say.
      return pending.opponents.includes(playerIndex);
    }

    // Resolving the accumulated damage just advances the game; either side of
    // the attack may do it once both are done acting.
    case 'resolveAttack':
      // Damage from outside an attack is the target's alone to settle.
      if (state.attack?.window) return state.attack.defender === playerIndex;
      return playerIndex === state.active || state.attack?.defender === playerIndex;

    default:
      // Everything else waits behind a pending step.
      if (pending) return false;
      return playerIndex === state.active;
  }
}

/**
 * The view of the state a given player is allowed to see.
 *
 * Hands are hidden from other teams. Teammates are explicitly encouraged to
 * share hands, so they stay visible within a team. Decks are never visible;
 * only their size matters, so they are replaced by anonymous placeholders.
 */
export function redactFor(state: GameState, playerIndex: number | null): GameState {
  const myTeam = playerIndex === null ? null : state.players[playerIndex].team;
  return {
    ...state,
    players: state.players.map((player) => {
      const sameTeam = myTeam !== null && player.team === myTeam;
      if (sameTeam) return { ...player, deck: player.deck.map(() => 'hidden') };
      return {
        ...player,
        hand: player.hand.map(() => 'hidden'),
        deck: player.deck.map(() => 'hidden'),
        discard: player.discard.slice(),
      };
    }),
  };
}

/** Index of a player id, or -1 for a spectator. */
export function indexOfPlayer(state: GameState, playerId: string | null): number {
  if (!playerId) return -1;
  return state.players.findIndex((p) => p.id === playerId);
}

/** Convenience for UIs: is it this player's move at all? */
export function isWaitingOn(state: GameState, playerIndex: number): boolean {
  if (state.phase === 'gameOver') return false;
  const pending = topPending(state);
  if (pending) return pending.who === playerIndex;
  if (state.targeting?.chooser === 'defenders') {
    return state.targeting.opponents.includes(playerIndex);
  }
  if (state.phase === 'defensiveRoll' && !state.attack?.defenseResolved) {
    return state.attack?.defender === playerIndex;
  }
  return playerIndex === state.active;
}

/** Teams still in the game, for scoreboards. */
export function standings(state: GameState) {
  return state.teams.map((team) => ({
    id: team.id,
    name: team.name,
    health: team.health,
    maxHealth: team.maxHealth,
    out: team.health <= 0,
    players: team.members.map((i) => state.players[i].name),
  }));
}

/** True when `playerIndex` shares a team with the active player. */
export function isTeammateOfActive(state: GameState, playerIndex: number): boolean {
  return teamOf(state, playerIndex) === teamOf(state, state.active);
}
