import { HEROES } from '../src/data/heroes';
import type { Action } from '../src/engine/actions';
import { canAct, redactFor } from '../src/engine/authority';
import { reduce, type HeroLookup } from '../src/engine/reducer';
import {
  MODES,
  createGame,
  playerCountFor,
  type GameMode,
  type GameState,
} from '../src/engine/state';
import type { ClientMessage, RoomView, Seat, ServerMessage } from '../server/protocol';

const lookup: HeroLookup = (id) => HEROES[id];

interface Stored {
  code: string;
  mode: GameMode;
  hostId: string;
  seats: Seat[];
  game: GameState | null;
}

function maxSeats(mode: GameMode): number {
  return mode === 'koth' ? 5 : playerCountFor(mode);
}

function minSeats(mode: GameMode): number {
  return mode === 'koth' ? 3 : playerCountFor(mode);
}

/**
 * One room, one Durable Object.
 *
 * The object is the single source of truth for its room: every websocket for
 * that code lands here, so actions serialise naturally and there is nowhere
 * else for the state to diverge.
 */
export class Room implements DurableObject {
  private state: DurableObjectState;
  private room: Stored | null = null;
  /** Which seat each open socket belongs to. */
  private sockets = new Map<WebSocket, string>();

  constructor(state: DurableObjectState) {
    this.state = state;
    // Restore after an eviction so a room survives being idle.
    state.blockConcurrencyWhile(async () => {
      this.room = (await state.storage.get<Stored>('room')) ?? null;
    });
  }

  private async persist(): Promise<void> {
    if (this.room) await this.state.storage.put('room', this.room);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // The Worker probes this when allocating a fresh code.
    if (url.pathname.endsWith('/exists')) {
      return Response.json({ exists: this.room !== null });
    }

    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected a websocket', { status: 426 });
    }

