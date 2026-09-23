import { HERO_LIST, HEROES } from '../../data/heroes';
import { findStatus } from '../../data/statusEffects';
import type { Action } from '../../engine/actions';
import { diceOnTable, type ChoiceAnswer } from '../../engine/effects';
import type { GameState, PendingStep } from '../../engine/state';
import { fill } from '../../i18n';
import { rolledDice } from './tableFx';
import { useI18n } from '../../i18n/useI18n';
import { K } from '../../i18n/types';
import { STATUS_ICONS, SYMBOL_ICONS } from '../card/iconRegistry';

/**
 * The step the table is waiting on.
 *
 * Every roll the engine used to make behind the scenes — a Defensive Ability,
 * a sub-roll, a token spent on a gamble — stops here instead, so the dice are
 * thrown by the player they belong to and stay on screen long enough to read.
 */
export function PendingPanel({
  game,
  step,
  options,
  yours,
  onAction,
}: {
  game: GameState;
  step: PendingStep;
  options: Action[];
  /** True when this screen may answer the step. */
  yours: boolean;
  onAction: (action: Action) => void;
}) {
  const { t } = useI18n();
  // The sub-roll dice tumble on the throw that moved them, same as the tray.
  const thrown = rolledDice(game.events);
  const who = game.players[step.who];
  const hero = HEROES[who.heroId];

  const can = (type: Action['type']) => yours && options.some((o) => o.type === type);

  return (
    <div className={`pending${yours ? ' pending--yours' : ''}`}>
      <header className="pending__head">
        <span className="pending__source">{step.source}</span>
        <span className="app__subtitle">
          {fill(t(yours ? 'ui.play.yourStep' : 'ui.play.theirStep'), { name: who.name })}
        </span>
      </header>

      {step.request.kind === 'roll' ? (
        <>
          <p className="pending__prompt">
            {step.rolled
              ? t('ui.play.rollDone')
              : fill(t('ui.play.rollPrompt'), { n: step.request.dice })}
          </p>

          {step.rolled ? (
            <div className="dice-row">
              {step.dice.map((die) => {
                const face = hero.dieFaces[die.value - 1];
                const Icon = SYMBOL_ICONS[face.symbol];
                const canKeep = yours && step.rerolls > 0;
                return (
                  <button
                    key={die.id}
                    type="button"
                    className={`die die--sub${die.kept ? ' die--kept' : ''}${
                      thrown.has(die.id) ? ' die--thrown' : ''
                    }`}
                    disabled={!canKeep}
                    onClick={() => onAction({ type: 'keepPending', dieId: die.id })}
                    title={`${t(K.dieLabel(face.label), face.label)} (${die.value})`}
                  >
                    <span className="die__value">{die.value}</span>
                    {Icon ? <Icon /> : null}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="dice-row">
              {Array.from({ length: step.request.dice }, (_, i) => (
                <span key={i} className="die die--blank" />
              ))}
            </div>
          )}

          <div className="tray__actions">
            {can('rollPending') ? (
              <button
                type="button"
                className="play__button"
                onClick={() => onAction({ type: 'rollPending' })}
              >
                {t('ui.action.rollPending')}
              </button>
            ) : null}
            {can('rerollPending') ? (
              <button
                type="button"
                className="play__button play__button--ghost"
                onClick={() => onAction({ type: 'rerollPending' })}
              >
                {fill(t('ui.action.rerollPending'), { n: step.rerolls })}
              </button>
            ) : null}
            {can('confirmPending') ? (
              <button
                type="button"
                className="play__button"
                onClick={() => onAction({ type: 'confirmPending' })}
              >
                {t('ui.action.confirmPending')}
              </button>
            ) : null}
          </div>

          {step.rerolls > 0 && step.rolled ? (
            <p className="app__subtitle">{t('ui.play.keepHint')}</p>
          ) : null}
        </>
      ) : (
        <>
          <p className="pending__prompt">{promptFor(step, t)}</p>
          <div className="choice-row">
            {options
              .filter((o) => o.type === 'answerChoice')
              .map((option, i) => {
                if (option.type !== 'answerChoice') return null;
                return (
                  <button
                    key={i}
                    type="button"
                    className="choice"
                    disabled={!yours}
                    onClick={() => onAction(option)}
                  >
                    <ChoiceLabel game={game} step={step} answer={option.answer} />
                  </button>
                );
              })}
          </div>
        </>
      )}
    </div>
  );
}

function promptFor(step: PendingStep, t: (key: string, fallback?: string) => string): string {
  if (step.request.kind !== 'choice') return '';
  switch (step.request.spec.pick) {
    case 'player':
      return t('ui.play.pickPlayer');
    case 'status':
      return t('ui.play.pickStatus');
    case 'die':
      return t('ui.play.pickDie');
    case 'dieValue':
      return t('ui.play.pickValue');
    case 'oneOf':
      return t('ui.play.pickOption');
  }
}

/** One answer, rendered as what it actually is: a seat, a token, or a die. */
function ChoiceLabel({
  game,
  step,
  answer,
}: {
  game: GameState;
  step: PendingStep;
  answer: ChoiceAnswer;
}) {
  const { t } = useI18n();

  if (answer.skipped) return <>{t('ui.action.declineChoice')}</>;

  if (answer.optionId) {
    const spec = step.request.kind === 'choice' ? step.request.spec : null;
    const label =
      spec?.pick === 'oneOf'
        ? (spec.options.find((o) => o.id === answer.optionId)?.label ?? answer.optionId)
        : answer.optionId;
    return <>{t(`choice.${answer.optionId}`, label)}</>;
  }

  if (answer.player !== undefined) {
    const player = game.players[answer.player];
    const hero = HEROES[player.heroId];
    return (
      <>
        {hero.portrait ? <img className="choice__avatar" src={hero.portrait} alt="" /> : null}
        {player.name}
      </>
    );
  }

  if (answer.status) {
    const { player, statusId } = answer.status;
    const def = findStatus(statusId, HERO_LIST);
    const Icon = STATUS_ICONS[statusId];
    return (
      <>
        {Icon ? <Icon /> : null}
        {t(K.statusName(statusId), def?.name ?? statusId)}
        <span className="choice__owner">{game.players[player].name}</span>
      </>
    );
  }

  if (answer.dieId) {
    const die = diceOnTable(game).find((d) => d.id === answer.dieId);
    const owner = game.roll ? game.players[game.roll.playerIndex] : game.players[game.active];
    const face = die ? HEROES[owner.heroId].dieFaces[die.value - 1] : null;
    const Icon = face ? SYMBOL_ICONS[face.symbol] : null;
    return (
      <>
        <b>{die?.value ?? '?'}</b>
        {Icon ? <Icon /> : null}
      </>
    );
  }

  return <b>{answer.value}</b>;
}
