/**
 * Where everything sits on the table, in metres.
 *
 * One round table with every player's board laid around it, the way the game
 * is actually set up: each board turned to face its owner, their dice and
 * tokens within reach of it, and the middle left clear for the throw.
 *
 * Keeping the geometry here means the camera, the boards, the dice and the
 * cards cannot drift apart, and that a table of two and a table of six are the
 * same arrangement with a different number of seats.
 */

/** Height of the table top above the floor. */
export const TABLE_H = 0.78;

/** The round table everything is played on. */
export const TABLE = {
  radius: 1.25,
  thickness: 0.06,
  /** The playing surface, inset from the rim. */
  feltRadius: 1.17,
};

/** Where a seated player's eyes are. */
export const EYE = {
  height: 1.3,
  /** How far back from their board's outer edge they sit. */
  back: 0.52,
};

/**
 * How a browser pixel maps to a metre when DOM is placed into the scene.
 *
 * drei lays its HTML out at one CSS pixel to `distanceFactor / 400` world
 * units, and leaves `distanceFactor` at 10 unless told otherwise — so a pixel
 * is a fortieth of a metre. Everything placed in the scene is sized by saying
 * how wide it should really be and dividing, rather than by guessing at a
 * scale factor until it looks right.
 */
export const PX_PER_M = 40;

/** Each player's board, laid flat and turned to face them. */
export const BOARD = {
  /** Distance from the centre of the table to the middle of the board. */
  radius: 0.72,
  /** A board lies on the table, a shade above it so it never z-fights. */
  y: 0.004,
  /** What the board is drawn at, in CSS pixels, before it is placed. */
  widthPx: 1180,
  /**
   * How wide it actually is on the table.
   *
   * Six seats share a circle 4.5 m round, so a board much over 0.65 m starts
   * to overlap its neighbours' — and a printed hero board really is about this
   * fraction of a table.
   */
  widthM: 0.8,
};

/** The scale that makes a pixel-sized panel come out at the width it wants. */
export function panelScale(widthPx: number, widthM: number): number {
  return (widthM / widthPx) * PX_PER_M;
}

/** A player's dice, thrown just inside their own board. */
export const TRAY = { radius: 0.3, spread: 0.1 };

/**
 * Their deck and discard, laid beside the board rather than beyond it.
 *
 * Pushed further from the centre they would sit on the board's own edge, which
 * is where the printed mat does not put them either: a player wants their
 * piles to the side, where a hand reaches without crossing the board.
 */
export const DECK = { radius: 0.74, sideways: 0.56 };

/** One die, and how the five of them lie once they settle. */
export const DIE = {
  size: 0.03,
  /** Gap between settled dice, centre to centre. */
  pitch: 0.078,
  /** How high a die is lifted while it tumbles. */
  hop: 0.11,
  /** A kept die is pushed this far towards its owner, out of the throw. */
  keptOffset: 0.09,
};

/**
 * Which pip value each face of the cube carries.
 *
 * Index order matches three.js BoxGeometry's material slots: +X, -X, +Y, -Y,
 * +Z, -Z. Opposite faces sum to seven, as they do on a real die.
 */
export const FACE_VALUES = [3, 4, 1, 6, 2, 5] as const;

/** Euler angles that bring each pip value to the top. */
export const FACE_UP: Record<number, [number, number, number]> = {
  1: [0, 0, 0],
  2: [Math.PI / 2, 0, 0],
  3: [0, 0, -Math.PI / 2],
  4: [0, 0, Math.PI / 2],
  5: [-Math.PI / 2, 0, 0],
  6: [Math.PI, 0, 0],
};

/** The cards you hold, arched in front of you just below the view. */
export const HAND = {
  dist: 0.5,
  drop: 0.28,
  spread: 0.44,
  arc: 0.1,
  fan: 0.13,
  cardW: 0.1,
  cardH: 0.145,
  /** How far a card rises when the pointer is over it. */
  lift: 0.05,
};

/**
 * Where a seat sits around the table, as an angle.
 *
 * Seat `you` is placed nearest the camera's resting position and the rest run
 * anticlockwise from there, so the board in front of you is always your own
 * however many are playing and whichever seat you were dealt.
 */
export function seatAngle(index: number, count: number, you: number): number {
  const from = you >= 0 ? you : 0;
  const step = (2 * Math.PI) / count;
  // Half a turn puts seat `from` on the near side, towards the camera.
  return Math.PI / 2 + ((index - from + count) % count) * step;
}

/**
 * Where a seat's things sit on the table.
 *
 * `radius` is how far out from the middle, `sideways` how far along that
 * player's own left-right — so a pile can be put beside a board without having
 * to work out the angle again at every call site.
 */
export function seatSpot(
  index: number,
  count: number,
  you: number,
  radius: number,
  sideways = 0,
): [number, number] {
  const a = seatAngle(index, count, you);
  const out: [number, number] = [Math.cos(a) * radius, Math.sin(a) * radius];
  if (sideways !== 0) {
    // At right angles to the way the seat faces.
    out[0] += Math.cos(a + Math.PI / 2) * sideways;
    out[1] += Math.sin(a + Math.PI / 2) * sideways;
  }
  return out;
}

/**
 * How far a seat's board must be turned so its top edge points outwards.
 *
 * A board laid flat is read from its owner's side of the table, so it is
 * rotated about the vertical to face away from the centre.
 */
export function seatFacing(index: number, count: number, you: number): number {
  return -seatAngle(index, count, you) + Math.PI / 2;
}

/** Where the camera rests, and how far it may be pushed. */
export const CAMERA = {
  /** The whole table in view, from over the near player's shoulder. */
  overview: { position: [0, 2.05, 1.95] as const, target: [0, TABLE_H, 0] as const },
  minDistance: 0.55,
  maxDistance: 4.2,
  /** Never below the table top, never straight down the middle. */
  minPolar: 0.12,
  maxPolar: 1.46,
  fov: 48,
};
