import { useRef, type ReactNode } from 'react';
import { place, useProjectedFrame, type Projection } from './projection';

/**
 * A panel of ordinary HTML pinned to a point on the table.
 *
 * It lives outside the canvas, in the page's own React tree, and is moved onto
 * its anchor once a frame. That keeps everything a panel needs — context,
 * state, events, real text layout — and costs one transform per frame.
 */
export function ScenePanel({
  projection,
  position,
  widthPx,
  widthM,
  children,
  className = '',
  /** Panels nearer the camera are drawn over those further away. */
  zBase = 100,
  onDoubleClick,
}: {
  projection: { current: Projection };
  position: [number, number, number];
  /** The width the panel is laid out at, in CSS pixels. */
  widthPx: number;
  /** How wide it should appear on the table, in metres. */
  widthM: number;
  children: ReactNode;
  className?: string;
  zBase?: number;
  onDoubleClick?: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);

  useProjectedFrame(projection, (p) => {
    const node = host.current;
    if (!node) return;

    const at = place(p, position);
    if (!at || !at.visible) {
      node.style.visibility = 'hidden';
      return;
    }

    node.style.visibility = '';
    const scale = (widthM * at.perMetre) / widthPx;
    node.style.transform = `translate3d(${at.x}px, ${at.y}px, 0) translate(-50%, -50%) scale(${scale})`;
    node.style.zIndex = String(Math.max(0, Math.round(zBase - at.distance * 10)));
  });

  return (
    <div
      ref={host}
      className={`scene-panel ${className}`}
      style={{ width: widthPx, visibility: 'hidden' }}
      onDoubleClick={onDoubleClick}
    >
      {children}
    </div>
  );
}
