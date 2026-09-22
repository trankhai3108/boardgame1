import { useMemo, useState } from 'react';
import { HERO_LIST, HEROES } from '../../data/heroes';
import { findStatus } from '../../data/statusEffects';
import { bestAbilities } from '../../engine/combos';
import type { GameState, PlayerState } from '../../engine/state';
import { statusCount } from '../../engine/state';
import { behaviourOf } from '../../engine/statusBehaviour';
import type { Ability } from '../../engine/types';
import { useI18n } from '../../i18n/useI18n';
import { K } from '../../i18n/types';
import { AbilityCard } from '../board/HeroBoard';
import { SYMBOL_ICONS, STATUS_ICONS } from '../card/iconRegistry';

/**
 * The hero board, at the table.
 *
 * During a game you need to see the same three things the printed board gives
 * you: which combos your dice are close to, what your dice faces mean, and
 * which tokens are in front of you. The panel marks every ability the dice on
 * the table already satisfy, so the choice is visible rather than remembered.
 */
export function HeroPanel({
  game,
  index,
  onSpend,
  spendable,
}: {
  game: GameState;
  /** Seat whose board this is. */
  index: number;
  onSpend: (statusId: string) => void;
  spendable: Set<string>;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(true);
  const player = game.players[index];
  const hero = HEROES[player.heroId];

  // Highlight whatever the dice on the table would activate, but only for the
  // seat actually holding them.
  const live = useMemo(() => {
    if (!game.roll || game.roll.playerIndex !== index) return new Set<string>();
    return new Set(bestAbilities(hero, game.roll.dice).map((m) => `${m.ability.id}:${m.tierIndex}`));
  }, [game.roll, hero, index]);

  const ultimate = hero.abilities.find((a) => a.ultimate);
  const offensive = hero.abilities.filter((a) => !a.ultimate && a.kind === 'offensive');
  const other = hero.abilities.filter((a) => !a.ultimate && a.kind !== 'offensive');

  const isLive = (ability: Ability) =>
    ability.tiers.some((_tier, i) => live.has(`${ability.id}:${i}`));

  // The ability cards read their colours off these, exactly as the folding
  // board does, so the panel is the hero's own rather than a generic grey.
  const palette = {
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

  return (
    <section className="hero-panel" style={palette}>
      <header className="hero-panel__head">
        {hero.portrait ? (
          <img className="hero-panel__portrait" src={hero.portrait} alt="" />
        ) : null}
        <div className="hero-panel__title">
          <h2 className="hero-panel__name">{t(K.hero(hero.id, 'name'), hero.name)}</h2>
          <span className="app__subtitle">{player.name}</span>
        </div>
        <DiceKey heroId={hero.id} />
        <button
          type="button"
          className="play__button play__button--ghost"
          onClick={() => setOpen((v) => !v)}
        >
          {t(open ? 'ui.play.hideBoard' : 'ui.play.showBoard')}
        </button>
      </header>

      {open ? (
        <>
          <div className="hero-panel__abilities">
            {[...offensive, ...other, ...(ultimate ? [ultimate] : [])].map((ability) => (
              <div
                key={ability.id}
                className={`hero-panel__slot${isLive(ability) ? ' hero-panel__slot--live' : ''}`}
              >
                <AbilityCard
                  ability={ability}
                  heroId={hero.id}
                  width={ability.ultimate ? 420 : 250}
                />
                <span className="hero-panel__level">
                  {player.abilityLevels[ability.id] ?? ability.level}
                </span>
                {isLive(ability) ? (
                  <span className="hero-panel__ready">{t('ui.play.ready')}</span>
                ) : null}
              </div>
            ))}
          </div>

          <TokenBoard player={player} onSpend={onSpend} spendable={spendable} />
        </>
      ) : null}
    </section>
  );
}

/** What each pip value means on this hero's dice. */
function DiceKey({ heroId }: { heroId: string }) {
  const { t } = useI18n();
  const hero = HEROES[heroId];
  return (
    <div className="dice-key">
      {hero.dieFaces.map((face) => {
        const Icon = SYMBOL_ICONS[face.symbol];
        return (
          <span
            key={face.value}
            className="dice-key__face"
            title={t(K.dieLabel(face.label), face.label)}
          >
            <b>{face.value}</b>
            {Icon ? <Icon /> : face.symbol}
          </span>
        );
      })}
    </div>
  );
}

/**
 * Every token this hero can hold, whether or not any are in front of them.
 *
 * Showing the empty slots too is the point: the board is a reminder of what is
 * available, and a token you can spend right now is a button.
 */
function TokenBoard({
  player,
  onSpend,
  spendable,
}: {
  player: PlayerState;
  onSpend: (statusId: string) => void;
  spendable: Set<string>;
}) {
  const { t } = useI18n();
  const hero = HEROES[player.heroId];

  // The hero's own tokens first, then anything an opponent has put on them.
  const ids = [
    ...hero.statusEffects.map((s) => s.id),
    ...Object.keys(player.statuses).filter(
      (id) => !hero.statusEffects.some((s) => s.id === id),
    ),
  ];

  return (
    <div className="token-board">
      <h3 className="token-board__title">{t('ui.play.tokenBoard')}</h3>
      <div className="token-board__grid">
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
                'token-card',
                count > 0 ? 'token-card--held' : 'token-card--empty',
                canSpend ? 'token-card--spendable' : '',
                def ? `token-card--${def.polarity}` : '',
              ]
                .filter(Boolean)
                .join(' ')}
              disabled={!canSpend}
              onClick={() => onSpend(statusId)}
              title={t(K.statusText(statusId), def?.text ?? summary)}
            >
              <span className="token-card__head">
                {Icon ? <Icon /> : null}
                <b>{t(K.statusName(statusId), def?.name ?? statusId)}</b>
                <span className="token-card__count">{count}</span>
              </span>
              <span className="token-card__summary">{t(K.statusSummary(statusId), summary)}</span>
              {canSpend ? (
                <span className="token-card__spend">{t('ui.action.spendToken')}</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
