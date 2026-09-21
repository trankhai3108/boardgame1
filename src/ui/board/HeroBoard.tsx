import type { Ability, DiceRequirement, DieSymbol, Hero } from '../../engine/types';
import { SYMBOL_ICONS } from '../card/iconRegistry';
import { useI18n } from '../../i18n/useI18n';
import { K } from '../../i18n/types';
import { renderMarkup } from '../card/markup';
import './ability.css';

/** Expands a requirement into the row of die slots the board prints. */
function slotsFor(req: DiceRequirement): (DieSymbol | null)[] {
  switch (req.kind) {
    case 'symbols':
      return Object.entries(req.symbols).flatMap(([symbol, n]) =>
        Array.from({ length: n }, () => symbol),
      );
    case 'straight':
      return Array.from({ length: req.length }, () => null);
    case 'ofAKind':
      return Array.from({ length: req.count }, () => null);
    case 'defenseRoll':
      return Array.from({ length: req.dice }, () => null);
  }
}

function comboLabel(req: DiceRequirement, explicit?: string): string | undefined {
  if (explicit) return explicit;
  if (req.kind === 'straight') return req.length >= 5 ? 'LARGE STRAIGHT' : 'SMALL STRAIGHT';
  if (req.kind === 'ofAKind') return `${req.count} OF A KIND`;
  if (req.kind === 'defenseRoll') return `DEFENSE ROLL ${req.dice}`;
  return undefined;
}

function DiceSlots({ req }: { req: DiceRequirement }) {
  return (
    <div className="dt-ability__dice">
      {slotsFor(req).map((symbol, i) => {
        const Icon = symbol ? SYMBOL_ICONS[symbol] : undefined;
        return (
          <span
            key={i}
            className={`dt-ability__slot${symbol ? '' : ' dt-ability__slot--blank'}`}
          >
            {Icon ? <Icon /> : null}
          </span>
        );
      })}
    </div>
  );
}

export function AbilityCard({
  ability,
  heroId,
  width,
}: {
  ability: Ability;
  heroId: string;
  width?: number;
}) {
  const { t, tList } = useI18n();

  const base = ability.ultimate
    ? 'dt-ability--ultimate'
    : ability.kind === 'passive'
      ? 'dt-ability--passive'
      : ability.kind === 'defensive'
        ? 'dt-ability--defensive'
        : '';

  // Three-tier abilities print requirement and result side by side.
  const modifier = `${base}${ability.tiers.length >= 3 ? ' dt-ability--inline-tiers' : ''}`;

  const style = width ? ({ '--dt-ability-w': `${width}px` } as React.CSSProperties) : undefined;

  return (
    <section className={`dt-ability ${modifier}`} style={style}>
      <h4 className="dt-ability__name">{t(K.abilityName(heroId, ability.id), ability.name)}</h4>

      {ability.kind === 'passive' ? (
        <>
          <span className="dt-ability__pill">{t('ui.ability.passive')}</span>
          <div className="dt-ability__text">
            {tList((i) => K.abilityText(heroId, ability.id, i), ability.text ?? []).map(
              (line, i) => <p key={i}>{renderMarkup(line)}</p>,
            )}
          </div>
        </>
      ) : null}

      {ability.tiers.map((tier, i) => {
        const label = comboLabel(tier.requirement, tier.requirementLabel);
        return (
          <div key={i} className="dt-ability__tier">
            <DiceSlots req={tier.requirement} />
            {label ? (
              <span className="dt-ability__combo">{t(K.comboLabel(label), label)}</span>
            ) : null}
            <div className="dt-ability__text">
              {tList((j) => K.abilityTier(heroId, ability.id, i, j), tier.text).map((line, j) => (
                <p key={j}>{renderMarkup(line)}</p>
              ))}
            </div>
          </div>
        );
      })}

      {ability.footer ? (
        <div className="dt-ability__text dt-ability__footer">
          {tList((i) => K.abilityFooter(heroId, ability.id, i), ability.footer).map((line, i) => (
            <p key={i}>{renderMarkup(line)}</p>
          ))}
        </div>
      ) : null}

      {ability.ultimate ? (
        <span className="dt-ability__ultimate-tag">{t('ui.ability.ultimate')}</span>
      ) : null}
      {!ability.ultimate ? <div className="dt-ability__art" /> : null}
    </section>
  );
}

/**
 * Lays the hero's abilities out the way the folding board prints them:
 * passive + one offensive on the left, the portrait and Ultimate in the middle,
 * the remaining offensives and the defensive ability on the right.
 */
export function HeroBoard({ hero }: { hero: Hero }) {
  const { t } = useI18n();
  const ultimate = hero.abilities.find((a) => a.ultimate);
  const rest = hero.abilities.filter((a) => !a.ultimate);

  // The folding board prints four abilities per side in a 2x2 grid, in the
  // order the hero definition lists them.
  const half = Math.ceil(rest.length / 2);
  const left = rest.slice(0, half);
  const right = rest.slice(half);

  const style = {
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
    <div className="dt-board" style={style}>
      <div className="dt-board__panel">
        {left.map((a) => <AbilityCard key={a.id} ability={a} heroId={hero.id} />)}
      </div>

      <div className="dt-board__centre">
        <div
          className={`dt-board__portrait${hero.portrait ? ' dt-board__portrait--art' : ''}`}
          aria-hidden="true"
        >
          {hero.portrait ? <img src={hero.portrait} alt="" /> : <span>{t('ui.art.portrait')}</span>}
        </div>
        <h2 className="dt-board__hero-name">{t(K.hero(hero.id, 'name'), hero.name)}</h2>
        <p className="dt-board__quote">{t(K.hero(hero.id, 'bio'), hero.bio)}</p>
        {ultimate ? <AbilityCard ability={ultimate} heroId={hero.id} /> : null}
      </div>

      <div className="dt-board__panel">
        {right.map((a) => <AbilityCard key={a.id} ability={a} heroId={hero.id} />)}
      </div>
    </div>
  );
}
