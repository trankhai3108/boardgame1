import { useCallback, useState } from 'react';
import { HERO_LIST, HEROES } from '../../data/heroes';
import type { Action } from '../../engine/actions';
import { reduce, type HeroLookup } from '../../engine/reducer';
import {
  MODES,
  createGame,
  playerCountFor,
  type GameMode,
  type GameState,
} from '../../engine/state';
import { useI18n } from '../../i18n/useI18n';
import { GameTable } from './GameTable';

const lookup: HeroLookup = (id) => HEROES[id];
const MODE_IDS: GameMode[] = ['1v1', '2v2', '3v3', '2v2v2', 'koth'];

/** Hot-seat: one screen, everyone takes their turn on it. */
export function LocalPlay() {
  const { t } = useI18n();
  const [mode, setMode] = useState<GameMode>('1v1');
  const [kothCount, setKothCount] = useState(3);
  const [picks, setPicks] = useState<string[]>(() => HERO_LIST.slice(0, 6).map((h) => h.id));
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e6));
  const [game, setGame] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const seats = mode === 'koth' ? kothCount : playerCountFor(mode);

  const start = useCallback(() => {
    try {
      setError(null);
      setGame(
        createGame(
          Array.from({ length: seats }, (_, i) => ({
            id: `p${i + 1}`,
            name: `Player ${i + 1}`,
            hero: HEROES[picks[i] ?? HERO_LIST[i % HERO_LIST.length].id],
          })),
          { mode, seed },
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [mode, picks, seats, seed]);

  const dispatch = useCallback((action: Action) => {
    setGame((current) => {
      if (!current) return current;
      try {
        setError(null);
        return reduce(current, action, lookup);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        return current;
      }
    });
  }, []);

  if (!game) {
    return (
      <div>
        {error ? <p className="notice">{error}</p> : null}

        <div className="play__setup">
          <select value={mode} onChange={(e) => setMode(e.target.value as GameMode)}>
            {MODE_IDS.map((m) => (
              <option key={m} value={m}>
                {MODES[m].label}
              </option>
            ))}
          </select>
          {mode === 'koth' ? (
            <select value={kothCount} onChange={(e) => setKothCount(Number(e.target.value))}>
              {[3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          ) : null}
          <label className="app__subtitle">
            {t('ui.play.seed')}{' '}
            <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(Number(e.target.value))}
              style={{ width: '7rem' }}
            />
          </label>
          <button type="button" className="play__button" onClick={start}>
            {t('ui.play.start')}
          </button>
        </div>

        <div className="seat-picker">
          {Array.from({ length: seats }, (_, i) => (
            <label key={i} className="seat-picker__row">
              <span className="seat-picker__seat">Player {i + 1}</span>
              <select
                value={picks[i] ?? HERO_LIST[i % HERO_LIST.length].id}
                onChange={(e) =>
                  setPicks((prev) => {
                    const next = prev.slice();
                    next[i] = e.target.value;
                    return next;
                  })
                }
              >
                {HERO_LIST.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>

        <p className="notice" style={{ marginTop: '1rem' }}>
          {t('ui.play.hotseat')}
        </p>
      </div>
    );
  }

  return (
    <>
      {error ? <p className="notice">{error}</p> : null}
      <GameTable
        game={game}
        you={-1}
        onAction={dispatch}
        toolbar={
          <button
            type="button"
            className="play__button play__button--ghost"
            onClick={() => setGame(null)}
          >
            {t('ui.play.newGame')}
          </button>
        }
      />
    </>
  );
}
