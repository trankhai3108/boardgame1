import { Room } from './room';

export { Room };

export interface Env {
  ROOM: DurableObjectNamespace;
  ASSETS: Fetcher;
}

/** No 0/O or 1/I, so a code survives being read aloud. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

function roomStub(env: Env, code: string): DurableObjectStub {
  return env.ROOM.get(env.ROOM.idFromName(code.toUpperCase()));
}

/** Finds a code no live room is using. */
async function allocateCode(env: Env): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = randomCode();
    const probe = await roomStub(env, code).fetch('https://room/exists');
    const { exists } = (await probe.json()) as { exists: boolean };
    if (!exists) return code;
  }
  throw new Error('Could not allocate a room code');
}

/**
 * The site is normally served by this same Worker, so requests are same-origin.
 * These headers only matter when the client is hosted elsewhere and pointed
 * here with VITE_SERVER_URL.
 */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/') && request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (url.pathname === '/api/new') {
      try {
        return Response.json({ code: await allocateCode(env) }, { headers: CORS });
      } catch (err) {
        return Response.json(
          { error: err instanceof Error ? err.message : String(err) },
          { status: 503, headers: CORS },
        );
      }
    }

    if (url.pathname === '/ws') {
      const code = url.searchParams.get('code');
      if (!code) return new Response('Missing room code', { status: 400 });
      return roomStub(env, code).fetch(request);
    }

    // Everything else is the built site.
    return env.ASSETS.fetch(request);
  },
};
