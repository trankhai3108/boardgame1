import { useMemo } from 'react';
import { HEROES } from '../../data/heroes';
import type { Action } from '../../engine/actions';
import { bestAbilities } from '../../engine/combos';
import { healthOf, teamOf, type GameState } from '../../engine/state';
import type { Ability, Card, Hero } from '../../engine/types';
import { useI18n } from '../../i18n/useI18n';
import { K } from '../../i18n/types';
import { AbilityCard } from '../board/HeroBoard';
import { CardView } from '../card/Card';
import { STATUS_ICONS } from '../card/iconRegistry';
import type { Projection } from './projection';
import { ScenePanel } from './ScenePanel';
import { BOARD, DECK, TABLE_H, seatSpot } from './scene';

/**
 * One player's place at the table: their board, their deck, their discard.
 *
 * Everything a player reaches for in a real game is within reach here and in
 * the same arrangement — board in front of them, draw pile and discard off to
 * the side — so that a player who has played the game on a table already knows
 * where to look.
 */

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

/** What the player is currently looking at closely, if anything. */
export type Inspect =
  | { kind: 'ability'; seat: number; abilityId: string }
  | { kind: 'discard'; seat: number }
  | null;

function BoardFace({
  game,
  index,
  you,
  options,
  onInspect,
}: {
  game: GameState;
  index: number;
  you: number;
  options: Action[];
  onInspect: (what: Inspect) => void;
}) {
  const { t } = useI18n();
  const player = game.players[index];
  const hero = HEROES[player.heroId];
  const team = teamOf(game, index);
  const health = healthOf(game, index);

  // Only the seat holding the dice has combos to show.
  const live = useMemo(() => {
    if (!game.roll || game.roll.playerIndex !== index) return new Set<string>();
    return new Set(
      bestAbilities(hero, game.roll.dice, player.abilityLevels).map(
        (m) => `${m.ability.id}:${m.tierIndex}`,
      ),
    );
  }, [game.roll, index, hero, player.abilityLevels]);

  const playable = useMemo(() => {
    const ids = new Set<string>();
    for (const option of options) {
      if (option.type === 'activateAbility') ids.add(option.abilityId);
    }
    return ids;
  }, [options]);

  const ultimate = hero.abilities.find((a) => a.ultimate);
  const rest = hero.abilities.filter((a) => !a.ultimate);
  const half = Math.ceil(rest.length / 2);

  const slot = (ability: Ability) => {
    const isLive = ability.tiers.some((_tier, i) => live.has(`${ability.id}:${i}`));
    const level = player.abilityLevels[ability.id] ?? ability.level;
    return (
      <button
        key={ability.id}
        type="button"
        className={[
          'b3d__slot',
          isLive ? 'b3d__slot--live' : '',
          playable.has(ability.id) ? 'b3d__slot--press' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        /* Every slot opens: a player reads an ability far more often than they
           use one, and the ones they cannot use are the ones they most need to
           read. Using it is a button inside, where it cannot be hit by
           accident while looking. */
        onClick={() => onInspect({ kind: 'ability', seat: index, abilityId: ability.id })}
      >
        <AbilityCard ability={ability} heroId={hero.id} level={level} />
        <span className="b3d__level">{level}</span>
        {isLive ? <span className="b3d__ready">{t('ui.play.ready')}</span> : null}
      </button>
    );
  };

  return (
    <div
      className={[
        'b3d',
        game.active === index ? 'b3d--active' : '',
        you === index ? 'b3d--mine' : '',
        health <= 0 ? 'b3d--out' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={paletteOf(hero)}
    >
      <header className="b3d__name">
        {hero.portrait ? <img src={hero.portrait} alt="" /> : null}
        <span>{player.name}</span>
        <span className="b3d__hp">{health}</span>
        <span className="b3d__cp">{player.cp} CP</span>
        {you === index ? <span className="b3d__tag">{t('ui.play.you')}</span> : null}
      </header>

      <div className="b3d__board">
        <div className="b3d__wing">{rest.slice(0, half).map(slot)}</div>
        <div className="b3d__centre">
          <h3>{t(K.hero(hero.id, 'name'), hero.name)}</h3>
          {ultimate ? slot(ultimate) : null}
          <div className="b3d__tokens">
            {Object.entries(player.statuses)
              .filter(([, n]) => n > 0)
              .map(([id, n]) => {
                const Icon = STATUS_ICONS[id];
                return (
                  <span key={id} className="b3d__token" title={t(K.statusName(id), id)}>
                    {Icon ? <Icon /> : id}
                    <b>{n}</b>
                  </span>
                );
              })}
          </div>
        </div>
        <div className="b3d__wing">{rest.slice(half).map(slot)}</div>
      </div>

      <div className="b3d__hpbar" aria-hidden="true">
        <span style={{ width: `${Math.max(0, (health / team.maxHealth) * 100)}%` }} />
      </div>
    </div>
  );
}

/** The draw pile and the discard, laid either side of the board. */
function Piles({
  game,
  index,
  onInspect,
}: {
  game: GameState;
  index: number;
  onInspect: (what: Inspect) => void;
}) {
  const { t } = useI18n();
  const player = game.players[index];
  const hero = HEROES[player.heroId];

  return (
    <div className="b3d__piles">
      <div className="pile pile--deck" title={t('ui.pile.deck')}>
        <div className="pile__back" style={paletteOf(hero)}>
          <span>{t('ui.pile.deck')}</span>
        </div>
        <b>{player.deck.length}</b>
      </div>

      <button
        type="button"
        className="pile pile--discard"
        onClick={() => onInspect({ kind: 'discard', seat: index })}
        title={t('ui.pile.discardOpen')}
      >
        <div className="pile__slot">
          <span>{t('ui.pile.discard')}</span>
        </div>
        <b>{player.discard.length}</b>
      </button>
    </div>
  );
}

export function Seats3D({
  game,
  you,
  options,
  projection,
  onInspect,
}: {
  game: GameState;
  you: number;
  options: Action[];
  projection: { current: Projection };
  onInspect: (what: Inspect) => void;
}) {
  const count = game.players.length;

  return (
    <>
      {game.players.map((_player, index) => {
        const [bx, bz] = seatSpot(index, count, you, BOARD.radius);
        const [px, pz] = seatSpot(index, count, you, DECK.radius, DECK.sideways);
        return (
          <div key={index}>
            <ScenePanel
              projection={projection}
              position={[bx, TABLE_H + BOARD.y, bz]}
              widthPx={BOARD.widthPx}
              widthM={BOARD.widthM}
              zBase={120}
            >
              <BoardFace
                game={game}
                index={index}
                you={you}
                options={options}
                onInspect={onInspect}
              />
            </ScenePanel>

            <ScenePanel
              projection={projection}
              position={[px, TABLE_H + BOARD.y, pz]}
              widthPx={320}
              widthM={0.2}
              zBase={120}
            >
              <Piles game={game} index={index} onInspect={onInspect} />
            </ScenePanel>
          </div>
        );
      })}
    </>
  );
}

/** A slot read close up, with the one button that acts on it. */
export function AbilityReader({
  game,
  what,
  options,
  onAction,
  onClose,
}: {
  game: GameState;
  what: Inspect;
  options: Action[];
  onAction: (action: Action) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  if (!what) return null;

  if (what.kind === 'discard') {
    const player = game.players[what.seat];
    const hero = HEROES[player.heroId];
    const cards = player.discard
      .map((id) => hero.cards.find((c) => id.startsWith(c.id)))
      .filter((c): c is Card => Boolean(c));
    return (
      <div className="reader" onClick={onClose}>
        <div className="reader__panel" onClick={(e) => e.stopPropagation()}>
          <header>
            <h3>
              {t('ui.pile.discard')} — {player.name} ({cards.length})
            </h3>
            <button type="button" onClick={onClose}>
              ✕
            </button>
          </header>
          <div className="reader__grid">
            {cards.length === 0 ? <p className="reader__empty">{t('ui.pile.empty')}</p> : null}
            {cards.map((card, i) => (
              <CardView key={`${card.id}-${i}`} card={card} width={190} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const player = game.players[what.seat];
  const hero = HEROES[player.heroId];
  const ability = hero.abilities.find((a) => a.id === what.abilityId);
  if (!ability) return null;
  const level = player.abilityLevels[ability.id] ?? ability.level;
  const use = options.find(
    (o) => o.type === 'activateAbility' && o.abilityId === ability.id,
  );

  return (
    <div className="reader" onClick={onClose}>
      <div
        className="reader__panel reader__panel--one"
        style={paletteOf(hero)}
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <h3>{t(K.hero(hero.id, 'name'), hero.name)}</h3>
          <button type="button" onClick={onClose}>
            ✕
          </button>
        </header>
        <div className="reader__ability">
          <AbilityCard ability={ability} heroId={hero.id} level={level} width={420} />
        </div>
        {use ? (
          <button
            type="button"
            className="reader__use"
            onClick={() => {
              onAction(use);
              onClose();
            }}
          >
            {t('ui.play.useAbility')}
          </button>
        ) : null}
      </div>
    </div>
  );
}
