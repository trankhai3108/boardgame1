import { useMemo, useState } from 'react';
import { HEROES } from '../../data/heroes';
import type { Action } from '../../engine/actions';
import { canAct, isWaitingOn } from '../../engine/authority';
import { bestAbilities } from '../../engine/combos';
import { resolveDamage } from '../../engine/damage';
import { legalActions, passiveOptionsFor, type HeroLookup } from '../../engine/reducer';
import {
  RULES,
  healthOf,
  isAlive,
  opponentsOf,
  topPending,
  type GameState,
} from '../../engine/state';
import { fill } from '../../i18n';
import { useI18n } from '../../i18n/useI18n';
import { K } from '../../i18n/types';
import { CardView } from '../card/Card';
import { SYMBOL_ICONS } from '../card/iconRegistry';
import { renderMarkup } from '../card/markup';
import { PendingPanel } from './PendingPanel';
import { Seat } from './Seat';
import { TableFx } from './TableFx';
import { rolledDice, useTableFx } from './tableFx';
import './play.css';
import './table.css';

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


/** The actions that get a button on the table, as opposed to a card or a die. */
const TRAY_ACTIONS = [
  'rollDice',
  'skipAttack',
  'nextPhase',
  'resolveAttack',
  'payKnockdown',
  'chooseDefense',
  'rollTarget',
  'chooseTarget',
] as const;

/**
 * The buttons a given seat has to press, drawn next to that seat.
 *
 * Sitting at a table you reach for your own things; a single shared row of
 * buttons in the middle gives no clue whose move it is. `canAct` already knows
 * whose click each action is, so the bar is just that question asked per seat.
 */
function ActionBar({
  game,
  seat,
  options,
  onAction,
}: {
  game: GameState;
  seat: number;
  options: Action[];
  onAction: (action: Action) => void;
}) {
  const { t } = useI18n();

  const mine = options.filter(
    (o) =>
      (TRAY_ACTIONS as readonly string[]).includes(o.type) && canAct(game, seat, o),
  );
  if (mine.length === 0) return null;

  const nameFor = (i: number) => game.players[i].name;

  const label = (option: Action): string => {
    switch (option.type) {
      case 'rollDice':
        return t('ui.action.roll');
      case 'skipAttack':
        return t('ui.action.noAttack');
      case 'nextPhase':
        return t('ui.action.nextPhase');
      case 'resolveAttack':
        return t('ui.action.resolve');
      case 'payKnockdown':
        return t('ui.action.payKnockdown');
      case 'rollTarget':
        return t('ui.action.rollTarget');
      case 'chooseTarget':
        return fill(t('ui.action.target'), { name: nameFor(option.target) });
      case 'chooseDefense': {
        if (option.abilityId === null) return t('ui.action.noDefend');
        const hero = game.attack ? HEROES[game.players[game.attack.defender].heroId] : null;
        const ability = hero?.abilities.find((a) => a.id === option.abilityId);
        return fill(t('ui.action.defendWith'), {
          ability: hero
            ? t(K.abilityName(hero.id, option.abilityId), ability?.name ?? option.abilityId)
            : option.abilityId,
        });
      }
      default:
        return option.type;
    }
  };

  return (
    <div className="seat__actions">
      {mine.map((option, i) => (
        <button
          key={`${option.type}-${i}`}
          type="button"
          className="play__button"
          onClick={() => onAction(option)}
        >
          {label(option)}
        </button>
      ))}
    </div>
  );
}

/** What each pip value means on the dice currently on the table. */
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

