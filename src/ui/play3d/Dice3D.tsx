import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Euler, Group, MeshStandardMaterial, Quaternion } from 'three';
import { HEROES } from '../../data/heroes';
import type { Action } from '../../engine/actions';
import type { GameState } from '../../engine/state';
import type { Die } from '../../engine/types';
import { dieTextures } from './dieTexture';
import { DIE, FACE_UP, TABLE_H, TRAY, seatFacing, seatSpot } from './scene';

/**
 * The dice on the table.
 *
 * They tumble, but nothing about where they land is decided here: the engine
 * has already rolled, from a seeded generator, and these are only showing what
 * it rolled. So the tumble is an animation that ends at a known orientation
 * rather than a simulation that has to be corrected afterwards — a physics
 * sim whose result must be overridden lands wrong, slides, or jitters, and
 * players notice all three.
 *
 * `state.events` says which dice actually moved, so a die the player kept
 * stays exactly where it was instead of twitching every time its neighbour is
 * thrown.
 */

interface Spin {
  /** Seconds since the throw began; past the end, the die is at rest. */
  t: number;
  /** Where it was pointing when the throw began. */
  from: Quaternion;
  /** Where it must come to rest. */
  to: Quaternion;
  /** Turns it makes on the way, so a throw looks thrown. */
  tumble: Quaternion;
}

const DURATION = 0.72;

function restingQuaternion(value: number): Quaternion {
  const [x, y, z] = FACE_UP[value] ?? [0, 0, 0];
  return new Quaternion().setFromEuler(new Euler(x, y, z));
}

function randomTumble(): Quaternion {
  return new Quaternion().setFromEuler(
    new Euler(
      Math.PI * (1 + Math.floor(Math.random() * 3)),
      Math.PI * (1 + Math.floor(Math.random() * 3)),
      Math.PI * Math.floor(Math.random() * 3),
    ),
  );
}

/** Eases out, so a die slows into its face rather than stopping dead. */
const ease = (k: number) => 1 - Math.pow(1 - k, 3);

function OneDie({
  die,
  hero,
  position,
  onClick,
  canKeep,
  thrown,
}: {
  die: Die;
  hero: string;
  position: [number, number, number];
  onClick?: () => void;
  canKeep: boolean;
  /** Bumped whenever the engine says this die was thrown. */
  thrown: number;
}) {
  const group = useRef<Group>(null);
  const spin = useRef<Spin | null>(null);
  const lastThrow = useRef(-1);
  const lastValue = useRef(die.value);

  const textures = useMemo(() => dieTextures(HEROES[hero]), [hero]);
  const materials = useMemo(
    () =>
      textures.length === 6
        ? textures.map((map) => new MeshStandardMaterial({ map, roughness: 0.42, metalness: 0.02 }))
        : new MeshStandardMaterial({ color: '#d8d2c4', roughness: 0.45 }),
    [textures],
  );

  /*
   * A throw the engine reported, or a value that changed under us — a card
   * that sets a die — both end with the die showing its new face. The first
   * time a die appears it is simply already showing it: dice do not fly across
   * the table when a game is loaded.
   */
  useEffect(() => {
    const starting = lastThrow.current === -1;
    lastThrow.current = thrown;
    lastValue.current = die.value;
    const to = restingQuaternion(die.value);
    spin.current = starting
      ? { t: DURATION, from: to.clone(), to, tumble: new Quaternion() }
      : {
          t: 0,
          from: group.current?.quaternion.clone() ?? to.clone(),
          to,
          tumble: randomTumble(),
        };
  }, [thrown, die.value]);

  useFrame((_, delta) => {
    const node = group.current;
    const anim = spin.current;
    if (!node || !anim) return;

    if (anim.t >= DURATION) {
      node.quaternion.copy(anim.to);
      node.position.y = position[1];
      return;
    }

    anim.t = Math.min(DURATION, anim.t + delta);
    const k = ease(anim.t / DURATION);

    // Turn through the tumble on the way, so the die rolls rather than swings.
    const mid = anim.from.clone().slerp(anim.tumble, Math.sin(k * Math.PI));
    node.quaternion.copy(mid.slerp(anim.to, k));
    node.position.y = position[1] + Math.sin(k * Math.PI) * DIE.hop;
  });

  return (
    <group
      ref={group}
      position={position}
      onClick={
        onClick
          ? (e) => {
              e.stopPropagation();
              onClick();
            }
          : undefined
      }
      onPointerOver={(e) => {
        if (!canKeep) return;
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = '';
      }}
    >
      <mesh castShadow receiveShadow material={materials}>
        <boxGeometry args={[DIE.size, DIE.size, DIE.size]} />
      </mesh>

      {/* A kept die wears a ring, which is what a player checks before they throw. */}
      {die.kept ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -DIE.size / 2 + 0.0015, 0]}>
          <ringGeometry args={[DIE.size * 0.78, DIE.size * 0.98, 32]} />
          <meshBasicMaterial color="#f0c250" transparent opacity={0.9} />
        </mesh>
      ) : null}
    </group>
  );
}

export function Dice3D({
  game,
  you,
  onAction,
  canAct,
}: {
  game: GameState;
  you: number;
  onAction: (action: Action) => void;
  /** True when the viewer may keep and re-roll these dice. */
  canAct: boolean;
}) {
  const roll = game.roll;

  /*
   * How many times the engine says each die has been thrown.
   *
   * Counted rather than derived from the values, because a die that comes up
   * the same number twice was still thrown twice, and a die that was kept was
   * not thrown at all — neither of which the numbers alone can tell you.
   */
  const [throws, setThrows] = useState<Record<string, number>>({});
  useEffect(() => {
    const rolled = game.events.flatMap((e) => (e.kind === 'roll' ? e.dieIds : []));
    if (rolled.length === 0) return;
    setThrows((before) => {
      const after = { ...before };
      for (const id of rolled) after[id] = (after[id] ?? 0) + 1;
      return after;
    });
  }, [game.events]);

  if (!roll) return null;

  const seat = roll.playerIndex;
  const count = game.players.length;
  const [cx, cz] = seatSpot(seat, count, you, TRAY.radius);
  const facing = seatFacing(seat, count, you);
  const hero = game.players[seat].heroId;

  // Laid in a row across the thrower's view, kept dice drawn forward out of it.
  const half = (roll.dice.length - 1) / 2;
  return (
    // Dice sit on the table top, not on the floor it stands on.
    <group position={[cx, TABLE_H, cz]} rotation={[0, facing, 0]}>
      {roll.dice.map((die, i) => (
        <OneDie
          key={die.id}
          die={die}
          hero={hero}
          position={[(i - half) * DIE.pitch, DIE.size / 2, die.kept ? DIE.keptOffset : 0]}
          canKeep={canAct}
          thrown={throws[die.id] ?? 0}
          onClick={canAct ? () => onAction({ type: 'toggleKeep', dieId: die.id }) : undefined}
        />
      ))}
    </group>
  );
}
