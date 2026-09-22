import { useMemo, useState } from 'react';
import { HEROES } from '../../data/heroes';
import type { Action } from '../../engine/actions';
import { isWaitingOn } from '../../engine/authority';
import { bestAbilities } from '../../engine/combos';
import { resolveDamage } from '../../engine/damage';
import { legalActions, type HeroLookup } from '../../engine/reducer';
import {
  RULES,
  healthOf,
  teamOf,
  topPending,
  type GameState,
  type PlayerState,
} from '../../engine/state';
import { behaviourOf } from '../../engine/statusBehaviour';
import type { Hero } from '../../engine/types';
import { fill } from '../../i18n';
import { useI18n } from '../../i18n/useI18n';
import { K } from '../../i18n/types';
import { CardView } from '../card/Card';
import { STATUS_ICONS, SYMBOL_ICONS } from '../card/iconRegistry';
import { renderMarkup } from '../card/markup';
import { HeroPanel } from './HeroPanel';
import { PendingPanel } from './PendingPanel';
import './play.css';

const lookup: HeroLookup = (id) => HEROES[id];

export interface GameTableProps {
  game: GameState;
  /**
   * The seat this screen belongs to, or -1 for a shared screen where whoever
   * is sitting there plays every seat in turn.
   */
  you: number;
  onAction: (action: Action) => void;
  /** Rendered next to the round counter. */
  toolbar?: React.ReactNode;
}

function StatusTokens({
  player,
  spendable,
  onSpend,
}: {
  player: PlayerState;
  spendable: Set<string>;
  onSpend: (statusId: string) => void;
}) {
  const { t } = useI18n();
  const entries = Object.entries(player.statuses).filter(([, n]) => n > 0);
  if (entries.length === 0) return <span className="app__subtitle">{t('ui.play.noTokens')}</span>;

  return (
    <div className="tokens">
      {entries.map(([statusId, count]) => {
        const Icon = STATUS_ICONS[statusId];
        const canSpend = spendable.has(statusId);
        return (
          <button
            key={statusId}
            type="button"
            className={`token${canSpend ? ' token--spendable' : ''}`}
            disabled={!canSpend}
            onClick={() => onSpend(statusId)}
            title={t(K.statusSummary(statusId), behaviourOf(statusId).manual ?? statusId)}
          >
            {Icon ? <Icon /> : null}
            {t(K.statusName(statusId), statusId)}
            {count > 1 ? ` x${count}` : ''}
          </button>
        );
      })}
    </div>
  );
}

function PlayerPanel({
  game,
  index,
  hero,
  spendable,
  onSpend,
  isYou,
  isTarget,
}: {
  game: GameState;
  index: number;
  hero: Hero;
  spendable: Set<string>;
  onSpend: (statusId: string) => void;
  isYou: boolean;
  isTarget: boolean;
}) {
  const { t } = useI18n();
  const player = game.players[index];
  const team = teamOf(game, index);
  const health = healthOf(game, index);
  const active = game.active === index;
  const out = health <= 0;

  const classes = [
    'player-panel',
    active ? 'player-panel--active' : '',
    isYou ? 'player-panel--you' : '',
    isTarget ? 'player-panel--target' : '',
    out ? 'player-panel--out' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section className={classes}>
      <header className="player-panel__head">
        {hero.portrait ? <img className="player-panel__avatar" src={hero.portrait} alt="" /> : null}
        <span className="player-panel__names">
          <span className="player-panel__name">
            {player.name}
            {isYou ? <span className="player-panel__you">{t('ui.play.you')}</span> : null}
          </span>
          <span className="player-panel__hero">{t(K.hero(hero.id, 'name'), hero.name)}</span>
        </span>
        {game.teams.length > 1 && team.members.length > 1 ? (
          <span className={`team-chip team-chip--${player.team}`}>{team.name}</span>
        ) : null}
      </header>

      <div className="dials">
        <div className="dial dial--health">
          <div className="dial__value">{health}</div>
          <div className="dial__label">{t('ui.play.health')}</div>
          <div className="health-bar">
            <div
              className="health-bar__fill"
              style={{ width: `${Math.max(0, Math.min(100, (health / team.maxHealth) * 100))}%` }}
            />
          </div>
        </div>
        <div className="dial dial--cp">
          <div className="dial__value">{player.cp}</div>
          <div className="dial__label">{t('ui.play.cp')}</div>
        </div>
        <div className="dial">
          <div className="dial__value">{player.hand.length}</div>
          <div className="dial__label">{t('ui.play.cards')}</div>
        </div>
      </div>

      <StatusTokens player={player} spendable={spendable} onSpend={onSpend} />
    </section>
  );
}

