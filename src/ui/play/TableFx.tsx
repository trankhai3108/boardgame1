import { HEROES } from '../../data/heroes';
import type { GameState } from '../../engine/state';
import { useI18n } from '../../i18n/useI18n';
import { K } from '../../i18n/types';
import { CardView } from '../card/Card';
import { STATUS_ICONS } from '../card/iconRegistry';
import type { Fx } from './tableFx';

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

  if (event.kind !== 'damage' && event.kind !== 'heal') return null;

  return (
    <div className={`fx-number fx-number--${side} fx-number--${event.kind}`} style={delay}>
      {event.kind === 'damage' ? `-${event.amount}` : `+${event.amount}`}
    </div>
  );
}

