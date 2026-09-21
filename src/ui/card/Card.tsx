import type { Card, CardType, DiceRequirement, DieSymbol } from '../../engine/types';
import {
  InstantIcon,
  MainPhaseIcon,
  RollPhaseIcon,
  StarIcon,
  UpgradeArrowIcon,
} from './icons';
import { SYMBOL_ICONS } from './iconRegistry';
import { renderMarkup } from './markup';
import { useI18n } from '../../i18n/useI18n';
import { K } from '../../i18n/types';
import './card.css';

const TYPE_LABEL_KEY: Record<CardType, string> = {
  mainPhase: 'ui.cardType.mainPhase',
  rollPhase: 'ui.cardType.rollPhase',
  instant: 'ui.cardType.instant',
  upgrade: 'ui.cardType.upgrade',
};

const TAG_KEY: Record<string, string> = {
  'Attack Modifier': 'ui.tag.attackModifier',
  Persistent: 'ui.tag.persistent',
  Transfer: 'ui.tag.transfer',
};

const TYPE_MODIFIER: Record<CardType, string> = {
  mainPhase: 'dt-card--mainPhase',
  rollPhase: 'dt-card--rollPhase',
  instant: 'dt-card--instant',
  upgrade: 'dt-card--upgrade',
};

function TypeIcon({ type }: { type: CardType }) {
  switch (type) {
    case 'rollPhase':
      return <RollPhaseIcon />;
    case 'instant':
      return <InstantIcon />;
    default:
      // Upgrades are played in Main Phase, so they carry the same badge.
      return <MainPhaseIcon />;
  }
}

/** The row of die slots printed at the top of an upgrade card. */
function DiceRow({ req, label }: { req: DiceRequirement; label?: string }) {
  const { t } = useI18n();
  let slots: (DieSymbol | null)[] = [];

  if (req.kind === 'symbols') {
    for (const [symbol, count] of Object.entries(req.symbols)) {
      for (let i = 0; i < count; i++) slots.push(symbol);
    }
  } else if (req.kind === 'straight') {
    slots = Array.from({ length: req.length }, () => null);
  } else if (req.kind === 'ofAKind') {
    slots = Array.from({ length: req.count }, () => null);
  } else {
    slots = Array.from({ length: req.dice }, () => null);
  }

  const autoLabel =
    label ??
    (req.kind === 'straight'
      ? req.length >= 5
        ? 'LARGE STRAIGHT'
        : 'SMALL STRAIGHT'
      : req.kind === 'ofAKind'
        ? `${req.count} OF A KIND`
        : undefined);

  return (
    <div className="dt-card__dice-row">
      <div className="dt-card__dice-slots">
        {slots.map((symbol, i) => {
          const Icon = symbol ? SYMBOL_ICONS[symbol] : undefined;
          return (
            <span key={i} className="dt-card__dice-slot">
              {Icon ? <Icon /> : null}
            </span>
          );
        })}
      </div>
      {autoLabel ? (
        <span className="dt-card__combo-label">{t(K.comboLabel(autoLabel), autoLabel)}</span>
      ) : null}
    </div>
  );
}

export interface CardProps {
  card: Card;
  /** Overrides the CSS default of 300px. */
  width?: number | string;
  className?: string;
  onClick?: () => void;
}

/**
 * Renders one hero card using the printed card's layout: coloured frame by
 * card type, torn title banner, left rail with CP cost and type, art panel and
 * a text plaque. Upgrade cards put the dice row and text above the art.
 */
export function CardView({ card, width, className = '', onClick }: CardProps) {
  const { t, tList } = useI18n();
  const isUpgrade = card.type === 'upgrade';
  const style = width
    ? ({ '--dt-card-w': typeof width === 'number' ? `${width}px` : width } as React.CSSProperties)
    : undefined;

  const art = (
    <div className={`dt-card__art${card.art ? '' : ' dt-card__art--empty'}`}>
      {card.art ? (
        <img src={card.art} alt="" />
      ) : (
        <span className="dt-card__art-note">{t('ui.art.placeholder')}</span>
      )}
    </div>
  );

  const text = (
    <div className="dt-card__text">
      {tList((i) => K.cardText(card.id, i), card.text).map((line, i) => (
        <p key={i}>{renderMarkup(line)}</p>
      ))}
    </div>
  );

  const tags = card.tags?.length ? (
    <div className="dt-card__tags">
      {card.tags.map((tag) => (
        <span key={tag} className="dt-card__tag">
          {t(TAG_KEY[tag] ?? tag, tag)}
        </span>
      ))}
    </div>
  ) : null;

  return (
    <article
      className={`dt-card ${TYPE_MODIFIER[card.type]} ${className}`}
      style={style}
      onClick={onClick}
    >
      <div className="dt-card__frame">
        <div className="dt-card__inner">
          <h3 className="dt-card__title">{t(K.cardName(card.id), card.name)}</h3>

          <aside className="dt-card__rail">
            <span className="dt-card__cost">
              {isUpgrade ? (
                <UpgradeArrowIcon color="var(--dt-star)" />
              ) : (
                <StarIcon color="var(--dt-star)" />
              )}
              <span className="dt-card__cost-value">
                {card.cp}
                <sup>CP</sup>
              </span>
            </span>
            <span className="dt-card__type-icon">
              <TypeIcon type={card.type} />
            </span>
            <span className="dt-card__rail-label">{t(TYPE_LABEL_KEY[card.type])}</span>
          </aside>

          {card.setCode ? <span className="dt-card__setcode">{card.setCode}</span> : null}

          {isUpgrade ? (
            <>
              {card.requirement ? (
                <DiceRow req={card.requirement} label={card.requirementLabel} />
              ) : null}
              {tags}
              {text}
              {art}
            </>
          ) : (
            <>
              {art}
              {tags}
              {text}
            </>
          )}
        </div>
      </div>
    </article>
  );
}
