import { useEffect, useState } from 'react';
import { EMPTY_NET, gameClient, type NetState } from './client';

/** Subscribes to the shared game client. */
export function useRoom(): NetState & { client: typeof gameClient } {
  const [state, setState] = useState<NetState>(EMPTY_NET);
  useEffect(() => gameClient.subscribe(setState), []);
  return { ...state, client: gameClient };
}
