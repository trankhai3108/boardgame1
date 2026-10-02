import { HEROES } from '../../data/heroes';
import type { Action } from '../../engine/actions';
import { canAct } from '../../engine/authority';
import { topPending, type GameState } from '../../engine/state';
import { fill } from '../../i18n';
import { useI18n } from '../../i18n/useI18n';
import { K } from '../../i18n/types';
import { CardView } from '../card/Card';
import { PendingPanel } from '../play/PendingPanel';
import type { View } from './Camera3D';

/**
 * Everything that is words rather than things.
 *
 * A tabletop in three dimensions is better at space — where the dice are, whose
 * board is whose, how far away an opponent is — and worse at everything a
 * player has to read. Rules text turned at an angle is text you squint at. So
 * the phase, the buttons, the hand and the log stay flat on the glass, and the
 * table underneath is left to be a table.
 */

/** The actions that get a button, as opposed to a card, a die or a slot. */
const BUTTONS = [
  'rollDice',
  'skipAttack',
  'nextPhase',
  'resolveAttack',
  'payKnockdown',
  'chooseDefense',
  'rollTarget',
  'chooseTarget',
  'passResponse',
] as const;

function label(game: GameState, option: Action, t: (k: string, f?: string) => string): string {
  const nameFor = (i: number) => game.players[i].name;
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
    case 'passResponse':
      return t('ui.action.pass');
    case 'chooseTarget':
      return fill(t('ui.action.target'), { name: nameFor(option.target) });
    case 'chooseDefense': {
      if (option.abilityId === null) return t('ui.action.noDefend');
      const hero = game.attack ? HEROES[game.players[game.attack.defender].heroId] : null;
      const ability = hero?.abilities.find((a) => a.id === option.abilityId);
      return fill(t('ui.action.defendWith'), {
        ability: ability ? t(K.abilityName(hero!.id, option.abilityId), ability.name) : option.abilityId,
      });
    }
    default:
      return option.type;
  }
}

export function Hud({
  game,
  you,
  options,
  onAction,
  view,
  setView,
  toolbar,
}: {
  game: GameState;
  you: number;
  options: Action[];
  onAction: (action: Action) => void;
  view: View;
  setView: (view: View) => void;
  toolbar?: React.ReactNode;
}) {
  const { t } = useI18n();
  const step = topPending(game);

  /** On a shared screen every seat is yours; online, only your own. */
  const mine = (option: Action) => (you < 0 ? true : canAct(game, you, option));
  const seat = you >= 0 ? you : game.active;
  const player = game.players[seat];

  const buttons = options.filter(
    (o) => (BUTTONS as readonly string[]).includes(o.type) && mine(o),
  );

  const hand = options.filter((o) => o.type === 'playCard' && mine(o));
  const handHero = HEROES[player.heroId];

  return (
    <div className="hud">
      <header className="hud__top">
        <div className="hud__phase">
          <b>{t(`ui.phase.${game.phase}`)}</b>
          <span>
            {fill(t('ui.play.round'), { n: game.round })} · {game.players[game.active].name}
          </span>
        </div>
        {toolbar ? <div className="hud__toolbar">{toolbar}</div> : null}
        <div className="hud__views">
          {(['overview', 'seat', 'table'] as View[]).map((v) => (
            <button
              key={v}
              type="button"
              className="hud__view"
              aria-pressed={v === view}
              onClick={() => setView(v)}
            >
              {t(`ui.view3d.${v}`)}
            </button>
          ))}
        </div>
      </header>

      {game.response ? (
        <div className="hud__declared">
          {fill(t('ui.play.declaredLine'), {
            attacker: game.players[game.active].name,
            ability: game.response.abilityName,
          })}
          <span>
            {fill(t('ui.play.declaredWaiting'), {
              names: game.response.waiting.map((i) => game.players[i].name).join(', '),
            })}
          </span>
        </div>
      ) : null}

      {step ? (
        <div className="hud__pending">
          <PendingPanel
            game={game}
            step={step}
            options={options}
            yours={you < 0 || step.who === you}
            onAction={onAction}
          />
        </div>
      ) : null}

      <div className="hud__bottom">
        {buttons.length > 0 ? (
          <div className="hud__actions">
            {buttons.map((option, i) => (
              <button
                key={`${option.type}-${i}`}
                type="button"
                className="hud__button"
                onClick={() => onAction(option)}
              >
                {label(game, option, t)}
              </button>
            ))}
          </div>
        ) : null}

        {/* The cards in your hand, held along the bottom edge the way you hold
            a hand of cards: readable, and nobody else's business. */}
        {hand.length > 0 ? (
          <div className="hud__hand">
            {hand.map((option) => {
              if (option.type !== 'playCard') return null;
              const card = handHero.cards.find((c) => option.cardId.startsWith(c.id));
              if (!card) return null;
              return (
                <button
                  key={option.cardId}
                  type="button"
                  className="hud__card"
                  onClick={() => onAction(option)}
                  title={t(K.cardName(card.id), card.name)}
                >
                  <CardView card={card} width={128} />
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
