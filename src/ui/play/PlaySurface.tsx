import { Suspense, lazy, useEffect, useState } from 'react';
import { useI18n } from '../../i18n/useI18n';
import { GameTable, type GameTableProps } from './GameTable';

/*
 * three.js and its React renderer are most of a megabyte, and a player who
 * never opens the 3D table should never pay for them. Loaded on the click
 * that asks for it instead of on the click that starts a game.
 */
const GameTable3D = lazy(() =>
  import('../play3d/GameTable3D').then((m) => ({ default: m.GameTable3D })),
);

type Surface = '2d' | '3d';

const KEY = 'dt.surface';

/**
 * Which table the game is drawn on.
 *
 * The flat table and the one you can walk round take the same props and drive
 * the same reducer, so the choice is the player's rather than the build's:
 * the 3D table is the one to sit at, and the flat one is faster to read, works
 * on anything, and is there when a machine cannot manage WebGL.
 *
 * The choice is remembered, because it is a preference about how somebody
 * likes to play and not a thing to re-pick every game.
 */
export function PlaySurface(props: GameTableProps) {
  const { t } = useI18n();
  const [surface, setSurface] = useState<Surface>(() => {
    try {
      return localStorage.getItem(KEY) === '3d' ? '3d' : '2d';
    } catch {
      return '2d';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(KEY, surface);
    } catch {
      /* A browser that refuses storage still gets to choose, just not to keep it. */
    }
  }, [surface]);

  const toolbar = (
    <div className="surface-switch">
      {(['2d', '3d'] as Surface[]).map((s) => (
        <button
          key={s}
          type="button"
          className="surface-switch__btn"
          aria-pressed={s === surface}
          onClick={() => setSurface(s)}
        >
          {t(`ui.view.${s}`)}
        </button>
      ))}
      {props.toolbar}
    </div>
  );

  if (surface !== '3d') return <GameTable {...props} toolbar={toolbar} />;

  return (
    <Suspense fallback={<div className="table3d-loading">{t('ui.view.loading3d')}</div>}>
      <GameTable3D {...props} toolbar={toolbar} />
    </Suspense>
  );
}