export function GameTable({ game, you, onAction, toolbar }: GameTableProps) {
  const { t } = useI18n();
  const options = useMemo(() => legalActions(game, lookup), [game]);

  const active = game.players[game.active];
  const activeHero = HEROES[active.heroId];
  const attack = game.attack;
  const targeting = game.targeting;
  const pending = topPending(game);

  /** On a shared screen every seat is playable; online, only your own. */
  const controls = (index: number) => you < 0 || you === index;
  const myTurn = you < 0 || isWaitingOn(game, you);

  const spendableFor = (index: number): Set<string> => {
    const out = new Set<string>();
    if (!controls(index)) return out;
    for (const option of options) {
      if (option.type === 'spendStatus' && game.players[index].id === option.playerId) {
        out.add(option.statusId);
      }
    }
    return out;
  };

  const abilityOptions = options.filter((o) => o.type === 'activateAbility');
  const matches = game.roll ? bestAbilities(activeHero, game.roll.dice) : [];
  const preview = attack ? resolveDamage(attack.incoming, attack.type, attack.modifiers) : null;

  const actingPlayer = pending
    ? game.players[pending.who]
    : attack && !attack.defenseResolved
      ? game.players[attack.defender]
      : targeting?.chooser === 'defenders'
        ? game.players[targeting.opponents[0]]
        : active;

  // The board below the table is yours online, and follows whoever is acting
  // on a shared screen so the right hero is always face up.
  const boardSeat = you >= 0 ? you : game.players.indexOf(actingPlayer);

  const winnerTeam = game.teams.find((team) => team.id === game.winner);

  const nameFor = (index: number) => game.players[index].name;

  return (
    <div>
      {game.phase === 'gameOver' ? (
        <div className="winner-banner">
          {fill(t('ui.play.winner'), { name: winnerTeam?.name ?? '-' })}
        </div>
      ) : null}

      <div className="play__setup">
        {toolbar}
        <span className="app__subtitle">
          {fill(t('ui.play.round'), { n: game.round })} · {t(`ui.mode.${game.mode}`)}
        </span>
        {!myTurn ? (
          <span className="turn-hint">
            {fill(t('ui.play.waitingOn'), { name: actingPlayer.name })}
          </span>
        ) : null}
      </div>

      <div className={`play play--seats-${game.players.length}`}>
        <div className="play__side">
          {game.players.map((_p, i) =>
            i % 2 === 0 ? (
              <PlayerPanel
                key={i}
                game={game}
                index={i}
                hero={HEROES[game.players[i].heroId]}
                spendable={spendableFor(i)}
                onSpend={(statusId) =>
                  onAction({ type: 'spendStatus', playerId: game.players[i].id, statusId })
                }
                isYou={you === i}
                isTarget={attack?.defender === i}
              />
            ) : null,
          )}
        </div>

        <section className="tray">
          <header className="tray__phase">
            <span className="tray__phase-name">{t(`ui.phase.${game.phase}`)}</span>
            {game.roll ? (
              <span className="tray__attempts">
                {fill(t('ui.play.rollCount'), {
                  used: game.roll.attemptsUsed,
                  max: game.roll.maxAttempts,
                })}
              </span>
            ) : (
              <span className="tray__attempts">{actingPlayer.name}</span>
            )}
          </header>

          {targeting ? (
            <div className="attack-summary attack-summary--targeting">
              <div>
                {fill(t('ui.play.targetingLine'), {
                  attacker: active.name,
                  count: targeting.opponents.length,
                })}
              </div>
              {targeting.roll !== null ? (
                <div className="attack-summary__amount">
                  {fill(t('ui.play.targetRoll'), { n: targeting.roll })}
                </div>
              ) : null}
              {targeting.chooser ? (
                <div className="app__subtitle">
                  {t(
                    targeting.chooser === 'attacker'
                      ? 'ui.play.attackerChooses'
                      : 'ui.play.defendersChoose',
                  )}
                </div>
              ) : null}
            </div>
          ) : null}

          {attack && preview ? (
            <div className="attack-summary">
              <div>
                {fill(t('ui.play.attackLine'), {
                  attacker: nameFor(attack.attacker),
                  ability: t(
                    K.abilityName(game.players[attack.attacker].heroId, attack.abilityId),
                    attack.abilityName,
                  ),
                })}
                {' → '}
                <b>{nameFor(attack.defender)}</b>
              </div>
              <div className="attack-summary__amount">
                {fill(t('ui.play.dmg'), { n: preview.final })}
                {preview.reflected > 0
                  ? ` · ${fill(t('ui.play.reflected'), { n: preview.reflected })}`
                  : ''}
              </div>
              <div className="app__subtitle">
                {fill(t('ui.play.incoming'), { n: attack.incoming, type: attack.type })}
                {attack.modifiers.length > 0
                  ? ` · ${attack.modifiers.map((m) => m.source).join(', ')}`
                  : ''}
              </div>
            </div>
          ) : null}

          {pending ? (
            <PendingPanel
              game={game}
              step={pending}
              options={options}
              yours={controls(pending.who)}
              onAction={onAction}
            />
          ) : null}

          {game.roll ? (
            <div className="dice-row">
              {game.roll.dice.map((die) => {
                const face = activeHero.dieFaces[die.value - 1];
                const Icon = SYMBOL_ICONS[face.symbol];
                const canToggle =
                  !pending &&
                  myTurn &&
                  controls(game.active) &&
                  game.roll!.attemptsUsed < game.roll!.maxAttempts;
                return (
                  <button
                    key={die.id}
                    type="button"
                    className={`die${die.kept ? ' die--kept' : ''}`}
                    disabled={!canToggle}
                    onClick={() => onAction({ type: 'toggleKeep', dieId: die.id })}
                    title={`${t(K.dieLabel(face.label), face.label)} (${die.value})`}
                  >
                    <span className="die__value">{die.value}</span>
                    {Icon ? <Icon /> : null}
                  </button>
                );
              })}
            </div>
          ) : null}

          {abilityOptions.length > 0 && myTurn && !pending ? (
            <div className="ability-list">
              {abilityOptions.map((option) => {
                if (option.type !== 'activateAbility') return null;
                const match = matches.find(
                  (m) => m.ability.id === option.abilityId && m.tierIndex === option.tierIndex,
                );
                if (!match) return null;
                const tier = match.ability.tiers[match.tierIndex];
                return (
                  <button
                    key={`${option.abilityId}-${option.tierIndex}`}
                    type="button"
                    className={`ability-option${match.ability.ultimate ? ' ability-option--ultimate' : ''}`}
                    onClick={() => onAction(option)}
                  >
                    <span>
                      <span className="ability-option__name">
                        {t(K.abilityName(activeHero.id, match.ability.id), match.ability.name)}
                      </span>
                      <br />
                      <span className="ability-option__text">
                        {tier.text.map((line, i) => (
                          <span key={i}>
                            {renderMarkup(
                              t(
                                K.abilityTier(activeHero.id, match.ability.id, match.tierIndex, i),
                                line,
                              ),
                            )}{' '}
                          </span>
                        ))}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}

          <div className="tray__actions">
            {options
              .filter((o) =>
                [
                  'rollDice',
                  'skipAttack',
                  'nextPhase',
                  'resolveAttack',
                  'payKnockdown',
                  'chooseDefense',
                  'rollTarget',
                  'chooseTarget',
                ].includes(o.type),
              )
              .map((option, i) => {
                if (option.type === 'chooseDefense' && !controls(attack?.defender ?? -1)) return null;
                if (option.type === 'chooseTarget') {
                  const chooser = targeting?.chooser;
                  const allowed =
                    chooser === 'attacker'
                      ? controls(game.active)
                      : (targeting?.opponents ?? []).some(controls);
                  if (!allowed) return null;
                } else if (option.type !== 'resolveAttack' && !myTurn) {
                  return null;
                }

                const defenderHero = attack ? HEROES[game.players[attack.defender].heroId] : null;
                const defenceName = () => {
                  if (option.type !== 'chooseDefense' || !option.abilityId || !defenderHero)
                    return '';
                  const ability = defenderHero.abilities.find((a) => a.id === option.abilityId);
                  return t(
                    K.abilityName(defenderHero.id, option.abilityId),
                    ability?.name ?? option.abilityId,
                  );
                };

                const label =
                  option.type === 'rollDice'
                    ? t('ui.action.roll')
                    : option.type === 'skipAttack'
                      ? t('ui.action.noAttack')
                      : option.type === 'nextPhase'
                        ? t('ui.action.nextPhase')
                        : option.type === 'resolveAttack'
                          ? t('ui.action.resolve')
                          : option.type === 'payKnockdown'
                            ? t('ui.action.payKnockdown')
                            : option.type === 'rollTarget'
                              ? t('ui.action.rollTarget')
                              : option.type === 'chooseTarget'
                                ? fill(t('ui.action.target'), { name: nameFor(option.target) })
                                : option.type === 'chooseDefense' && option.abilityId === null
                                  ? t('ui.action.noDefend')
                                  : fill(t('ui.action.defendWith'), { ability: defenceName() });

                return (
                  <button
                    key={`${option.type}-${i}`}
                    type="button"
                    className="play__button"
                    onClick={() => onAction(option)}
                  >
                    {label}
                  </button>
                );
              })}
          </div>
        </section>

        <div className="play__side">
          {game.players.map((_p, i) =>
            i % 2 === 1 ? (
              <PlayerPanel
                key={i}
                game={game}
                index={i}
                hero={HEROES[game.players[i].heroId]}
                spendable={spendableFor(i)}
                onSpend={(statusId) =>
                  onAction({ type: 'spendStatus', playerId: game.players[i].id, statusId })
                }
                isYou={you === i}
                isTarget={attack?.defender === i}
              />
            ) : null,
          )}
        </div>
      </div>

      <Hand game={game} you={you} options={options} onAction={onAction} />

      {boardSeat >= 0 ? (
        <HeroPanel
          game={game}
          index={boardSeat}
          spendable={spendableFor(boardSeat)}
          onSpend={(statusId) =>
            onAction({
              type: 'spendStatus',
              playerId: game.players[boardSeat].id,
              statusId,
            })
          }
        />
      ) : null}

      <h2 className="section-title">{t('ui.section.log')}</h2>
      <div className="log">
        {game.log
          .slice(-80)
          .map((entry, i) => (
            <div key={i} className="log__entry">
              <span className="log__phase">r{entry.round} </span>
              {entry.player ? <span className="log__player">{entry.player} </span> : null}
              {entry.message}
            </div>
          ))
          .reverse()}
      </div>
    </div>
  );
}

/**
 * The hand of whoever this screen belongs to.
 *
 * Instants and Roll Phase cards come from any seat, so a shared screen offers
 * a tab per player rather than only the one whose turn it is — otherwise the
 * defender could never answer an attack with one.
 */
function Hand({
  game,
  you,
  options,
  onAction,
}: {
  game: GameState;
  you: number;
  options: Action[];
  onAction: (action: Action) => void;
}) {
  const { t } = useI18n();
  const shared = you < 0;
  const [seat, setSeat] = useState<number | null>(null);

  // On a shared screen, follow the turn unless the reader picked a seat.
  const index = shared ? (seat ?? game.active) : you;
  const player = game.players[index];
  const hero = HEROES[player.heroId];

  /** Seats holding a card they could play right now, for the tab badges. */
  const armed = new Set(
    options.flatMap((o) => (o.type === 'playCard' && o.playerId ? [o.playerId] : [])),
  );

  return (
    <>
      <h2 className="section-title">
        {t('ui.play.hand')} · {player.name}
      </h2>

      {shared ? (
        <div className="hand__seats">
          {game.players.map((p, i) => (
            <button
              key={p.id}
              type="button"
              className={`hand__seat${i === index ? ' hand__seat--on' : ''}${
                armed.has(p.id) ? ' hand__seat--armed' : ''
              }`}
              onClick={() => setSeat(i)}
            >
              {p.name}
              {armed.has(p.id) ? <span className="hand__dot" /> : null}
            </button>
          ))}
          {seat !== null ? (
            <button
              type="button"
              className="hand__seat"
              onClick={() => setSeat(null)}
            >
              {t('ui.play.followTurn')}
            </button>
          ) : null}
        </div>
      ) : null}

      {player.hand.length === 0 ? (
        <p className="app__subtitle">{t('ui.play.emptyHand')}</p>
      ) : (
        <div className="hand">
          {player.hand.map((instanceId) => {
            const card = hero.cards.find((c) => c.id === instanceId.split('#')[0]);
            if (!card) {
              return (
                <div key={instanceId} className="hand__card hand__card--hidden">
                  <div className="card-back" />
                </div>
              );
            }
            const canPlay = options.some(
              (o) =>
                o.type === 'playCard' &&
                o.cardId === instanceId &&
                (o.playerId ?? player.id) === player.id,
            );
            const canSell =
              index === game.active &&
              options.some((o) => o.type === 'sellCard' && o.cardId === instanceId);
            return (
              <div
                key={instanceId}
                className={`hand__card${canPlay ? ' hand__card--playable' : ''}`}
              >
                <CardView card={card} width={190} />
                <div className="hand__actions">
                  <button
                    type="button"
                    className="play__button"
                    disabled={!canPlay}
                    onClick={() =>
                      onAction({ type: 'playCard', cardId: instanceId, playerId: player.id })
                    }
                  >
                    {t('ui.action.play')} ({card.cp})
                  </button>
                  <button
                    type="button"
                    className="play__button play__button--ghost"
                    disabled={!canSell}
                    onClick={() => onAction({ type: 'sellCard', cardId: instanceId })}
                  >
                    {t('ui.action.sell')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

export { RULES };
