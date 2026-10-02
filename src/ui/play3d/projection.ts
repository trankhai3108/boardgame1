import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Euler, Matrix4, Quaternion, Vector3, type Camera } from 'three';

/**
 * Putting ordinary HTML into the scene, lying where it is put.
 *
 * A hero board is a thing on a table: it lies in the table's plane, it gets
 * shorter as you look across it, and walking round the table walks round it.
 * Positioning a panel by projecting its centre and scaling by distance looks
 * right only from the one angle it was tuned at — the board stays square to
 * the viewer, so it drifts off the table as the camera comes down, and at
 * close range it stops agreeing with the table altogether.
 *
 * So the panels are placed the way three.js's own CSS3D renderer places them:
 * one container carrying the camera's transform, and each panel carrying its
 * own world matrix. The browser then does the perspective, and a board lies on
 * the table at every angle because it really is on it.
 *
 * It is written out here rather than taken from drei's `<Html>` because that
 * mounts every panel into a React root of its own, which loses context and
 * drops panels when several appear at once.
 */

export interface Projection {
  camera: Camera | null;
  width: number;
  height: number;
  frame: number;
}

export function makeProjection(): Projection {
  return { camera: null, width: 0, height: 0, frame: 0 };
}

/** Publishes the camera out of the canvas. Renders nothing. */
export function ProjectionProbe({ into }: { into: { current: Projection } }) {
  const { camera, size } = useThree();

  useFrame(() => {
    const live = into.current;
    live.camera = camera;
    live.width = size.width;
    live.height = size.height;
    live.frame += 1;
  });

  return null;
}

/**
 * How many CSS units a metre is worth inside the 3D layer.
 *
 * The maths works at any scale — the factor cancels between the camera and the
 * panels — but the browser rounds the numbers in a matrix, and a table a metre
 * across means panel scales around 0.0007 and positions under 1, which is deep
 * enough into that rounding to collapse a board to a few pixels. Working in
 * hundreds, as CSS 3D scenes normally do, keeps every number well clear of it.
 */
const UNITS_PER_M = 400;

/** Numbers this small are noise, and CSS is happier without them. */
const tidy = (n: number) => (Math.abs(n) < 1e-10 ? 0 : n);

/**
 * The camera's matrix, in the form CSS wants it.
 *
 * CSS counts Y downwards and three.js counts it up, so every second row is
 * negated.
 */
function cameraMatrix(m: Matrix4): string {
  const e = m.elements;
  return `matrix3d(${tidy(e[0])},${tidy(-e[1])},${tidy(e[2])},${tidy(e[3])},${tidy(e[4])},${tidy(
    -e[5],
  )},${tidy(e[6])},${tidy(e[7])},${tidy(e[8])},${tidy(-e[9])},${tidy(e[10])},${tidy(e[11])},${tidy(
    e[12],
  )},${tidy(-e[13])},${tidy(e[14])},${tidy(e[15])})`;
}

/** A panel's own matrix, likewise flipped. */
function objectMatrix(m: Matrix4): string {
  const e = m.elements;
  return `matrix3d(${tidy(e[0])},${tidy(e[1])},${tidy(e[2])},${tidy(e[3])},${tidy(-e[4])},${tidy(
    -e[5],
  )},${tidy(-e[6])},${tidy(-e[7])},${tidy(e[8])},${tidy(e[9])},${tidy(e[10])},${tidy(e[11])},${tidy(
    e[12],
  )},${tidy(e[13])},${tidy(e[14])},${tidy(e[15])})`;
}

/** How far the browser's perspective origin must be, to match the camera. */
export function perspectiveOf(projection: Projection): number {
  const { camera, height } = projection;
  if (!camera) return 0;
  return (camera.projectionMatrix.elements[5] * height) / 2;
}

/** The transform the container holding every panel must carry. */
export function cameraTransform(projection: Projection): string {
  const { camera, width, height } = projection;
  if (!camera) return '';
  const fov = perspectiveOf(projection);

  camera.updateMatrixWorld();
  // The same world, measured in the layer's units rather than in metres.
  scaledCamera.copy(camera.matrixWorld);
  scaledCamera.elements[12] *= UNITS_PER_M;
  scaledCamera.elements[13] *= UNITS_PER_M;
  scaledCamera.elements[14] *= UNITS_PER_M;
  scaledCamera.invert();

  /*
   * Centred first, so the half-viewport shift happens in screen pixels.
   *
   * CSS applies these left to right, so a trailing `translate(w/2, h/2)` lands
   * in the layer's own units — hundreds to the metre — and slides the whole
   * world a couple of metres sideways. three.js's own CSS3D renderer puts it
   * last because there a world unit is a pixel and the two are the same thing.
   */
  return (
    `translate(${width / 2}px,${height / 2}px)` +
    `translateZ(${fov}px)` +
    cameraMatrix(scaledCamera)
  );
}

const scaledCamera = new Matrix4();

const scratchMatrix = new Matrix4();
const scratchPos = new Vector3();
const scratchQuat = new Quaternion();
const scratchScale = new Vector3();
const flat = new Quaternion().setFromEuler(new Euler(-Math.PI / 2, 0, 0));
const spin = new Quaternion();

/**
 * The transform that lays a panel on the table.
 *
 * `widthPx` is what it was drawn at and `widthM` what it should measure on the
 * table, so a panel is sized by saying how big it really is rather than by a
 * scale factor nobody can check.
 */
export function panelTransform(
  position: [number, number, number],
  facing: number,
  widthPx: number,
  widthM: number,
): string {
  const scale = (widthM * UNITS_PER_M) / widthPx;

  // Turned to face its owner, then tipped flat onto the table.
  spin.setFromAxisAngle(new Vector3(0, 1, 0), facing);
  scratchQuat.copy(spin).multiply(flat);

  scratchPos.set(
    position[0] * UNITS_PER_M,
    position[1] * UNITS_PER_M,
    position[2] * UNITS_PER_M,
  );
  scratchScale.set(scale, scale, scale);
  scratchMatrix.compose(scratchPos, scratchQuat, scratchScale);

  /*
   * Centred after the matrix, not before it.
   *
   * CSS composes left to right, so a leading `translate(-50%,-50%)` shifts the
   * panel in the camera's space — half of 1180 of them — while the panel
   * itself is under a metre across. Putting it last shifts the panel in its
   * own space, which is where half its width means half its width.
   */
  return `${objectMatrix(scratchMatrix)}translate(-50%,-50%)`;
}

/**
 * Runs `apply` every animation frame once the scene is live.
 *
 * Panels are moved outside React's render: the camera moves continuously, and
 * re-rendering a hero board sixty times a second to follow it is the one thing
 * certain to make the table feel slow.
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