    const code = url.searchParams.get('code')?.toUpperCase() ?? '';
    if (!code) return new Response('Missing room code', { status: 400 });

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.accept();
    this.attach(server, code);
    return new Response(null, { status: 101, webSocket: client });
  }

  private send(socket: WebSocket, message: ServerMessage): void {
    try {
      socket.send(JSON.stringify(message));
    } catch {
      // The socket closed under us; the close handler will clean it up.
    }
  }

  private broadcast(): void {
    if (!this.room) return;
    const view = this.view();
    for (const [socket, playerId] of this.sockets) {
      this.send(socket, { t: 'room', room: view });
      if (!this.room.game) continue;
      const you = this.room.game.players.findIndex((p) => p.id === playerId);
      this.send(socket, {
        t: 'state',
        state: redactFor(this.room.game, you >= 0 ? you : null),
        you,
      });
    }
  }

  private view(): RoomView {
    const room = this.room!;
    return {
      code: room.code,
      mode: room.mode,
      hostId: room.hostId,
      seats: room.seats,
      started: room.game !== null,
    };
  }

  private attach(socket: WebSocket, code: string): void {
    socket.addEventListener('message', async (event) => {
      let message: ClientMessage;
      try {
        message = JSON.parse(String(event.data)) as ClientMessage;
      } catch {
        this.send(socket, { t: 'error', message: 'Malformed message' });
        return;
      }
      try {
        await this.handle(socket, code, message);
      } catch (err) {
        // A rejected action is normal — someone clicked out of turn. Keep the
        // socket open and let the client say why.
        this.send(socket, {
          t: 'error',
          message: err instanceof Error ? err.message : String(err),
        });
      }
    });

    socket.addEventListener('close', async () => {
      const playerId = this.sockets.get(socket);
      this.sockets.delete(socket);
      if (!playerId || !this.room) return;
      const seat = this.room.seats.find((s) => s.playerId === playerId);
      if (seat) seat.connected = false;
      // Before the game starts a seat is disposable; afterwards it must stay so
      // the player can come back to a game that is mid-flight.
      if (!this.room.game) {
        this.room.seats = this.room.seats.filter((s) => s.playerId !== playerId);
        if (this.room.seats.length === 0) {
          this.room = null;
          await this.state.storage.deleteAll();
          return;
        }
        if (this.room.hostId === playerId) this.room.hostId = this.room.seats[0].playerId;
      }
      await this.persist();
      this.broadcast();
    });
  }

  private async handle(socket: WebSocket, code: string, message: ClientMessage): Promise<void> {
    switch (message.t) {
      case 'create': {
        if (this.room) throw new Error('That code is taken');
        const playerId = crypto.randomUUID();
        this.room = {
          code,
          mode: message.mode,
          hostId: playerId,
          seats: [{ playerId, name: message.name, heroId: null, ready: false, connected: true }],
          game: null,
        };
        this.sockets.set(socket, playerId);
        await this.persist();
        this.send(socket, { t: 'welcome', playerId, room: this.view() });
        return;
      }

      case 'join': {
        if (!this.room) throw new Error('No room with that code');
        if (this.room.game) throw new Error('That game has already started');
        if (this.room.seats.length >= maxSeats(this.room.mode)) throw new Error('That room is full');
        const playerId = crypto.randomUUID();
        this.room.seats.push({
          playerId,
          name: message.name,
          heroId: null,
          ready: false,
          connected: true,
        });
        this.sockets.set(socket, playerId);
        await this.persist();
        this.send(socket, { t: 'welcome', playerId, room: this.view() });
        this.broadcast();
        return;
      }

      case 'resume': {
        if (!this.room) throw new Error('No room with that code');
        const seat = this.room.seats.find((s) => s.playerId === message.playerId);
        if (!seat) throw new Error('That seat is gone');
        seat.connected = true;
        this.sockets.set(socket, message.playerId);
        await this.persist();
        this.send(socket, { t: 'welcome', playerId: message.playerId, room: this.view() });
        this.broadcast();
        return;
      }
    }

    const room = this.room;
    const playerId = this.sockets.get(socket);
    if (!room || !playerId) throw new Error('Join a room first');

    switch (message.t) {
      case 'pickHero': {
        if (room.game) throw new Error('The game has started');
        const seat = room.seats.find((s) => s.playerId === playerId);
        if (!seat) throw new Error('You have no seat');
        seat.heroId = message.heroId;
        break;
      }

      case 'ready': {
        const seat = room.seats.find((s) => s.playerId === playerId);
        if (seat) seat.ready = message.ready;
        break;
      }

      case 'setMode': {
        if (room.hostId !== playerId) throw new Error('Only the host can change the mode');
        if (room.game) throw new Error('The game has started');
        if (room.seats.length > maxSeats(message.mode)) {
          throw new Error('Too many players in the room for that mode');
        }
        room.mode = message.mode;
        break;
      }

      case 'start': {
        if (room.hostId !== playerId) throw new Error('Only the host can start');
        if (room.game) throw new Error('Already started');
        const count = room.seats.length;
        if (count < minSeats(room.mode)) {
          throw new Error(`${MODES[room.mode].label} needs at least ${minSeats(room.mode)} players`);
        }
        if (room.mode !== 'koth' && count !== playerCountFor(room.mode)) {
          throw new Error(
            `${MODES[room.mode].label} needs exactly ${playerCountFor(room.mode)} players`,
          );
        }
        const missing = room.seats.find((s) => !s.heroId);
        if (missing) throw new Error(`${missing.name} has not picked a hero`);

        room.game = createGame(
          room.seats.map((s) => ({ id: s.playerId, name: s.name, hero: HEROES[s.heroId!] })),
          { mode: room.mode, seed: Math.floor(Math.random() * 2 ** 31) },
        );
        break;
      }

      case 'action': {
        if (!room.game) throw new Error('The game has not started');
        const index = room.game.players.findIndex((p) => p.id === playerId);
        if (index < 0) throw new Error('You are not in this game');
        if (!canAct(room.game, index, message.action as Action)) throw new Error('Not your move');
        room.game = reduce(room.game, message.action as Action, lookup);
        break;
      }

      case 'leave': {
        this.sockets.delete(socket);
        room.seats = room.seats.filter((s) => s.playerId !== playerId);
        if (room.seats.length === 0) {
          this.room = null;
          await this.state.storage.deleteAll();
          return;
        }
        if (room.hostId === playerId) room.hostId = room.seats[0].playerId;
        break;
      }
    }

    await this.persist();
    this.broadcast();
  }
}
