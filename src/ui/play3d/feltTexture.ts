import { CanvasTexture, SRGBColorSpace, type Texture } from 'three';

/**
 * The playing surface, drawn rather than shipped.
 *
 * A flat colour reads as a hole in the table under even light: there is
 * nothing for the eye to catch, so the surface has no size and the pieces on
 * it look pasted on. A faint burst from the middle and a little noise give it
 * a centre and a weave, which is all a table needs, and it costs one canvas
 * instead of a megabyte of photograph.
 */

let cached: Texture | null = null;

export function feltTexture(size = 1024): Texture | null {
  if (cached) return cached;
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const mid = size / 2;

  const base = ctx.createRadialGradient(mid, mid, size * 0.04, mid, mid, mid);
  base.addColorStop(0, '#5a4418');
  base.addColorStop(0.45, '#3a2d11');
  base.addColorStop(1, '#1d1709');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  // The burst: long and short rays alternating, the way the printed board has
  // them, fading out before they reach the rim so the edge stays calm.
  const rays = 24;
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2;
    const long = i % 2 === 0;
    const reach = mid * (long ? 0.82 : 0.56);
    const spread = (Math.PI / rays) * (long ? 0.62 : 0.34);

    const grad = ctx.createRadialGradient(mid, mid, size * 0.03, mid, mid, reach);
    grad.addColorStop(0, 'rgba(236, 186, 74, 0.30)');
    grad.addColorStop(0.55, 'rgba(214, 158, 52, 0.11)');
    grad.addColorStop(1, 'rgba(180, 130, 40, 0)');

    ctx.beginPath();
    ctx.moveTo(mid, mid);
    ctx.arc(mid, mid, reach, a - spread, a + spread);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
  }

  // A bright core, so the middle of the table is somewhere rather than nowhere.
  const core = ctx.createRadialGradient(mid, mid, 0, mid, mid, size * 0.1);
  core.addColorStop(0, 'rgba(255, 221, 140, 0.5)');
  core.addColorStop(1, 'rgba(255, 200, 90, 0)');
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, size, size);

  // Weave. Sparse, low contrast: enough to catch the light, not enough to see.
  const grain = ctx.getImageData(0, 0, size, size);
  const px = grain.data;
  for (let i = 0; i < px.length; i += 4) {
    const n = (Math.random() - 0.5) * 16;
    px[i] += n;
    px[i + 1] += n;
    px[i + 2] += n;
  }
  ctx.putImageData(grain, 0, 0);

  cached = new CanvasTexture(canvas);
  cached.colorSpace = SRGBColorSpace;
  cached.anisotropy = 8;
  return cached;
}
