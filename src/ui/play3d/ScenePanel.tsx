import { useRef, type ReactNode } from 'react';
import {
  cameraTransform,
  panelTransform,
  perspectiveOf,
  useProjectedFrame,
  type Projection,
} from './projection';

/**
 * The layer every panel lives in.
 *
 * It carries the camera: the browser's perspective origin is set to match the
 * camera's field of view, and the one transform here puts the whole layer into
 * the camera's frame. Each panel inside then only has to say where it is in
 * the world.
 */
export function SceneLayer({
  projection,
  children,
}: {
  projection: { current: Projection };
  children: ReactNode;
}) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  useProjectedFrame(projection, (p) => {
    if (!p.camera || !outer.current || !inner.current) return;
    outer.current.style.perspective = `${perspectiveOf(p)}px`;
    inner.current.style.transform = cameraTransform(p);
  });

  return (
    <div ref={outer} className="scene-layer">
      <div ref={inner} className="scene-layer__camera">
        {children}
      </div>
    </div>
  );
}

/**
 * A panel of ordinary HTML lying on the table.
 *
 * It is drawn at `widthPx` pixels and placed at `widthM` metres, so it is
 * sized by what it is rather than by a scale that has to be guessed at. Being
 * ordinary HTML in the page's own React tree, context, state, events and text
 * layout all behave exactly as they do everywhere else.
 */
export function ScenePanel({
  projection,
  position,
  facing = 0,
  widthPx,
  widthM,
  children,
  className = '',
}: {
  projection: { current: Projection };
  position: [number, number, number];
  /** How far the panel is turned about the vertical, to face its owner. */
  facing?: number;
  widthPx: number;
  widthM: number;
  children: ReactNode;
  className?: string;
}) {
  const host = useRef<HTMLDivElement>(null);

  useProjectedFrame(projection, (p) => {
    const node = host.current;
    if (!node || !p.camera) return;
    node.style.transform = panelTransform(position, facing, widthPx, widthM);
  });

  return (
    <div ref={host} className={`scene-panel ${className}`} style={{ width: widthPx }}>
      {children}
    </div>
  );
}
