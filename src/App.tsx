import { useState } from 'react';
import { HERO_LIST } from './data/heroes';
import type { StatusEffect } from './engine/types';
import { fill } from './i18n';
import { useI18n } from './i18n/useI18n';
import { K, LANGS } from './i18n/types';
import { CardView } from './ui/card/Card';
import { STATUS_ICONS, SYMBOL_ICONS } from './ui/card/iconRegistry';
import { HeroBoard } from './ui/board/HeroBoard';
import { PlayTable } from './ui/play/PlayTable';
import './styles/global.css';

function StatusRow({ status }: { status: StatusEffect }) {
  const { t } = useI18n();
  const Icon = STATUS_ICONS[status.id];
  return (
    <div className="status-row">
      <span>{Icon ? <Icon /> : null}</span>
      <div>
        <div className="status-row__name">{t(K.statusName(status.id), status.name)}</div>
        <div className="status-row__summary">
          {t(K.statusSummary(status.id), status.summary)} ·{' '}
          {fill(t('ui.stackLimit'), { n: status.stackLimit })}
        </div>
        <div className="status-row__text">{t(K.statusText(status.id), status.text)}</div>
      </div>
    </div>
  );
}

function LanguageSwitch() {
  const { lang, setLang, t } = useI18n();
  return (
    <div className="lang-switch" role="group" aria-label={t('ui.lang')}>
      {LANGS.map((l) => (
        <button
          key={l.id}
          type="button"
          className="lang-switch__btn"
          aria-pressed={l.id === lang}
          onClick={() => setLang(l.id)}
          title={l.label}
        >
          {l.flag}
        </button>
      ))}
    </div>
  );
}

type Tab = 'play' | 'board' | 'cards' | 'status';

export default function App() {
  const { t } = useI18n();
  const [heroId, setHeroId] = useState(HERO_LIST[0].id);
  const [tab, setTab] = useState<Tab>('play');
  const hero = HERO_LIST.find((h) => h.id === heroId)!;

  const subtitle =
    tab === 'play'
      ? t('ui.subtitle.play')
      : fill(t('ui.subtitle.hero'), {
          hero: t(K.hero(hero.id, 'name'), hero.name),
          complexity: hero.complexity,
          weapon: t(K.hero(hero.id, 'weapon'), hero.weapon),
        });

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">{t('ui.title')}</h1>
        <p className="app__subtitle">{subtitle}</p>
        <LanguageSwitch />
      </header>

      <div className="tabs">
        {(['play', 'board', 'cards', 'status'] as Tab[]).map((tabId) => (
          <button
            key={tabId}
            className="tab"
            aria-selected={tabId === tab}
            onClick={() => setTab(tabId)}
          >
            {t(`ui.tab.${tabId}`)}
          </button>
        ))}
      </div>

      {tab !== 'play' ? (
        <div className="tabs">
          {HERO_LIST.map((h) => (
            <button
              key={h.id}
              className="tab"
              aria-selected={h.id === heroId}
              onClick={() => setHeroId(h.id)}
            >
              {t(K.hero(h.id, 'name'), h.name)}
            </button>
          ))}
        </div>
      ) : null}

      {tab === 'play' ? <PlayTable /> : null}

      {tab === 'board' ? (
        <>
          <div className="board-scroll">
            <HeroBoard hero={hero} />
          </div>

          <h2 className="section-title">{t('ui.section.dice')}</h2>
          <div className="die-faces">
            {hero.dieFaces.map((face) => {
              const Icon = SYMBOL_ICONS[face.symbol];
              return (
                <div key={face.value} className="die-face">
                  <span className="die-face__value">{face.value}</span>
                  {Icon ? <Icon /> : null}
                  <span className="die-face__label">{t(K.dieLabel(face.label), face.label)}</span>
                </div>
              );
            })}
          </div>
        </>
      ) : null}

      {tab === 'cards' ? (
        <>
          <p className="notice">{fill(t('ui.deckNotice'), { count: hero.cards.length })}</p>
          <div className="card-grid" style={{ marginTop: '1.5rem' }}>
            {hero.cards.map((card) => (
              <CardView key={card.id} card={card} />
            ))}
          </div>
        </>
      ) : null}

      {tab === 'status' ? (
        <div className="status-list">
          {hero.statusEffects.map((s) => (
            <StatusRow key={s.id} status={s} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
