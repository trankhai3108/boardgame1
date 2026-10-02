import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3, type Camera } from 'three';

/**
 * Where a point in the scene lands on the screen.
 *
 * Panels of HTML — a hero board, a discard pile, a player's name — have to sit
 * on the table without being inside the canvas: they belong to the ordinary
 * React tree, where context, state and events work, and where the browser can
 * lay out and hyphenate text properly.
 *
 * So the camera is published out of the canvas once a frame, and the panels
 * read it. react-dom's `createPortal` cannot be used from inside the canvas to
 * get the same effect — the two renderers do not share a tree — and drei's
 * `<Html>` mounts a React root per panel, which loses context and drops
 * panels when several appear at once.
 */

export interface Projection {
  camera: Camera | null;
  width: number;
  height: number;
  /** Bumped every frame, so watchers know the view moved. */
  frame: number;
}

export function makeProjection(): Projection {
  return { camera: null, width: 0, height: 0, frame: 0 };
}

/** Publishes the camera out of the canvas. Renders nothing. */
export function ProjectionProbe({ into }: { into: { current: Projection } }) {
  const { camera, size } = useThree();

  useFrame(() => {
    into.current.camera = camera;
    into.current.width = size.width;
    into.current.height = size.height;
    into.current.frame += 1;
  });

  return null;
}

export interface Placed {
  x: number;
  y: number;
  /** Screen pixels per metre at this point's distance. */
  perMetre: number;
  distance: number;
  /** False when the point is behind the camera, where projection lies. */
  visible: boolean;
}

const scratch = new Vector3();

/** Projects a world point, or null until the camera has been published. */
export function place(projection: Projection, position: [number, number, number]): Placed | null {
  const { camera, width, height } = projection;
  if (!camera || width === 0) return null;

  scratch.set(position[0], position[1], position[2]);
  const distance = camera.position.distanceTo(scratch);
  scratch.project(camera);

  return {
    x: (scratch.x * 0.5 + 0.5) * width,
    y: (-scratch.y * 0.5 + 0.5) * height,
    // The projection matrix already holds the field of view; read it back
    // rather than deriving it again and risking the two disagreeing.
    perMetre: (camera.projectionMatrix.elements[5] * height) / 2 / Math.max(distance, 0.001),
    distance,
    visible: scratch.z <= 1,
  };
}

/**
 * Runs `apply` every animation frame once the scene is live.
 *
 * Panels are positioned outside React's render: the camera moves continuously
 * and re-rendering a hero board sixty times a second to move it would be the
 * one thing certain to make the table feel slow.
 */
export function useProjectedFrame(
  projection: { current: Projection },
  apply: (projection: Projection) => void,
): void {
  const latest = useRef(apply);
  latest.current = apply;

  useEffect(() => {
    let running = true;
    const tick = () => {
      if (!running) return;
      latest.current(projection.current);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return () => {
      running = false;
    };
  }, [projection]);
}
