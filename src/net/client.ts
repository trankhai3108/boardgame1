import type { Action } from '../engine/actions';
import type { GameMode, GameState } from '../engine/state';
import type { ClientMessage, RoomView, ServerMessage } from '../../server/protocol';

export type ConnectionStatus = 'idle' | 'connecting' | 'open' | 'closed';

export interface NetState {
  status: ConnectionStatus;
  room: RoomView | null;
  game: GameState | null;
  /** Index of this client in `game.players`, or -1 when spectating. */
  you: number;
  playerId: string | null;
  error: string | null;
}

export const EMPTY_NET: NetState = {
  status: 'idle',
  room: null,
  game: null,
  you: -1,
  playerId: null,
  error: null,
};

const STORAGE_KEY = 'dicethrone.session';

interface StoredSession {
  code: string;
  playerId: string;
}

export function loadSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

function saveSession(session: StoredSession | null): void {
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Losing the ability to resume is not worth failing over.
  }
}

/**
 * Where the game server lives.
 *
 * Always the page's own origin: in production one Worker serves both the site
 * and the socket, and in dev Vite proxies `/api` and `/ws` through to
 * `wrangler dev`. `VITE_SERVER_URL` is only for hosting the client somewhere
 * other than the Worker.
 */
export function apiBase(): string {
  const configured = import.meta.env.VITE_SERVER_URL;
  return configured ? configured.replace(/\/$/, '') : location.origin;
}

export function serverUrl(code?: string): string {
  const base = apiBase().replace(/^http/, 'ws');
  return code ? `${base}/ws?code=${encodeURIComponent(code)}` : `${base}/ws`;
}

/**
 * A thin websocket wrapper. It owns no game rules: the server is authoritative
 * and this only relays actions and applies whatever state comes back.
 */
export class GameClient {
  private socket: WebSocket | null = null;
  private state: NetState = { ...EMPTY_NET };
  private listeners = new Set<(s: NetState) => void>();
  /** Queued while the socket is still opening. */
  private pending: ClientMessage[] = [];
  /** The room this socket is bound to; each room has its own connection. */
  private code: string | null = null;

  subscribe(fn: (s: NetState) => void): () => void {
    this.listeners.add(fn);
    fn(this.state);
    return () => this.listeners.delete(fn);
  }

  private set(patch: Partial<NetState>): void {
    this.state = { ...this.state, ...patch };
    for (const fn of this.listeners) fn(this.state);
  }

  getState(): NetState {
    return this.state;
  }

  /** Opens (or reuses) the socket for a room code. */
  private connect(code: string): void {
    if (this.code === code && this.socket && this.socket.readyState <= WebSocket.OPEN) return;
    this.socket?.close();
    this.code = code;
    this.set({ status: 'connecting', error: null });

    const socket = new WebSocket(serverUrl(code));
    this.socket = socket;

    socket.onopen = () => {
      this.set({ status: 'open' });
      const queued = this.pending;
      this.pending = [];
      for (const message of queued) socket.send(JSON.stringify(message));
    };

    socket.onclose = () => {
      this.set({ status: 'closed' });
    };

    socket.onerror = () => {
      this.set({ error: `Cannot reach the server at ${apiBase()}` });
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(String(event.data)) as ServerMessage;
      switch (message.t) {
        case 'welcome':
          saveSession({ code: message.room.code, playerId: message.playerId });
          this.set({ playerId: message.playerId, room: message.room, error: null });
          break;
        case 'room':
          this.set({ room: message.room });
          break;
        case 'state':
          this.set({ game: message.state, you: message.you });
          break;
        case 'error':
          this.set({ error: message.message });
          break;
      }
    };
  }

  private send(message: ClientMessage): void {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(message));
    else this.pending.push(message);
  }

  /** Asks the server for a free room code, then opens that room. */
  async create(name: string, mode: GameMode): Promise<void> {
    this.set({ status: 'connecting', error: null });
    try {
      const response = await fetch(`${apiBase()}/api/new`);
      if (!response.ok) throw new Error('The server would not allocate a room');
      const { code } = (await response.json()) as { code: string };
      this.connect(code);
      this.send({ t: 'create', name, mode });
    } catch (err) {
      this.set({
        status: 'closed',
        error: err instanceof Error ? err.message : `Cannot reach the server at ${apiBase()}`,
      });
    }
  }

  join(code: string, name: string): void {
    const upper = code.toUpperCase();
    this.connect(upper);
    this.send({ t: 'join', code: upper, name });
  }

  resume(code: string, playerId: string): void {
    this.connect(code);
    this.send({ t: 'resume', code, playerId });
  }

  pickHero(heroId: string): void {
    this.send({ t: 'pickHero', heroId });
  }

  setMode(mode: GameMode): void {
    this.send({ t: 'setMode', mode });
  }

  start(): void {
    this.send({ t: 'start' });
  }

  act(action: Action): void {
    this.send({ t: 'action', action });
  }

  leave(): void {
    this.send({ t: 'leave' });
    saveSession(null);
    this.socket?.close();
    this.socket = null;
    this.code = null;
    this.set({ ...EMPTY_NET, status: 'idle' });
  }

  clearError(): void {
    this.set({ error: null });
  }
}

export const gameClient = new GameClient();
