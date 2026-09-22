import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** A WebSocket stand-in the tests can open, close and inspect. */
class FakeSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;
  static instances: FakeSocket[] = [];

  readyState = FakeSocket.CONNECTING;
  url: string;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    FakeSocket.instances.push(this);
  }

  open(): void {
    this.readyState = FakeSocket.OPEN;
    this.onopen?.();
  }

  /** Simulates the connection dropping from the far end. */
  drop(): void {
    this.readyState = FakeSocket.CLOSED;
    this.onclose?.();
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    if (this.readyState === FakeSocket.CLOSED) return;
    this.readyState = FakeSocket.CLOSED;
    this.onclose?.();
  }

  deliver(message: unknown): void {
    this.onmessage?.({ data: typeof message === 'string' ? message : JSON.stringify(message) });
  }
}

const store = new Map<string, string>();

beforeEach(() => {
  vi.useFakeTimers();
  FakeSocket.instances = [];
  store.clear();
  vi.stubGlobal('WebSocket', FakeSocket);
  vi.stubGlobal('location', { origin: 'http://test', protocol: 'http:', hostname: 'test' });
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ code: 'ABCD' }) })));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.resetModules();
});

async function freshClient() {
  const { GameClient } = await import('../client');
  return new GameClient();
}

const gameSockets = () => FakeSocket.instances.filter((s) => s.url.includes('/ws'));

describe('GameClient connection', () => {
  it('opens one socket for the room and reports it open', async () => {
    const client = await freshClient();
    client.join('ABCD', 'Alice');
    expect(gameSockets()).toHaveLength(1);
    expect(client.getState().status).toBe('connecting');

    gameSockets()[0].open();
    expect(client.getState().status).toBe('open');
    expect(gameSockets()[0].sent).toContainEqual(
      JSON.stringify({ t: 'join', code: 'ABCD', name: 'Alice' }),
    );
  });

  it('queues messages sent before the socket opens', async () => {
    const client = await freshClient();
    client.join('ABCD', 'Alice');
    const socket = gameSockets()[0];
    expect(socket.sent).toHaveLength(0);
    socket.open();
    expect(socket.sent).toHaveLength(1);
  });

  it('pings while idle so the connection is not dropped for silence', async () => {
    const client = await freshClient();
    client.join('ABCD', 'Alice');
    const socket = gameSockets()[0];
    socket.open();
    socket.sent.length = 0;

    await vi.advanceTimersByTimeAsync(26_000);
    expect(socket.sent).toContain('ping');
    void client;
  });

  it('ignores the pong that comes back', async () => {
    const client = await freshClient();
    client.join('ABCD', 'Alice');
    const socket = gameSockets()[0];
    socket.open();
    expect(() => socket.deliver('pong')).not.toThrow();
    expect(client.getState().error).toBeNull();
  });

  it('reconnects after the connection drops', async () => {
    const client = await freshClient();
    client.join('ABCD', 'Alice');
    const first = gameSockets()[0];
    first.open();
    first.deliver({ t: 'welcome', playerId: 'p1', room: { code: 'ABCD', seats: [] } });

    first.drop();
    expect(client.getState().status).toBe('reconnecting');

    await vi.advanceTimersByTimeAsync(600);
    expect(gameSockets()).toHaveLength(2);

    const second = gameSockets()[1];
    second.open();
    expect(client.getState().status).toBe('open');
    // It must walk back into the seat it already held.
    expect(second.sent.some((m) => m.includes('"t":"resume"') && m.includes('p1'))).toBe(true);
  });

  it('backs off between repeated failures', async () => {
    const client = await freshClient();
    client.join('ABCD', 'Alice');
    gameSockets()[0].open();
    gameSockets()[0].drop();

    await vi.advanceTimersByTimeAsync(600);
    expect(gameSockets()).toHaveLength(2);
    gameSockets()[1].drop();

    // The second wait is longer than the first, so a dead server is not hammered.
    await vi.advanceTimersByTimeAsync(600);
    expect(gameSockets()).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(600);
    expect(gameSockets()).toHaveLength(3);
    void client;
  });

  it('does not reconnect after the player leaves', async () => {
    const client = await freshClient();
    client.join('ABCD', 'Alice');
    const socket = gameSockets()[0];
    socket.open();

    client.leave();
    await vi.advanceTimersByTimeAsync(20_000);
    expect(gameSockets()).toHaveLength(1);
    // Leaving is deliberate, so the client goes back to idle rather than
    // reporting a broken connection.
    expect(client.getState().status).toBe('idle');
    expect(client.getState().room).toBeNull();
  });

  it('stops pinging once the socket is gone', async () => {
    const client = await freshClient();
    client.join('ABCD', 'Alice');
    const socket = gameSockets()[0];
    socket.open();
    socket.drop();
    socket.sent.length = 0;

    await vi.advanceTimersByTimeAsync(60_000);
    expect(socket.sent).not.toContain('ping');
    void client;
  });
});
