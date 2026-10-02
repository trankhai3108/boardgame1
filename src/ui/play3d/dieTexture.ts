import { CanvasTexture, SRGBColorSpace, type Texture } from 'three';
import type { Hero } from '../../engine/types';
import { FACE_VALUES } from './scene';

/**
 * The six faces of a hero's dice, drawn onto canvases.
 *
 * A Dice Throne die shows a symbol, not pips, and what a player actually looks
 * for is "three swords" — a count of one symbol among five dice. Across a table
 * you read that by colour long before you read any label, so each of the
 * hero's symbols gets its own face colour, and the pips stay as well because
 * straights are counted from the value and nothing else.
 *
 * Textures are cached per hero: five dice share one set of six, and a hero's
 * faces never change during a game.
 */

const cache = new Map<string, Texture[]>();

/** The colours the distinct symbols of a hero are told apart by. */
function symbolColours(hero: Hero): Map<string, { bg: string; ink: string }> {
  const distinct = [...new Set(hero.dieFaces.map((f) => f.symbol))];
  const out = new Map<string, { bg: string; ink: string }>();

  /*
   * The hero's own two colours come first, so their dice look like their
   * board; a third symbol takes a near-white, which every palette contrasts
   * with. Beyond three — no printed hero has four — the list wraps.
   */
  const ramp = [
    { bg: hero.palette.primary, ink: '#f7f4ec' },
    { bg: hero.palette.accent, ink: '#1a1a20' },
    { bg: '#ece6d8', ink: '#24242c' },
    { bg: hero.palette.board, ink: '#f7f4ec' },
  ];
  distinct.forEach((symbol, i) => out.set(symbol, ramp[i % ramp.length]));
  return out;
}

/** Centres of the pips for each value, on a 3x3 grid of thirds. */
const PIPS: Record<number, [number, number][]> = {
  1: [[0.5, 0.5]],
  2: [
    [0.28, 0.28],
    [0.72, 0.72],
  ],
  3: [
    [0.26, 0.26],
    [0.5, 0.5],
    [0.74, 0.74],
  ],
  4: [
    [0.28, 0.28],
    [0.72, 0.28],
    [0.28, 0.72],
    [0.72, 0.72],
  ],
  5: [
    [0.26, 0.26],
    [0.74, 0.26],
    [0.5, 0.5],
    [0.26, 0.74],
    [0.74, 0.74],
  ],
  6: [
    [0.28, 0.22],
    [0.72, 0.22],
    [0.28, 0.5],
    [0.72, 0.5],
    [0.28, 0.78],
    [0.72, 0.78],
  ],
};

function drawFace(hero: Hero, value: number, size = 256): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const face = hero.dieFaces[value - 1];
  const { bg, ink } = symbolColours(hero).get(face.symbol) ?? { bg: '#2b2b30', ink: '#f7f4ec' };

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  // A hairline inside the edge, so the faces read as separate planes under
  // flat light rather than running into one another.
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.lineWidth = size * 0.035;
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, size - ctx.lineWidth, size - ctx.lineWidth);

  const r = size * 0.075;
  ctx.fillStyle = ink;
  for (const [x, y] of PIPS[value] ?? []) {
    ctx.beginPath();
    ctx.arc(x * size, y * size * 0.88, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // The symbol's printed name, small, along the bottom: the colour says which
  // symbol it is at a glance and this settles it when two heroes are close.
  ctx.font = `600 ${Math.round(size * 0.105)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.globalAlpha = 0.72;
  ctx.fillText(face.label, size / 2, size * 0.955);
  ctx.globalAlpha = 1;

  return canvas;
}

/**
 * The six materials' textures for a hero's dice, in three.js box-face order.
 *
 * Returns an empty list where there is no canvas to draw on — a server render
 * or a test environment — so the dice fall back to plain colours instead of
 * throwing.
 */
export function dieTextures(hero: Hero): Texture[] {
  const hit = cache.get(hero.id);
  if (hit) return hit;
  if (typeof document === 'undefined') return [];

  const made = FACE_VALUES.map((value) => {
    const texture = new CanvasTexture(drawFace(hero, value));
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  });
  cache.set(hero.id, made);
  return made;
}
