import { useEffect, useRef, useState } from 'react';
import { HEROES } from '../../data/heroes';
import type { GameState, TableEvent } from '../../engine/state';
import { useI18n } from '../../i18n/useI18n';
import { K } from '../../i18n/types';
import { CardView } from '../card/Card';
import { STATUS_ICONS } from '../card/iconRegistry';

/**
 * What just happened, played over the table.
 *
 * Across a real table you see the card leave someone's hand and land face up
 * in the middle; you see them push a token forward and you see the health dial
 * click down. On a screen all of that is a silent number change, so the table
 * replays each one for long enough to be read.
 *
 * The engine says what happened in `state.events`, so nothing here has to
 * guess from a diff or parse the log.
 */

/** How long each kind stays on screen, in ms. Must match table.css. */
const LIFE = { card: 1700, spend: 1100, damage: 1200, heal: 1200 } as const;

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

/**
 * Draws the effects over the table.
 *
 * `seatSide` says which end of the table a seat sits at, so a number floats up
 * from the player it belongs to rather than from the middle.
 */
export function TableFx({
  game,
  fx,
  seatSide,
}: {
  game: GameState;
  fx: Fx[];
  seatSide: (player: number) => 'near' | 'far' | null;
}) {
  return (
    <div className="fx" aria-hidden="true">
      {fx.map((item) => (
        <FxItem key={item.id} game={game} fx={item} seatSide={seatSide} />
      ))}
    </div>
  );
}

function FxItem({
  game,
  fx,
  seatSide,
}: {
  game: GameState;
  fx: Fx;
  seatSide: (player: number) => 'near' | 'far' | null;
}) {
  const { t } = useI18n();
  const { event } = fx;
  const delay = { animationDelay: `${fx.order * 180}ms` };

  if (event.kind === 'card') {
    const player = game.players[event.player];
    const card = HEROES[player.heroId].cards.find((c) => c.id === event.cardId);
    if (!card) return null;
    const from = seatSide(event.player) ?? 'near';
    return (
      <div className={`fx-card fx-card--from-${from}`} style={delay}>
        <CardView card={card} width={260} />
        <span className="fx-card__who">{player.name}</span>
      </div>
    );
  }

  const side = seatSide(event.player);
  // A seat that is not on the table right now has nowhere to float from.
  if (!side) return null;

  if (event.kind === 'spend') {
    const Icon = STATUS_ICONS[event.statusId];
    return (
      <div className={`fx-spend fx-spend--${side}`} style={delay}>
        {Icon ? <Icon /> : null}
        {t(K.statusName(event.statusId), event.statusId)}
      </div>
    );
  }

  return (
    <div className={`fx-number fx-number--${side} fx-number--${event.kind}`} style={delay}>
      {event.kind === 'damage' ? `-${event.amount}` : `+${event.amount}`}
    </div>
  );
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