export function GameTable({ game, you, onAction, toolbar }: GameTableProps) {
  const { t } = useI18n();
  const options = useMemo(() => legalActions(game, lookup), [game]);
  /** Opponent across the table; null lets the game decide. */
  const [facing, setFacing] = useState<number | null>(null);
  const fx = useTableFx(game);
  // The dice the action just applied actually threw, so a roll reads as a
  // roll — including one made at the other end of the table.
  const thrown = useMemo(() => rolledDice(game.events), [game]);

  const active = game.players[game.active];
  const activeHero = HEROES[active.heroId];
  const attack = game.attack;
  const targeting = game.targeting;
  const pending = topPending(game);

  /**
   * On a shared screen every human seat is playable; online, only your own.
   * A bot seat is never yours to click, wherever you are sitting.
   */
  const controls = (index: number) =>
    !game.players[index].isBot && (you < 0 || you === index);
  const myTurn = you < 0 ? !game.players[game.active].isBot : isWaitingOn(game, you);

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

  // Passive options are offered separately: they are not the next step, they
  // are something the owner may pay for at any point in their turn.
  const passives = useMemo(
    () => (controls(game.active) ? passiveOptionsFor(game, lookup, game.active) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [game, you],
  );

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

  /*
   * Who sits at which end.
   *
   * The near end is yours, so your own board is always the one in front of
   * you; on a shared screen it follows whoever is acting, because that is the
   * player holding the device. The far end is whoever you are up against right
   * now — the two ends of the attack on the table, failing that the seat the
   * reader picked, failing that the first opponent still standing.
   */
  const nearSeat = you >= 0 ? you : game.players.indexOf(actingPlayer);

  const facedByPlay =
    attack && attack.attacker === nearSeat
      ? attack.defender
      : attack && attack.defender === nearSeat
        ? attack.attacker
        : null;

  const opponents = opponentsOf(game, nearSeat);
  const farSeat =
    facedByPlay ??
    (facing !== null && facing !== nearSeat ? facing : null) ??
    opponents.find((i) => isAlive(game, i)) ??
    opponents[0] ??
    nearSeat;

  const others = game.players
    .map((_p, i) => i)
    .filter((i) => i !== nearSeat && i !== farSeat);

  const seatSide = (player: number): 'near' | 'far' | null =>
    player === nearSeat ? 'near' : player === farSeat ? 'far' : null;

  /** Damage this seat took on the action just applied, for the flinch. */
  const hitOn = (seat: number): number | null => {
    const total = game.events
      .filter((e) => e.kind === 'damage' && e.player === seat)
      .reduce((sum, e) => sum + (e.kind === 'damage' ? e.amount : 0), 0);
    return total > 0 ? total : null;
  };

  // The dice belong to whoever threw them; everything else belongs to
  // whoever has to act on it.
  const stageOwner = game.roll ? game.roll.playerIndex : game.players.indexOf(actingPlayer);

  const winnerTeam = game.teams.find((team) => team.id === game.winner);

  const nameFor = (index: number) => game.players[index].name;

  /*
   * The dice, the attack being worked out and the combos they activate.
   *
   * This used to be a band between the two players, which is not where any of
   * it belongs: the dice are in front of whoever threw them. It is drawn
   * inside the seat of whoever the game is waiting on, and only falls back to
   * the middle when that seat is not one of the two on the table.
   */
  const stage = (
    <div className="stage">

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
                    className={`die${die.kept ? ' die--kept' : ''}${
                      thrown.has(die.id) ? ' die--thrown' : ''
                    }`}
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

          {myTurn && passives.length > 0 ? (
            <div className="passives">
              <span className="passives__label">{t('ui.play.passives')}</span>
              {passives.map(({ abilityId, option }) => (
                <button
                  key={`${abilityId}-${option.id}`}
                  type="button"
                  className="passives__button"
                  onClick={() => onAction({ type: 'usePassive', abilityId, optionId: option.id })}
                >
                  {t(K.passiveOption(option.id), option.label)}
                  <span className="passives__cost">{option.cp} CP</span>
                </button>
              ))}
            </div>
          ) : null}

    </div>
  );

  const stageSeat = seatSide(stageOwner) ? stageOwner : null;

  return (
    <div className="play-screen">
      {game.phase === 'gameOver' ? (
        <div className="winner-banner">
          {fill(t('ui.play.winner'), { name: winnerTeam?.name ?? '-' })}
        </div>
      ) : null}

      {/* The phase is the one thing you always need to know and the one thing
          a screen cannot show the way a board does, so it sits across the top
          of the table rather than inside a panel. */}
      <header className="table__phase">
        <div className="table__phase-side">{toolbar}</div>

        <div className="table__phase-main">
          <span className="table__phase-name">{t(`ui.phase.${game.phase}`)}</span>
          <span className="table__phase-sub">
            {fill(t('ui.play.round'), { n: game.round })} · {t(`ui.mode.${game.mode}`)}
            {game.roll
              ? ` · ${fill(t('ui.play.rollCount'), {
                  used: game.roll.attemptsUsed,
                  max: game.roll.maxAttempts,
                })}`
              : ''}
          </span>
          {myTurn ? (
            <span className="table__phase-turn">{t('ui.play.yourStep')}</span>
          ) : (
            <span className="turn-hint">
              {fill(t('ui.play.waitingOn'), { name: actingPlayer.name })}
            </span>
          )}
        </div>

        <div className="table__phase-side table__phase-side--end">
          <DiceKey heroId={game.players[game.roll?.playerIndex ?? game.active].heroId} />
        </div>
      </header>

      <div className="table">
        <TableFx game={game} fx={fx} seatSide={seatSide} />

        <Seat
          game={game}
          index={farSeat}
          you={you}
          stage={stageSeat === farSeat ? stage : null}
          side="far"
          actions={
            controls(farSeat) ? (
              <ActionBar game={game} seat={farSeat} options={options} onAction={onAction} />
            ) : null
          }
          hit={hitOn(farSeat)}
          spendable={spendableFor(farSeat)}
          onSpend={(statusId) =>
            onAction({ type: 'spendStatus', playerId: game.players[farSeat].id, statusId })
          }
        />

        {/*
          * Always rendered, even when a seat has the stage: the table is a
          * grid of three rows, and an element that is not there gives up its
          * row, which lets the lower seat slide into it and stop sharing the
          * height evenly with the upper one. Empty, it collapses to nothing.
          */}
        <section className="tray">{stageSeat === null ? stage : null}</section>

        {others.length > 0 ? (
          <div className="table__others">
            {others.map((i) => {
              const theirs = HEROES[game.players[i].heroId];
              return (
                <button
                  key={i}
                  type="button"
                  className={`table__other${game.active === i ? ' table__other--active' : ''}`}
                  onClick={() => setFacing(i)}
                  title={t('ui.play.faceSeat')}
                >
                  {theirs.portrait ? (
                    <img className="table__other-avatar" src={theirs.portrait} alt="" />
                  ) : null}
                  <span className="table__other-name">{game.players[i].name}</span>
                  <span className="table__other-hp">{healthOf(game, i)}</span>
                </button>
              );
            })}
          </div>
        ) : null}


        <Seat
          game={game}
          index={nearSeat}
          you={you}
          stage={stageSeat === nearSeat ? stage : null}
          side="near"
          actions={
            controls(nearSeat) ? (
              <ActionBar game={game} seat={nearSeat} options={options} onAction={onAction} />
            ) : null
          }
          hit={hitOn(nearSeat)}
          spendable={spendableFor(nearSeat)}
          onSpend={(statusId) =>
            onAction({ type: 'spendStatus', playerId: game.players[nearSeat].id, statusId })
          }
        />
      </div>

      <Hand game={game} you={you} options={options} onAction={onAction} />

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
  /*
   * Face down by choice.
   *
   * On a shared screen the hand is the one thing the person across the table
   * must not see, so it can be turned over between turns without leaving the
   * game. It also buys back a lot of height on a small screen.
   */
  const [shown, setShown] = useState(true);

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
      {/* One line: the toggle, whose hand it is, and — on a shared screen —
          the seat to look at. Three stacked rows cost the boards their
          height, and none of them needed a row to itself. */}
      <div className="hand__bar">
        <button
          type="button"
          className={`hand__toggle${shown ? '' : ' hand__toggle--off'}`}
          aria-pressed={shown}
          onClick={() => setShown((v) => !v)}
        >
          {t(shown ? 'ui.play.hideHand' : 'ui.play.showHand')}
        </button>
        <h2 className="section-title section-title--flush">
          {t('ui.play.hand')} · {player.name}
          <span className="hand__count">{player.hand.length}</span>
        </h2>

        {/* The log is a record, not part of play: it shares the hand's line
            and opens over the table when it is asked for. */}
        <details className="log-drawer">
          <summary>{t('ui.section.log')}</summary>
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
        </details>

        {shown && shared ? (
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
      </div>

      {!shown ? null : player.hand.length === 0 ? (
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
                {/* No width: the stylesheet sizes the hand off the room it has. */}
                <CardView card={card} />
                {/*
                 * A readable copy, shown while the pointer is on the card.
                 * It is fixed rather than a transform on the card itself: the
                 * hand scrolls sideways, and a box that scrolls on one axis
                 * clips the other, so an enlarged card in the row would be cut
                 * off by the row it is trying to rise out of.
                 */}
                <div className="hand__preview" aria-hidden="true">
                  <CardView card={card} />
                </div>
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
