import { useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { HEROES } from '../../data/heroes';
import type { Action } from '../../engine/actions';
import { canAct } from '../../engine/authority';
import { legalActions, type HeroLookup } from '../../engine/reducer';
import type { GameTableProps } from '../play/GameTable';
import { AbilityReader, Seats3D, type Inspect } from './Seat3D';
import { Camera3D, type View } from './Camera3D';
import { Dice3D } from './Dice3D';
import { Table3D } from './Table3D';
import { Hud } from './Hud';
import { ProjectionProbe, makeProjection } from './projection';
import { CAMERA, TABLE_H } from './scene';
import './table3d.css';

const lookup: HeroLookup = (id) => HEROES[id];

/**
 * The game on a table you can walk round.
 *
 * It takes exactly the props the flat table takes, because it is the same game
 * — the engine has never known or cared what draws it. That is what makes two
 * views possible at all: one reducer, one set of legal actions, and a choice
 * of how to look at them.
 */
export function GameTable3D({ game, you, onAction, toolbar }: GameTableProps) {
  const [view, setView] = useState<View>('overview');
  const [inspect, setInspect] = useState<Inspect>(null);

  // The camera, published out of the canvas so the panels laid on the table
  // can follow it without living inside it. See `projection`.
  const projection = useRef(makeProjection());

  const options = useMemo(() => legalActions(game, lookup), [game]);

  // The dice belong to whoever threw them, and only they may touch them.
  const roller = game.roll?.playerIndex ?? -1;
  const diceAreYours =
    roller >= 0 &&
    (you < 0
      ? true
      : options.some((o) => o.type === 'toggleKeep' && canAct(game, you, o as Action)));

  return (
    <div className="table3d">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{
          fov: CAMERA.fov,
          position: [...CAMERA.overview.position] as [number, number, number],
          near: 0.05,
          far: 40,
        }}
      >
        <Table3D />
        <Camera3D
          view={view}
          seat={you >= 0 ? you : game.active}
          seats={game.players.length}
          you={you}
        />
        <ProjectionProbe into={projection} />
        <Dice3D game={game} you={you} onAction={onAction} canAct={diceAreYours} />
        {/* Somewhere for the shadows to fall that is not the felt itself. */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, TABLE_H + 0.0005, 0]} receiveShadow>
          <circleGeometry args={[1.17, 48]} />
          <shadowMaterial opacity={0.28} />
        </mesh>
      </Canvas>

      {/* Laid on the table, but part of the page: see `ScenePanel`. */}
      <Seats3D
        game={game}
        you={you}
        options={options}
        projection={projection}
        onInspect={setInspect}
      />

      <AbilityReader
        game={game}
        what={inspect}
        options={options}
        onAction={onAction}
        onClose={() => setInspect(null)}
      />

      <Hud
        game={game}
        you={you}
        options={options}
        onAction={onAction}
        view={view}
        setView={setView}
        toolbar={toolbar}
      />
    </div>
  );
}
