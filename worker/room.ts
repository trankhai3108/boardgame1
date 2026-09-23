import { HEROES, HERO_LIST } from '../src/data/heroes';
import type { Action } from '../src/engine/actions';
import { canAct, redactFor } from '../src/engine/authority';
import { runBots } from '../src/engine/bot';
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
 *
 * Sockets are accepted through the hibernation API, so the object can be
 * evicted between turns while the connections stay open. That means no state
 * may live in instance fields: the room is read from storage, and each
 * socket's seat travels with the socket as its attachment.
 */
export class Room implements DurableObject {
  private state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
    // A ping never needs the object awake, so let the runtime answer it.
    state.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  private async load(): Promise<Stored | null> {
    return (await this.state.storage.get<Stored>('room')) ?? null;
  }

  private async save(room: Stored | null): Promise<void> {
    if (room) await this.state.storage.put('room', room);
    else await this.state.storage.deleteAll();
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // The Worker probes this when allocating a fresh code.
    if (url.pathname.endsWith('/exists')) {
      return Response.json({ exists: (await this.load()) !== null });
    }

    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected a websocket', { status: 426 });
    }

    const code = url.searchParams.get('code')?.toUpperCase() ?? '';
    if (!code) return new Response('Missing room code', { status: 400 });

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    // The room code is a tag so it survives hibernation with the socket.
    this.state.acceptWebSocket(server, [code]);
    return new Response(null, { status: 101, webSocket: client });
  }

  /* --- hibernation handlers ------------------------------------------- */

  async webSocketMessage(socket: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    let message: ClientMessage;
    try {
      message = JSON.parse(String(raw)) as ClientMessage;
    } catch {
      this.send(socket, { t: 'error', message: 'Malformed message' });
      return;
    }
    try {
      await this.handle(socket, message);
    } catch (err) {
      // A rejected action is normal — someone clicked out of turn. Keep the
      // socket open and let the client say why.
      this.send(socket, {
        t: 'error',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async webSocketClose(socket: WebSocket): Promise<void> {
    await this.dropSocket(socket);
  }

  async webSocketError(socket: WebSocket): Promise<void> {
    await this.dropSocket(socket);
  }

  /* --- helpers --------------------------------------------------------- */

  /** The seat a socket belongs to, carried on the socket itself. */
  private seatIdOf(socket: WebSocket): string | null {
    const attached = socket.deserializeAttachment() as { playerId?: string } | null;
    return attached?.playerId ?? null;
  }

  private bind(socket: WebSocket, playerId: string): void {
    socket.serializeAttachment({ playerId });
  }

  private send(socket: WebSocket, message: ServerMessage): void {
    try {
      socket.send(JSON.stringify(message));
    } catch {
      // The socket closed under us; webSocketClose will clean it up.
    }
  }

  private view(room: Stored): RoomView {
    return {
      code: room.code,
      mode: room.mode,
      hostId: room.hostId,
      seats: room.seats,
      started: room.game !== null,
    };
  }

  private broadcast(room: Stored): void {
    const view = this.view(room);
    for (const socket of this.state.getWebSockets()) {
      const playerId = this.seatIdOf(socket);
      if (!playerId) continue;
      this.send(socket, { t: 'room', room: view });
      if (!room.game) continue;
      const you = room.game.players.findIndex((p) => p.id === playerId);
      this.send(socket, {
        t: 'state',
        state: redactFor(room.game, you >= 0 ? you : null),
        you,
      });
    }
  }

  /** True while another live socket still holds this seat. */
  private stillConnected(playerId: string, except: WebSocket): boolean {
    return this.state
      .getWebSockets()
      .some((s) => s !== except && this.seatIdOf(s) === playerId);
  }

  private async dropSocket(socket: WebSocket): Promise<void> {
    const playerId = this.seatIdOf(socket);
    const room = await this.load();
    if (!playerId || !room) return;
    // A reconnect opens the new socket before the old one closes, so only mark
    // a seat away when nothing else is holding it.
    if (this.stillConnected(playerId, socket)) return;

    const seat = room.seats.find((s) => s.playerId === playerId);
    if (seat && !seat.isBot) seat.connected = false;

    // Before the game starts a seat is disposable; afterwards it must stay so
    // the player can come back to a game that is mid-flight.
    if (!room.game) {
      room.seats = room.seats.filter((s) => s.playerId !== playerId);
      if (room.seats.length === 0) {
        await this.save(null);
        return;
      }
      if (room.hostId === playerId) room.hostId = room.seats[0].playerId;
    }
    await this.save(room);
    this.broadcast(room);
  }

  /* --- protocol -------------------------------------------------------- */

  private async handle(socket: WebSocket, message: ClientMessage): Promise<void> {
    let room = await this.load();
    const code = (this.state.getTags(socket)[0] ?? '').toUpperCase();

    switch (message.t) {
      case 'create': {
        if (room) throw new Error('That code is taken');
        const playerId = crypto.randomUUID();
        room = {
          code,
          mode: message.mode,
          hostId: playerId,
          seats: [{ playerId, name: message.name, heroId: null, ready: false, connected: true }],
          game: null,
        };
        this.bind(socket, playerId);
        await this.save(room);
        this.send(socket, { t: 'welcome', playerId, room: this.view(room) });
        return;
      }

      case 'join': {
        if (!room) throw new Error('No room with that code');
        if (room.game) throw new Error('That game has already started');
        if (room.seats.length >= maxSeats(room.mode)) throw new Error('That room is full');
        const playerId = crypto.randomUUID();
        room.seats.push({
          playerId,
          name: message.name,
          heroId: null,
          ready: false,
          connected: true,
        });
        this.bind(socket, playerId);
        await this.save(room);
        this.send(socket, { t: 'welcome', playerId, room: this.view(room) });
        this.broadcast(room);
        return;
      }

      case 'resume': {
        if (!room) throw new Error('No room with that code');
        const seat = room.seats.find((s) => s.playerId === message.playerId);
        if (!seat) throw new Error('That seat is gone');
        seat.connected = true;
        this.bind(socket, message.playerId);
        await this.save(room);
        this.send(socket, { t: 'welcome', playerId: message.playerId, room: this.view(room) });
        this.broadcast(room);
        return;
      }
    }

    const playerId = this.seatIdOf(socket);
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

      case 'addBot': {
        if (room.hostId !== playerId) throw new Error('Only the host can add bots');
        if (room.game) throw new Error('The game has started');
        if (room.seats.length >= maxSeats(room.mode)) throw new Error('That room is full');
        const taken = new Set(room.seats.map((s) => s.heroId));
        const hero = HERO_LIST.find((h) => !taken.has(h.id)) ?? HERO_LIST[0];
        const botNumber = room.seats.filter((s) => s.isBot).length + 1;
        room.seats.push({
          playerId: crypto.randomUUID(),
          name: `Bot ${botNumber}`,
          heroId: hero.id,
          ready: true,
          connected: true,
          isBot: true,
        });
        break;
      }

      case 'removeBot': {
        if (room.hostId !== playerId) throw new Error('Only the host can remove bots');
        if (room.game) throw new Error('The game has started');
        room.seats = room.seats.filter((s) => !(s.playerId === message.playerId && s.isBot));
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
          room.seats.map((s) => ({
            id: s.playerId,
            name: s.name,
            hero: HEROES[s.heroId!],
            isBot: s.isBot ?? false,
          })),
          { mode: room.mode, seed: Math.floor(Math.random() * 2 ** 31) },
        );
        room.game = runBots(room.game, lookup, (g, a) => reduce(g, a, lookup));
        break;
      }

      case 'action': {
        if (!room.game) throw new Error('The game has not started');
        const index = room.game.players.findIndex((p) => p.id === playerId);
        if (index < 0) throw new Error('You are not in this game');
        if (!canAct(room.game, index, message.action as Action)) throw new Error('Not your move');
        room.game = reduce(room.game, message.action as Action, lookup);
        // Let every bot seat take its turn before handing control back.
        room.game = runBots(room.game, lookup, (g, a) => reduce(g, a, lookup));
        break;
      }

      case 'leave': {
        room.seats = room.seats.filter((s) => s.playerId !== playerId);
        socket.serializeAttachment(null);
        if (room.seats.length === 0) {
          await this.save(null);
          return;
        }
        if (room.hostId === playerId) room.hostId = room.seats[0].playerId;
        break;
      }
    }

    await this.save(room);
    this.broadcast(room);
  }
}
