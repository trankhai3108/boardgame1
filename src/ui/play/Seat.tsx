import { useMemo } from 'react';
import { HERO_LIST, HEROES } from '../../data/heroes';
import { findStatus } from '../../data/statusEffects';
import { bestAbilities } from '../../engine/combos';
import { healthOf, statusCount, teamOf, type GameState } from '../../engine/state';
import { behaviourOf } from '../../engine/statusBehaviour';
import type { Ability, Hero } from '../../engine/types';
import { useI18n } from '../../i18n/useI18n';
import { K } from '../../i18n/types';
import { AbilityCard } from '../board/HeroBoard';
import { STATUS_ICONS } from '../card/iconRegistry';
import { useHitShake } from './tableFx';

/**
 * One player's side of the table: vitals down the left, the hero board in the
 * middle, tokens down the right.
 *
 * Sitting across a real table you see all three of a player's things at once
 * and never have to ask for them, so they are laid out together rather than
 * scattered around the page. Two of these stacked, with the dice between them,
 * is the whole game.
 */

/** The colour variables the ability cards and the board frame read. */
function paletteOf(hero: Hero): React.CSSProperties {
  return {
    '--dt-hero-primary': hero.palette.primary,
    '--dt-hero-accent': hero.palette.accent,
    '--dt-hero-board': hero.palette.board,
    '--dt-hero-ability-bg': hero.palette.abilityBg,
    '--dt-hero-ability-ink': hero.palette.abilityInk,
    '--dt-hero-ability-edge': hero.palette.abilityEdge,
    '--dt-hero-ultimate-bg': hero.palette.ultimateBg,
    '--dt-hero-ultimate-ink': hero.palette.ultimateInk,
    '--dt-hero-ultimate-edge': hero.palette.ultimateEdge,
  } as React.CSSProperties;
}

export function Seat({
  game,
  index,
  you,
  side,
  spendable,
  onSpend,
  hit,
  actions,
}: {
  game: GameState;
  index: number;
  /** The seat this screen belongs to, or -1 on a shared screen. */
  you: number;
  /** Which end of the table this player sits at. */
  side: 'near' | 'far';
  spendable: Set<string>;
  onSpend: (statusId: string) => void;
  /** Damage this seat just took, which the board flinches from. */
  hit: number | null;
  /** The buttons this player has to press, drawn under their own board. */
  actions?: React.ReactNode;
}) {
  const player = game.players[index];
  const hero = HEROES[player.heroId];
  const active = game.active === index;
  const targeted = game.attack?.defender === index;
  const out = healthOf(game, index) <= 0;
  const shake = useHitShake(hit);

  // Only the seat actually holding the dice gets its combos marked.
  const live = useMemo(() => {
    if (!game.roll || game.roll.playerIndex !== index) return new Set<string>();
    return new Set(bestAbilities(hero, game.roll.dice).map((m) => `${m.ability.id}:${m.tierIndex}`));
  }, [game.roll, hero, index]);

  const classes = [
    'seat',
    `seat--${side}`,
    active ? 'seat--active' : '',
    targeted ? 'seat--targeted' : '',
    out ? 'seat--out' : '',
    you === index ? 'seat--you' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section
      ref={shake as React.Ref<HTMLElement>}
      className={classes}
      style={paletteOf(hero)}
      data-seat={index}
    >
      <Vitals game={game} index={index} you={you} />
      <div className="seat__middle">
        {/* Only the board scrolls. The buttons are the one thing that must
            never be out of reach when it is your turn. */}
        <div className="seat__board">
          <HeroBoard hero={hero} game={game} index={index} live={live} />
        </div>
        {actions}
      </div>
      <TokenRail game={game} index={index} spendable={spendable} onSpend={onSpend} />
    </section>
  );
}

