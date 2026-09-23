import { useEffect, useRef, useState } from 'react';
import type { GameState, TableEvent } from '../../engine/state';

/**
 * What just happened, as something the table can animate.
 *
 * The engine says what happened in `state.events`; this turns a batch of those
 * into the short-lived list the overlay draws, and holds the two hooks the
 * table drives its motion from. It lives apart from the components so the
 * module exports either components or helpers, never both.
 */

/** How long each kind stays on screen, in ms. Must match table.css. */
const LIFE: Record<TableEvent['kind'], number> = {
  card: 1700,
  spend: 1100,
  damage: 1200,
  heal: 1200,
  // A roll is never drawn over the table; it tumbles the dice themselves.
  roll: 0,
};

export interface Fx {
  id: number;
  event: TableEvent;
  /** Position in its batch, so several at once are staggered rather than stacked. */
  order: number;
}

/**
 * One batch of events, reduced to what is worth watching.
 *
 * A bot's whole turn arrives as a single state, so a batch can hold a dozen
 * events. Showing them all would be a mess: only the last card matters, and
 * the damage a player took is more legible as one number than as four.
 */
function condense(events: readonly TableEvent[]): TableEvent[] {
  const out: TableEvent[] = [];
  // A roll belongs to the dice, not to the overlay.

  const lastCard = [...events].reverse().find((e) => e.kind === 'card');
  if (lastCard) out.push(lastCard);

  for (const event of events) if (event.kind === 'spend') out.push(event);

  for (const kind of ['damage', 'heal'] as const) {
    const totals = new Map<number, number>();
    for (const event of events) {
      if (event.kind !== kind) continue;
      totals.set(event.player, (totals.get(event.player) ?? 0) + event.amount);
    }
    for (const [player, amount] of totals) {
      if (amount > 0) out.push({ kind, player, amount, type: 'normal' } as TableEvent);
    }
  }

  return out;
}

let nextId = 0;

/** The effects currently playing. */
export function useTableFx(game: GameState): Fx[] {
  const [fx, setFx] = useState<Fx[]>([]);
  // Every reduce returns a fresh object, and every state off the wire is
  // parsed fresh, so identity is a reliable "have I played this one".
  const seen = useRef<GameState | null>(null);

  /*
   * An effect, and it does set state: a new state arriving is exactly the
   * "external system" this is synchronising with, and each batch has to be
   * cleared again on a timer once it has played. There is nothing to derive
   * during render, because the same state must not replay on a re-render.
   */
  useEffect(() => {
    if (seen.current === game) return;
    seen.current = game;

    const batch = condense(game.events).map((event, order) => ({ id: nextId++, event, order }));
    if (batch.length === 0) return;

    setFx((prev) => [...prev, ...batch]);
    const ids = new Set(batch.map((f) => f.id));
    const longest = Math.max(...batch.map((f) => LIFE[f.event.kind] + f.order * 180));
    const timer = setTimeout(() => setFx((prev) => prev.filter((f) => !ids.has(f.id))), longest);
    return () => clearTimeout(timer);
  }, [game]);

  return fx;
}


/** Ids of the dice the last action actually threw. */
export function rolledDice(events: readonly TableEvent[]): Set<string> {
  const out = new Set<string>();
  for (const event of events) {
    if (event.kind === 'roll') for (const id of event.dieIds) out.add(id);
  }
  return out;
}

/**
 * Shakes a seat when it takes a hit.
 *
 * Driven from script rather than a CSS class because the same seat can be hit
 * twice in a row, and a class that is already on the element does not restart
 * its animation.
 */
export function useHitShake(hitAmount: number | null) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!hitAmount || !ref.current) return;
    // Bigger hits shake harder, up to a point.
    const reach = Math.min(10, 2 + hitAmount / 2);
    ref.current.animate(
      [
        { transform: 'translateX(0)' },
        { transform: `translateX(${-reach}px)` },
        { transform: `translateX(${reach * 0.8}px)` },
        { transform: `translateX(${-reach * 0.5}px)` },
        { transform: 'translateX(0)' },
      ],
      { duration: 380, easing: 'ease-out' },
    );
  }, [hitAmount]);

  return ref;
}
