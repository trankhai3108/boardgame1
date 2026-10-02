import { useEffect, useRef } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { BOARD, CAMERA, EYE, TABLE_H, seatSpot } from './scene';

/** Where the camera can be sent, by name. */
export type View = 'overview' | 'seat' | 'table';

/**
 * The camera, and the two or three places a player actually wants it.
 *
 * Free orbit is right for a tabletop — you lean in, you look round a board,
 * you pull back to see the whole game — but free orbit alone leaves people
 * lost, hunting for their own seat. So the drag is kept inside sane limits and
 * the views that matter are a button away: the whole table, your own seat at
 * eye level, and a close look at the middle where the dice land.
 */
export function Camera3D({
  view,
  seat,
  seats,
  you,
}: {
  view: View;
  /** The seat the 'seat' view sits at. */
  seat: number;
  seats: number;
  you: number;
}) {
  const controls = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();

  const wanted = useRef<{ position: Vector3; target: Vector3 } | null>(null);

  useEffect(() => {
    if (view === 'overview') {
      wanted.current = {
        position: new Vector3(...CAMERA.overview.position),
        target: new Vector3(...CAMERA.overview.target),
      };
      return;
    }

    if (view === 'table') {
      // Far enough back that both ends of the table stay in it: a close look
      // at the middle is not much use if it loses the boards either side.
      wanted.current = {
        position: new Vector3(0, TABLE_H + 1.15, 1.05),
        target: new Vector3(0, TABLE_H, -0.05),
      };
      return;
    }

    // Sitting down: eyes above and behind your own board, looking across it to
    // the middle of the table — the view you have in the chair.
    const [bx, bz] = seatSpot(seat, seats, you, BOARD.radius + EYE.back);
    const [tx, tz] = seatSpot(seat, seats, you, BOARD.radius * 0.35);
    wanted.current = {
      position: new Vector3(bx, EYE.height, bz),
      target: new Vector3(tx, TABLE_H + 0.02, tz),
    };
  }, [view, seat, seats, you]);

  useFrame((_, delta) => {
    const go = wanted.current;
    const node = controls.current;
    if (!go || !node) return;

    // Eased rather than cut: a camera that teleports loses the player, and one
    // that takes a second to walk round the table tells them where they went.
    const k = 1 - Math.pow(0.0025, delta);
    camera.position.lerp(go.position, k);
    node.target.lerp(go.target, k);
    node.update();

    if (camera.position.distanceTo(go.position) < 0.004) wanted.current = null;
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan
      panSpeed={0.6}
      rotateSpeed={0.55}
      zoomSpeed={0.8}
      minDistance={CAMERA.minDistance}
      maxDistance={CAMERA.maxDistance}
      minPolarAngle={CAMERA.minPolar}
      maxPolarAngle={CAMERA.maxPolar}
      onStart={() => {
        wanted.current = null;
      }}
    />
  );
}