/** Health, CP and hand size, down the left edge — the player's dials. */
function Vitals({ game, index, you }: { game: GameState; index: number; you: number }) {
  const { t } = useI18n();
  const player = game.players[index];
  const hero = HEROES[player.heroId];
  const team = teamOf(game, index);
  const health = healthOf(game, index);
  const pct = Math.max(0, Math.min(100, (health / team.maxHealth) * 100));

  return (
    <div className="vitals">
      <div className="vitals__who">
        {hero.portrait ? <img className="vitals__avatar" src={hero.portrait} alt="" /> : null}
        <span className="vitals__name">{player.name}</span>
        {you === index ? <span className="vitals__tag">{t('ui.play.you')}</span> : null}
        {player.isBot ? <span className="vitals__tag">{t('ui.play.bot')}</span> : null}
      </div>

      <div className="vitals__hp">
        <div className="vitals__hp-track">
          <div className="vitals__hp-fill" style={{ height: `${pct}%` }} />
        </div>
        <div className="vitals__hp-read">
          <b>{health}</b>
          <span>{t('ui.play.health')}</span>
        </div>
      </div>

      <div className="vitals__dials">
        <div className="vitals__dial">
          <b>{player.cp}</b>
          <span>{t('ui.play.cp')}</span>
        </div>
        <div className="vitals__dial">
          <b>{player.hand.length}</b>
          <span>{t('ui.play.cards')}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * The folding hero board: four ability slots either side of the portrait, with
 * the ultimate across the bottom. Every Season 1 hero has exactly that.
 */
function HeroBoard({
  hero,
  game,
  index,
  live,
}: {
  hero: Hero;
  game: GameState;
  index: number;
  live: Set<string>;
}) {
  const { t } = useI18n();
  const player = game.players[index];
  const ultimate = hero.abilities.find((a) => a.ultimate);
  const rest = hero.abilities.filter((a) => !a.ultimate);
  const half = Math.ceil(rest.length / 2);

  const isLive = (ability: Ability) =>
    ability.tiers.some((_tier, i) => live.has(`${ability.id}:${i}`));

  const slot = (ability: Ability) => (
    <div
      key={ability.id}
      className={`board__slot${isLive(ability) ? ' board__slot--live' : ''}`}
      data-ability={ability.id}
    >
      {/* No width is passed: the stylesheet sizes every slot from the height
          the table has to spare, so the board fits the screen it is on. */}
      <AbilityCard ability={ability} heroId={hero.id} />
      <span className="board__level">{player.abilityLevels[ability.id] ?? ability.level}</span>
      {isLive(ability) ? <span className="board__ready">{t('ui.play.ready')}</span> : null}
    </div>
  );

  return (
    <div className="board">
      <div className="board__wing">{rest.slice(0, half).map(slot)}</div>

      <div className="board__centre">
        {hero.portrait ? <img className="board__portrait" src={hero.portrait} alt="" /> : null}
        <h3 className="board__hero">{t(K.hero(hero.id, 'name'), hero.name)}</h3>
      </div>

      <div className="board__wing">{rest.slice(half).map(slot)}</div>

      {ultimate ? <div className="board__ult">{slot(ultimate)}</div> : null}
    </div>
  );
}

/**
 * Every token this hero can hold, down the right edge.
 *
 * The empty slots stay on show: the board is a reminder of what is available,
 * and a token that can be spent right now is a button.
 */
function TokenRail({
  game,
  index,
  spendable,
  onSpend,
}: {
  game: GameState;
  index: number;
  spendable: Set<string>;
  onSpend: (statusId: string) => void;
}) {
  const { t } = useI18n();
  const player = game.players[index];
  const hero = HEROES[player.heroId];

  // The hero's own tokens first, then anything an opponent has put on them.
  const ids = [
    ...hero.statusEffects.map((s) => s.id),
    ...Object.keys(player.statuses).filter(
      (id) => !hero.statusEffects.some((s) => s.id === id) && player.statuses[id] > 0,
    ),
  ];

  return (
    <div className="rail">
      <span className="rail__title">{t('ui.play.tokenBoard')}</span>
      {ids.map((statusId) => {
        const def = findStatus(statusId, HERO_LIST);
        const count = statusCount(player, statusId);
        const Icon = STATUS_ICONS[statusId];
        const canSpend = spendable.has(statusId);
        const summary = def?.summary ?? behaviourOf(statusId).manual ?? '';

        return (
          <button
            key={statusId}
            type="button"
            className={[
              'rail__token',
              count > 0 ? 'rail__token--held' : 'rail__token--empty',
              canSpend ? 'rail__token--spendable' : '',
              def ? `rail__token--${def.polarity}` : '',
            ]
              .filter(Boolean)
              .join(' ')}
            disabled={!canSpend}
            onClick={() => onSpend(statusId)}
            data-token={statusId}
            data-tip={`${t(K.statusName(statusId), def?.name ?? statusId)} — ${t(
              K.statusText(statusId),
              def?.text ?? summary,
            )}`}
          >
            {Icon ? <Icon /> : null}
            <span className="rail__token-name">
              {t(K.statusName(statusId), def?.name ?? statusId)}
            </span>
            <span className="rail__token-count">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
