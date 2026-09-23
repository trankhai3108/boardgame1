import { useCallback, useEffect, useRef, useState } from 'react';
import { HERO_LIST, HEROES } from '../../data/heroes';
import type { Action } from '../../engine/actions';
import { chooseBotAction, seatToAct, waitingOnBot } from '../../engine/bot';
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
/** Slow enough to watch a bot's turn, fast enough to test with. */
const BOT_DELAY_MS = 550;

/** Hot-seat: one screen, everyone takes their turn on it. */
export function LocalPlay() {
  const { t } = useI18n();
  const [mode, setMode] = useState<GameMode>('1v1');
  const [kothCount, setKothCount] = useState(3);
  const [picks, setPicks] = useState<string[]>(() => HERO_LIST.slice(0, 6).map((h) => h.id));
  // Seat 0 is you by default; every other seat starts as a bot so a game can
  // be started and watched without finding other people.
  const [bots, setBots] = useState<boolean[]>(() => [false, true, true, true, true, true]);
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
            isBot: bots[i] ?? false,
          })),
          { mode, seed },
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [bots, mode, picks, seats, seed]);

  // One bot move per tick, so a bot turn plays out where you can follow it.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!game || !waitingOnBot(game)) return;
    timer.current = setTimeout(() => {
      setGame((current) => {
        if (!current || !waitingOnBot(current)) return current;
        const seat = seatToAct(current);
        const action = chooseBotAction(current, seat, lookup);
        if (!action) return current;
        try {
          return reduce(current, action, lookup);
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
          return current;
        }
      });
    }, BOT_DELAY_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [game]);

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
            <div key={i} className="seat-picker__row">
              <span className="seat-picker__seat">
                {t('ui.play.seat')} {i + 1}
              </span>
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
              <button
                type="button"
                className={`seat-picker__who${bots[i] ? ' seat-picker__who--bot' : ''}`}
                onClick={() =>
                  setBots((prev) => {
                    const next = prev.slice();
                    next[i] = !next[i];
                    return next;
                  })
                }
              >
                {bots[i] ? t('ui.play.bot') : t('ui.play.human')}
              </button>
            </div>
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
