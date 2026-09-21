import type { Action } from '../src/engine/actions';
import type { GameMode, GameState } from '../src/engine/state';

/** A seat in a room, before the game starts. */
export interface Seat {
  playerId: string;
  name: string;
  heroId: string | null;
  ready: boolean;
  connected: boolean;
}

export interface RoomView {
  code: string;
  mode: GameMode;
  hostId: string;
  seats: Seat[];
  /** Null until the host starts the game. */
  started: boolean;
}

/* ------------------------------------------------------------------ */
/* Client -> server                                                     */
/* ------------------------------------------------------------------ */

export type ClientMessage =
  | { t: 'create'; name: string; mode: GameMode }
  | { t: 'join'; code: string; name: string }
  /** Reconnect to a seat after a dropped socket. */
  | { t: 'resume'; code: string; playerId: string }
  | { t: 'pickHero'; heroId: string }
  | { t: 'ready'; ready: boolean }
  | { t: 'setMode'; mode: GameMode }
  | { t: 'start' }
  | { t: 'action'; action: Action }
  | { t: 'leave' };

/* ------------------------------------------------------------------ */
/* Server -> client                                                     */
/* ------------------------------------------------------------------ */

export type ServerMessage =
  /** Sent once on join; the client stores `playerId` to resume later. */
  | { t: 'welcome'; playerId: string; room: RoomView }
  | { t: 'room'; room: RoomView }
  /** The authoritative state, already redacted for this client. */
  | { t: 'state'; state: GameState; you: number }
  | { t: 'error'; message: string };
