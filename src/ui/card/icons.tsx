/**
 * Icon set for card and board text.
 *
 * These are original SVGs drawn to match the *shape language* of the printed
 * components (spiked damage token, shield-heart heal, teal CP gem, ...) — no
 * published artwork is reproduced.
 */
import type { ReactNode } from 'react';

interface ValueIconProps {
  value?: number | string;
}

/** Points for a spiked "burst" circle, used by the damage token. */
function burstPath(spikes: number, outer: number, inner: number): string {
  const pts: string[] = [];
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / spikes) * i - Math.PI / 2;
    pts.push(`${(16 + r * Math.cos(a)).toFixed(2)},${(16 + r * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(' ');
}

function Label({ value, fill = '#fff', size = 15 }: { value?: number | string; fill?: string; size?: number }) {
  if (value === undefined) return null;
  return (
    <text
      x="16"
      y="16"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={size}
      fontWeight="800"
      fontFamily="'Barlow Semi Condensed', sans-serif"
      fill={fill}
    >
      {value}
    </text>
  );
}

/** Black spiked token carrying a damage number. */
export function DmgIcon({ value }: ValueIconProps) {
  return (
    <svg viewBox="0 0 32 32" className="dt-icon">
      <polygon points={burstPath(14, 15, 12.5)} fill="#101014" />
      <circle cx="16" cy="16" r="12" fill="#1a1a20" stroke="#000" strokeWidth="1" />
      <Label value={value} />
    </svg>
  );
}

/** Green shield-heart carrying a heal number. */
export function HealIcon({ value }: ValueIconProps) {
  return (
    <svg viewBox="0 0 32 32" className="dt-icon">
      <path
        d="M16 4c3-3 9-2 10 3 1 6-5 12-10 20C11 19 5 13 6 7c1-5 7-6 10-3z"
        fill="#3fb95a"
        stroke="#1d6b31"
        strokeWidth="1.5"
      />
      <Label value={value} />
    </svg>
  );
}

/** Blue shield carrying a damage-prevention number. */
export function PreventIcon({ value }: ValueIconProps) {
  return (
    <svg viewBox="0 0 32 32" className="dt-icon">
      <path
        d="M16 3l11 4.2v8.3c0 6.2-5 11.2-11 13.5-6-2.3-11-7.3-11-13.5V7.2z"
        fill="#3a7fc4"
        stroke="#1d4a77"
        strokeWidth="1.5"
      />
      <Label value={value} />
    </svg>
  );
}

/** Teal Combat Point gem carrying a CP amount. */
export function CpIcon({ value }: ValueIconProps) {
  return (
    <svg viewBox="0 0 32 32" className="dt-icon">
      <path
        d="M16 3l11 6.5v13L16 29 5 22.5v-13z"
        fill="#1f8b86"
        stroke="#0d4a47"
        strokeWidth="1.5"
      />
      <Label value={value} size={14} />
      <text
        x="26"
        y="23"
        textAnchor="middle"
        fontSize="8"
        fontWeight="700"
        fontFamily="'Barlow Semi Condensed', sans-serif"
        fill="#bff0ee"
      >
        CP
      </text>
    </svg>
  );
}

/** White card-back rectangle carrying a draw count. */
export function CardIcon({ value }: ValueIconProps) {
  return (
    <svg viewBox="0 0 32 32" className="dt-icon">
      <rect x="8" y="4" width="16" height="24" rx="2.5" fill="#f2f2f0" stroke="#111" strokeWidth="1.5" />
      <Label value={value} fill="#111" size={14} />
    </svg>
  );
}

/** Generic d6 used by "roll N dice" text. */
export function DieIcon() {
  return (
    <svg viewBox="0 0 32 32" className="dt-icon">
      <rect x="5" y="5" width="22" height="22" rx="5" fill="#e8e8e4" stroke="#111" strokeWidth="1.5" />
      {[
        [11, 11],
        [21, 11],
        [11, 21],
        [21, 21],
        [16, 16],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="2.2" fill="#111" />
      ))}
    </svg>
  );
}

/* ---------------------------------------------------------------- */
/* Hero die symbols                                                   */
/* ---------------------------------------------------------------- */

/** Wrapper giving every die symbol the same dark rounded tile. */
function SymbolTile({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 32 32" className="dt-icon dt-icon--tile">
      <rect x="1" y="1" width="30" height="30" rx="6" fill="#2b2b30" stroke="#000" strokeWidth="1" />
      {children}
    </svg>
  );
}

export function SwordIcon() {
  return (
    <SymbolTile>
      {/* Drawn upright, then rotated so the blade points up-right as printed. */}
      <g transform="rotate(45 16 16)">
        <path d="M16 3.5l2.6 4.4v11.4h-5.2V7.9z" fill="#e8c34a" />
        <rect x="10" y="19.3" width="12" height="2.6" rx="1.2" fill="#e8c34a" />
        <rect x="14.7" y="21.9" width="2.6" height="4.6" fill="#e8c34a" />
        <circle cx="16" cy="27.6" r="2" fill="#e8c34a" />
      </g>
    </SymbolTile>
  );
}

export function HelmetIcon() {
  return (
    <SymbolTile>
      <path
        d="M16 4.6c-4.7 0-7.7 3.5-7.7 8.5 0 4.8 1.7 8.7 3.8 11.2 1.2 1.5 2.5 2.5 3.9 3 1.4-.5 2.7-1.5 3.9-3 2.1-2.5 3.8-6.4 3.8-11.2 0-5-3-8.5-7.7-8.5z"
        fill="#b8d4ee"
      />
      {/* Eye slot and nose guard, in the tile colour so they read as cut-outs. */}
      <rect x="9.2" y="12.6" width="13.6" height="3.2" rx="0.6" fill="#2b2b30" />
      <rect x="14.7" y="12.6" width="2.6" height="12.4" rx="0.6" fill="#2b2b30" />
    </SymbolTile>
  );
}

export function LifeIcon() {
  return (
    <SymbolTile>
      <path
        d="M16 10c2-2.6 7-1.8 7.6 2.2.8 4.6-4 8.6-7.6 13.4-3.6-4.8-8.4-8.8-7.6-13.4C9 8.2 14 7.4 16 10z"
        fill="#e23b3b"
      />
    </SymbolTile>
  );
}

export function PrayerIcon() {
  return (
    <SymbolTile>
      {/* Open hand, fingers slanted up-right, with motion lines behind it. */}
      <g fill="#f0f0ee">
        <g transform="rotate(20 16 18)">
          <rect x="12.4" y="7.5" width="2.8" height="12" rx="1.4" />
          <rect x="15.6" y="6.2" width="2.8" height="13.3" rx="1.4" />
          <rect x="18.8" y="7.2" width="2.8" height="12.3" rx="1.4" />
          <rect x="21.9" y="9.4" width="2.8" height="10.1" rx="1.4" />
          <path d="M11.6 16.4h13.6v4.8c0 3.4-2.6 5.8-6.8 5.8s-6.8-2.4-6.8-5.8z" />
        </g>
      </g>
      <g stroke="#f0f0ee" strokeWidth="1.7" strokeLinecap="round">
        <path d="M6.2 9.5l3.2 2.6" />
        <path d="M5.4 15.2l3.6 0.6" />
        <path d="M9.4 5.2l1.8 3.1" />
      </g>
    </SymbolTile>
  );
}

/** Treant: a broken branch. */
export function BranchIcon() {
  return (
    <SymbolTile>
      <g transform="rotate(-35 16 16)" fill="#c2a06a">
        <rect x="13.4" y="6" width="5.2" height="20" rx="1.4" />
        <path d="M13.4 12.5l-4.6-3.2 1.4-2.2 3.2 2.6z" />
        <path d="M18.6 17l4.4-3 1.3 2.2-3.1 2.6z" />
      </g>
      <path d="M11 17.5l10-4" stroke="#8a6c3f" strokeWidth="1.2" />
    </SymbolTile>
  );
}

/** Treant: a leaf. */
export function LeafIcon() {
  return (
    <SymbolTile>
      <path
        d="M23.5 7.5C15 7.5 8.5 12.5 8.5 20c0 2.1.6 3.8 1.6 5 4-7.4 8.2-10.9 12.4-12.6-3.4 2.2-6.7 5.7-9.6 12.2 1.3.6 2.7.9 4.1.9 5.6 0 8.5-4.4 8.5-11 0-2.6-.6-5.2-2-8z"
        fill="#8ed06a"
      />
    </SymbolTile>
  );
}

/** Treant: the spiral of a nature spirit. */
export function SpiritIcon() {
  return (
    <SymbolTile>
      <path
        d="M16 25.5A9.5 9.5 0 1 1 25.5 16a7.3 7.3 0 0 1-7.3 7.3A5.6 5.6 0 0 1 12.6 17.7a4.3 4.3 0 0 1 4.3-4.3 3.3 3.3 0 0 1 3.3 3.3 2.5 2.5 0 0 1-2.5 2.5"
        fill="none"
        stroke="#e0a83a"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </SymbolTile>
  );
}

/** Ninja: the ninjato blade. */
export function NinjatoIcon() {
  return (
    <SymbolTile>
      <g transform="rotate(45 16 16)">
        <path d="M16 3.5l1.9 3.6v12.2h-3.8V7.1z" fill="#f2f6f4" />
        <rect x="11.6" y="19.3" width="8.8" height="2" rx="0.5" fill="#8fa89a" />
        <rect x="15" y="21.3" width="2" height="5.6" rx="0.6" fill="#3f4a44" />
      </g>
    </SymbolTile>
  );
}

/** Ninja: a four-pointed shuriken. */
export function ShurikenIcon() {
  return (
    <SymbolTile>
      <path
        d="M16 4l3 9 9 3-9 3-3 9-3-9-9-3 9-3z"
        fill="#bff0c8"
        transform="scale(0.82) translate(3.5 3.5)"
      />
      <circle cx="16" cy="16" r="1.5" fill="#2b2b30" />
    </SymbolTile>
  );
}

/** Ninja: a masked face. */
export function MaskIcon() {
  return (
    <SymbolTile>
      <circle cx="16" cy="16" r="10.5" fill="none" stroke="#7ce07c" strokeWidth="2" />
      <path d="M8.5 14.5c2.5-2 5-3 7.5-3s5 1 7.5 3c-2 3-4.6 4.5-7.5 4.5s-5.5-1.5-7.5-4.5z" fill="#7ce07c" opacity=".25" />
      <path d="M10.5 13.5c1.6-1.2 3-1.6 4.2-1.2.6.2.8.9.4 1.5-.9 1.3-2.2 1.9-3.8 1.7-.9-.1-1.3-1.2-.8-2z" fill="#7ce07c" />
      <path d="M21.5 13.5c-1.6-1.2-3-1.6-4.2-1.2-.6.2-.8.9-.4 1.5.9 1.3 2.2 1.9 3.8 1.7.9-.1 1.3-1.2.8-2z" fill="#7ce07c" />
      <path d="M11 20h10" stroke="#7ce07c" strokeWidth="1.8" strokeLinecap="round" />
    </SymbolTile>
  );
}

/** Shadow Thief: a dripping dagger. */
export function DaggerIcon() {
  return (
    <SymbolTile>
      <g transform="rotate(45 16 16)">
        <path d="M16 4l2.2 3.8v11.4h-4.4V7.8z" fill="#8de08a" />
        <rect x="11.4" y="19.2" width="9.2" height="2.2" rx="1.1" fill="#cfd6db" />
        <rect x="14.9" y="21.4" width="2.2" height="5.4" rx="1.1" fill="#cfd6db" />
      </g>
      <circle cx="9.2" cy="24.4" r="1.7" fill="#8de08a" />
    </SymbolTile>
  );
}

/** Shadow Thief: a coin bag. */
export function BagIcon() {
  return (
    <SymbolTile>
      <path
        d="M16 10.4c4.6 0 8 3.6 8 8.2 0 4.2-3.2 7-8 7s-8-2.8-8-7c0-4.6 3.4-8.2 8-8.2z"
        fill="#e7c15f"
      />
      <path d="M12.6 6.2h6.8l-1.6 4.4h-3.6z" fill="#c69a35" />
      <path d="M12.4 8.6h7.2" stroke="#8d6a1c" strokeWidth="1.5" strokeLinecap="round" />
    </SymbolTile>
  );
}

/** Shadow Thief: a card face. */
export function CardFaceIcon() {
  return (
    <SymbolTile>
      <rect x="9.5" y="6.5" width="13" height="19" rx="2" fill="#f0b8d4" stroke="#9c5f7c" strokeWidth="1.2" />
      <polygon points={burstPath(5, 5.2, 2.2)} fill="#8c3d61" />
    </SymbolTile>
  );
}

/** Shadow Thief: a cloaked figure in shadow. */
export function ShadowIcon() {
  return (
    <SymbolTile>
      <path
        d="M16 5.5c2.5 0 4.3 2 4.3 4.6 0 1.5-.6 2.8-1.6 3.7 2.9 1.2 4.8 4 4.8 7.4 0 3.2-3.1 5.3-7.5 5.3s-7.5-2.1-7.5-5.3c0-3.4 1.9-6.2 4.8-7.4a4.8 4.8 0 0 1-1.6-3.7c0-2.6 1.8-4.6 4.3-4.6z"
        fill="#efe9f5"
      />
    </SymbolTile>
  );
}

/** Pyromancer: a single flame. */
export function FlameIcon() {
  return (
    <SymbolTile>
      <path
        d="M16.6 5c.6 3.4-1.4 5-3.4 7.2-2.2 2.4-3.6 4.6-3.6 7.4 0 4 3 6.8 6.6 6.8s6.6-2.8 6.6-6.8c0-2.4-1-4.2-2.4-5.8.2 1.8-.4 3-1.6 3.6.8-4.6-.6-9.6-2.2-12.4z"
        fill="#f5c24a"
      />
      <path d="M16 16.4c1.6 1.6 2.4 3 2.4 4.4 0 1.7-1.1 2.8-2.4 2.8s-2.4-1.1-2.4-2.8c0-1.4.8-2.8 2.4-4.4z" fill="#fdf0c4" />
    </SymbolTile>
  );
}

/** Pyromancer: a sunburst blaze. */
export function BlazeIcon() {
  return (
    <SymbolTile>
      <polygon points={burstPath(8, 13, 6.2)} fill="#14100a" />
      <circle cx="16" cy="16" r="5.2" fill="#f5c24a" />
      <circle cx="16" cy="16" r="2.4" fill="#14100a" />
    </SymbolTile>
  );
}

/** Pyromancer: twin flames of the fiery soul. */
export function FierySoulIcon() {
  return (
    <SymbolTile>
      <g fill="#e8593a">
        <path d="M12.6 6.5c.4 2.6-1 3.8-2.4 5.5-1.5 1.8-2.4 3.4-2.4 5.5 0 3 2.1 5.1 4.8 5.1s4.8-2.1 4.8-5.1c0-1.8-.7-3.2-1.7-4.4.1 1.3-.3 2.3-1.1 2.7.6-3.5-.5-7.2-2-9.3z" />
        <path d="M21.8 10.5c.3 2.2-.9 3.2-2 4.6-1.3 1.5-2 2.9-2 4.6 0 2.5 1.8 4.3 4 4.3s4-1.8 4-4.3c0-1.5-.6-2.7-1.4-3.7.1 1.1-.3 1.9-1 2.3.5-2.9-.4-6-1.6-7.8z" />
      </g>
      <path d="M8 25.5h16" stroke="#e8593a" strokeWidth="1.6" strokeLinecap="round" />
    </SymbolTile>
  );
}

/** Pyromancer: a falling meteor. */
export function MeteorIcon() {
  return (
    <SymbolTile>
      <circle cx="21" cy="11" r="5.2" fill="#f5c24a" />
      <g stroke="#f5c24a" strokeWidth="2.1" strokeLinecap="round">
        <path d="M15.6 16.4L7.5 24.5" />
        <path d="M18.5 19.5l-4.5 4.5" />
        <path d="M11.5 12.5L7.5 16.5" />
      </g>
    </SymbolTile>
  );
}

/** Moon Elf: arrow on a drawn bow. */
export function ArrowIcon() {
  return (
    <SymbolTile>
      <g stroke="#7ec8e8" strokeWidth="2.2" strokeLinecap="round" fill="none">
        <path d="M8 24L24 8" />
        <path d="M17 8h7v7" />
        <path d="M8 16.5a8.5 8.5 0 0 0 7 7" />
      </g>
    </SymbolTile>
  );
}

/** Moon Elf: bare footprint. */
export function FootIcon() {
  return (
    <SymbolTile>
      <g fill="#f0b544">
        <path d="M17.6 12.4c2.6 0 4.4 2.2 4.4 5.2 0 3.6-2 7.6-5 7.6-2.4 0-4-1.6-4-4.2 0-3.6 1.8-8.6 4.6-8.6z" />
        <ellipse cx="11.4" cy="9.6" rx="1.7" ry="2.2" />
        <ellipse cx="15" cy="7.8" rx="1.6" ry="2.1" />
        <ellipse cx="18.6" cy="7.6" rx="1.5" ry="2" />
        <ellipse cx="21.8" cy="9" rx="1.4" ry="1.8" />
      </g>
    </SymbolTile>
  );
}

/** Moon Elf: crescent moon and star. */
export function MoonIcon() {
  return (
    <SymbolTile>
      <path
        d="M19.6 6.4a10 10 0 1 0 0 19.2 11 11 0 0 1 0-19.2z"
        fill="#eef6fb"
      />
      <polygon points={burstPath(4, 5.2, 2)} transform="translate(7 -4)" fill="#eef6fb" />
    </SymbolTile>
  );
}

/** Monk: closed fist. */
export function FistIcon() {
  return (
    <SymbolTile>
      <g fill="#efe7d6">
        <path d="M9 14.5c0-1.4 1-2.4 2.3-2.4h9.4c1.3 0 2.3 1 2.3 2.4v5.9c0 3.2-2.6 5.6-6.2 5.6h-1.6c-3.6 0-6.2-2.4-6.2-5.6z" />
        <rect x="11.4" y="8.2" width="3" height="5.2" rx="1.5" />
        <rect x="14.8" y="7.4" width="3" height="6" rx="1.5" />
        <rect x="18.2" y="8.4" width="3" height="5" rx="1.5" />
      </g>
      <path d="M11.5 18.5h9" stroke="#b9ad96" strokeWidth="1.3" strokeLinecap="round" />
    </SymbolTile>
  );
}

/** Monk: open palm. */
export function PalmIcon() {
  return (
    <SymbolTile>
      <g fill="#8fd18a">
        <rect x="10" y="9.5" width="2.8" height="10" rx="1.4" />
        <rect x="13.2" y="6.8" width="2.8" height="12.7" rx="1.4" />
        <rect x="16.4" y="6.2" width="2.8" height="13.3" rx="1.4" />
        <rect x="19.6" y="9" width="2.8" height="10.5" rx="1.4" />
        <path d="M9.6 17h12.8v3.9c0 3.1-2.6 5.3-6.4 5.3s-6.4-2.2-6.4-5.3z" />
      </g>
    </SymbolTile>
  );
}

/** Monk: yin-yang. */
export function ZenIcon() {
  return (
    <SymbolTile>
      <circle cx="16" cy="16" r="10.5" fill="#f2efe6" />
      <path d="M16 5.5a10.5 10.5 0 0 0 0 21 5.25 5.25 0 0 1 0-10.5 5.25 5.25 0 0 0 0-10.5z" fill="#2b2b30" />
      <circle cx="16" cy="10.75" r="1.9" fill="#f2efe6" />
      <circle cx="16" cy="21.25" r="1.9" fill="#2b2b30" />
    </SymbolTile>
  );
}

/** Monk: lotus blossom. */
export function LotusIcon() {
  return (
    <SymbolTile>
      <g fill="#e0708f">
        <path d="M16 7c2.4 2.6 3.4 5.4 3.4 8.4 0 3-1 5.6-3.4 8-2.4-2.4-3.4-5-3.4-8 0-3 1-5.8 3.4-8.4z" />
        <path d="M7.4 13.4c3.2.5 5.4 1.9 6.9 3.8 1.4 1.9 2 4 1.7 6.5-2.6-.4-4.6-1.5-6-3.3-1.5-1.9-2.3-4.2-2.6-7z" />
        <path d="M24.6 13.4c-3.2.5-5.4 1.9-6.9 3.8-1.4 1.9-2 4-1.7 6.5 2.6-.4 4.6-1.5 6-3.3 1.5-1.9 2.3-4.2 2.6-7z" />
      </g>
    </SymbolTile>
  );
}

/** Barbarian's "POW" face: a heavy impact star. */
export function PowIcon() {
  return (
    <SymbolTile>
      <polygon points={burstPath(9, 12.5, 5.2)} fill="#f2b021" />
      <polygon points={burstPath(9, 7.5, 3.1)} fill="#fde08a" />
    </SymbolTile>
  );
}

/* ---------------------------------------------------------------- */
/* Status effect tokens                                               */
/* ---------------------------------------------------------------- */

export function CritIcon() {
  return (
    <svg viewBox="0 0 32 32" className="dt-icon">
      <circle cx="16" cy="16" r="14" fill="#8e9aa6" stroke="#4a545e" strokeWidth="1.5" />
      <polygon points={burstPath(8, 11, 3.6)} fill="#fff" />
    </svg>
  );
}

export function ProtectIcon() {
  return (
    <svg viewBox="0 0 32 32" className="dt-icon">
      <circle cx="16" cy="16" r="14" fill="#2f3840" stroke="#161c21" strokeWidth="1.5" />
      <path d="M16 7l7 3v7c0 4-3.5 7-7 8-3.5-1-7-4-7-8v-7z" fill="#f2f6f8" />
      <path d="M16 11l2.6 4-2.6 5-2.6-5z" fill="#2f3840" />
    </svg>
  );
}

export function AccuracyIcon() {
  return (
    <svg viewBox="0 0 32 32" className="dt-icon">
      <circle cx="16" cy="16" r="14" fill="#5a6773" stroke="#333c45" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="9.5" fill="none" stroke="#e9eff4" strokeWidth="1.6" />
      <circle cx="16" cy="16" r="5.5" fill="none" stroke="#e9eff4" strokeWidth="1.6" />
      <circle cx="16" cy="16" r="2" fill="#e9eff4" />
      <path d="M26 6l-8 8" stroke="#e9eff4" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function RetributionIcon() {
  return (
    <svg viewBox="0 0 32 32" className="dt-icon">
      <circle cx="16" cy="16" r="14" fill="#c0272d" stroke="#7c1418" strokeWidth="1.5" />
      <path d="M8 8l16 16M24 8L8 24" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M16 6l3 5h-6z" fill="#fff" />
    </svg>
  );
}

export function SeedlingIcon() {
  return (
    <svg viewBox="0 0 32 32" className="dt-icon">
      <circle cx="16" cy="16" r="14" fill="#2c3a22" stroke="#141c0e" strokeWidth="1.5" />
      <path d="M16 6c4 4.2 6 7.6 6 10.8 0 3.6-2.6 6.2-6 6.2s-6-2.6-6-6.2C10 13.6 12 10.2 16 6z" fill="#b9e06a" />
      <ellipse cx="13.6" cy="15.5" rx="1.5" ry="2.2" fill="#f3fbe2" />
      <ellipse cx="18.4" cy="15.5" rx="1.5" ry="2.2" fill="#f3fbe2" />
    </svg>
  );
}

export function SaplingIcon() {
  return (
    <svg viewBox="0 0 32 32" className="dt-icon">
      <circle cx="16" cy="16" r="14" fill="#6b3f96" stroke="#3a1f57" strokeWidth="1.5" />
      <path d="M16 8c4.4 2.2 6.8 5 6.8 8.4 0 4-3 6.8-6.8 6.8s-6.8-2.8-6.8-6.8c0-3.4 2.4-6.2 6.8-8.4z" fill="#b9e06a" />
      <path d="M9.6 12.5c2.8-1.4 5.2-1.2 7.2.6-2.8.5-5.2.2-7.2-.6z" fill="#8ec24a" />
      <ellipse cx="14" cy="16.5" rx="1.4" ry="2" fill="#2b2b30" />
      <ellipse cx="18" cy="16.5" rx="1.4" ry="2" fill="#2b2b30" />
    </svg>
  );
}

export function DryadIcon() {
  return (
    <svg viewBox="0 0 32 32" className="dt-icon">
      <circle cx="16" cy="16" r="14" fill="#2f5c25" stroke="#163011" strokeWidth="1.5" />
      <path d="M16 6.5c3.6 2.6 5.6 5.6 5.6 8.8 0 4.4-2.4 7.6-5.6 9.2-3.2-1.6-5.6-4.8-5.6-9.2 0-3.2 2-6.2 5.6-8.8z" fill="#9fd36a" />
      <path d="M10.6 11c2.4-.8 4.2-.4 5.4 1.2-2.4.3-4.2-.1-5.4-1.2z" fill="#6ea83e" />
      <path d="M21.4 11c-2.4-.8-4.2-.4-5.4 1.2 2.4.3 4.2-.1 5.4-1.2z" fill="#6ea83e" />
      <ellipse cx="14" cy="15.5" rx="1.3" ry="1.9" fill="#1c3b16" />
      <ellipse cx="18" cy="15.5" rx="1.3" ry="1.9" fill="#1c3b16" />
    </svg>
  );
}

export function BarbedVineIcon() {
  return (
    <svg viewBox="0 0 32 32" className="dt-icon">
      <circle cx="16" cy="16" r="14" fill="#b32026" stroke="#650e12" strokeWidth="1.5" />
      <g stroke="#fbe6e7" strokeWidth="2" strokeLinecap="round" fill="none">
        <path d="M9 7c3 5 6 9 14 11" />
        <path d="M12.5 9.5l-2.8 1.6" />
        <path d="M16.5 14l-2 2.6" />
        <path d="M20.5 16.5l-1.2 3" />
      </g>
      <path d="M11 20.5c1.4 2.2 1.2 4-0.6 5.4-1.8-1.4-2-3.2-0.6-5.4z" fill="#fbe6e7" />
    </svg>
  );
}

export function WellspringIcon() {
  return (
    <svg viewBox="0 0 32 32" className="dt-icon">
      <circle cx="16" cy="16" r="14" fill="#8fdcd0" stroke="#3b8b80" strokeWidth="1.5" />
      <path d="M16 6.5c3.2 3.4 5 6.1 5 8.3 0 2.8-2.2 4.8-5 4.8s-5-2-5-4.8c0-2.2 1.8-4.9 5-8.3z" fill="#f2fffd" />
      <g stroke="#f2fffd" strokeWidth="1.8" strokeLinecap="round" fill="none">
        <path d="M7 22c2-1.6 4-1.6 6 0s4 1.6 6 0 4-1.6 6 0" />
        <path d="M7 26c2-1.6 4-1.6 6 0s4 1.6 6 0 4-1.6 6 0" />
      </g>
    </svg>
  );
}

export function DelayedPoisonIcon() {
  return (
    <svg viewBox="0 0 32 32" className="dt-icon">
      <circle cx="16" cy="16" r="14" fill="#c9d93a" stroke="#79860f" strokeWidth="1.5" />
      <path d="M16 2a14 14 0 0 1 0 28z" fill="#d1453c" />
      <path d="M13.6 6h4.8v3.8l3.8 8.8c.9 2.2-.7 4.6-3.2 4.6h-6c-2.5 0-4.1-2.4-3.2-4.6l3.8-8.8z" fill="#fbfde8" />
      <circle cx="16" cy="18" r="3" fill="#5c6a0c" />
      <circle cx="14.8" cy="17.2" r="0.8" fill="#fbfde8" />
      <circle cx="17.2" cy="17.2" r="0.8" fill="#fbfde8" />
    </svg>
  );
}

export function SmokeBombIcon() {
  return (
    <svg viewBox="0 0 32 32" className="dt-icon">
      <circle cx="16" cy="16" r="14" fill="#5a6168" stroke="#2e3338" strokeWidth="1.5" />
      <g fill="#f1f4f6">
        <circle cx="11" cy="14" r="4.6" />
        <circle cx="17" cy="11.5" r="5.4" />
        <circle cx="22" cy="15" r="4.2" />
        <rect x="6.5" y="14" width="19" height="6" rx="3" />
      </g>
      <g stroke="#f1f4f6" strokeWidth="1.6" strokeLinecap="round">
        <path d="M10 23v2.5M16 23.5v2.5M22 23v2.5" />
      </g>
    </svg>
  );
}

export function NinjutsuIcon() {
  return (
    <svg viewBox="0 0 32 32" className="dt-icon">
      <circle cx="16" cy="16" r="14" fill="#1f3b26" stroke="#0e1f13" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="9.5" fill="none" stroke="#7ce07c" strokeWidth="1.8" />
      <path d="M11 14.4c1.5-1.1 2.8-1.5 3.9-1.1.6.2.7.9.3 1.4-.8 1.2-2 1.7-3.5 1.6-.8-.1-1.2-1.2-.7-1.9z" fill="#7ce07c" />
      <path d="M21 14.4c-1.5-1.1-2.8-1.5-3.9-1.1-.6.2-.7.9-.3 1.4.8 1.2 2 1.7 3.5 1.6.8-.1 1.2-1.2.7-1.9z" fill="#7ce07c" />
    </svg>
  );
}

export function ShadowsIcon() {
  return (
    <svg viewBox="0 0 32 32" className="dt-icon">
      <circle cx="16" cy="16" r="14" fill="#6b3f96" stroke="#3a1f57" strokeWidth="1.5" />
      <path
        d="M16 7c2.3 0 4 1.9 4 4.3 0 1.4-.6 2.6-1.5 3.4 2.7 1.1 4.4 3.7 4.4 6.9 0 2.9-2.8 4.9-6.9 4.9s-6.9-2-6.9-4.9c0-3.2 1.7-5.8 4.4-6.9a4.5 4.5 0 0 1-1.5-3.4C12 8.9 13.7 7 16 7z"
        fill="#f2ecf8"
      />
    </svg>
  );
}

export function SneakAttackIcon() {
  return (
    <svg viewBox="0 0 32 32" className="dt-icon">
      <circle cx="16" cy="16" r="14" fill="#1c1c20" stroke="#000" strokeWidth="1.5" />
      <circle cx="13.6" cy="8.8" r="2.6" fill="#fff" />
      <path d="M9.8 13.2h5.6v8.4l2.4 5.4h-2.8l-2.2-4.8-3 4.8H7l2.8-5.4z" fill="#fff" />
      <path d="M17 17.5l8-7.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M22.5 8.5l3 3" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function PoisonIcon() {
  return (
    <svg viewBox="0 0 32 32" className="dt-icon">
      <circle cx="16" cy="16" r="14" fill="#4bbd4a" stroke="#227021" strokeWidth="1.5" />
      <path d="M13.4 5.5h5.2v4.2l4.2 9.6c1 2.4-.8 5-3.5 5h-6.6c-2.7 0-4.5-2.6-3.5-5l4.2-9.6z" fill="#f0fbef" />
      <circle cx="16" cy="18.5" r="3.4" fill="#2b7a2a" />
      <circle cx="14.6" cy="17.6" r="0.9" fill="#f0fbef" />
      <circle cx="17.4" cy="17.6" r="0.9" fill="#f0fbef" />
      <path d="M14.4 21.2h3.2" stroke="#f0fbef" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function BurnIcon() {
  return (
    <svg viewBox="0 0 32 32" className="dt-icon">
      <circle cx="16" cy="16" r="14" fill="#f08a1e" stroke="#96500a" strokeWidth="1.5" />
      <path
        d="M17.4 6.6c.7 3.8-1.5 5.5-3.8 8-2.4 2.6-4 5-4 8 0 .6.1 1.2.2 1.8 1.6 1.6 4.2 2.6 6.6 2.2-1.6-1.4-2-3.2-1.2-4.8.8 1.6 2.2 2.4 3.6 2.2-1.4-2.6-.4-5 1.8-7-.2 2.6 1 4.4 2.6 5.4a10 10 0 0 0-5.8-15.8z"
        fill="#fff6e8"
      />
    </svg>
  );
}

export function FireMasteryIcon() {
  return (
    <svg viewBox="0 0 32 32" className="dt-icon">
      <circle cx="16" cy="16" r="14" fill="#cf3a1e" stroke="#7d1c08" strokeWidth="1.5" />
      <path
        d="M16 6.5c3 3 4.6 5.4 4.6 8 0 1.6-.7 2.9-1.8 3.7.4-2.2-.4-3.8-1.6-4.8.5 3.6-1 5.6-3.2 7.2 1 .3 2 .2 2.9-.3-.6 2-2.4 3.2-4.6 3.2 2.1 1.9 5 2.4 7.6 1.3 2.8-1.2 4.5-3.9 4.5-7 0-4.3-3.2-8.2-8.4-11.3z"
        fill="#ffe6d2"
      />
      <path d="M8 22c2.6 3.2 13.4 3.2 16 0-2.6 4.6-13.4 4.6-16 0z" fill="#ffe6d2" opacity=".8" />
    </svg>
  );
}

export function BlindIcon() {
  return (
    <svg viewBox="0 0 32 32" className="dt-icon">
      <circle cx="16" cy="16" r="14" fill="#2c3a44" stroke="#141d24" strokeWidth="1.5" />
      <path d="M4.5 16c3.2-4.6 7-6.9 11.5-6.9S24.3 11.4 27.5 16c-3.2 4.6-7 6.9-11.5 6.9S7.7 20.6 4.5 16z" fill="#e9f1f6" />
      <circle cx="16" cy="16" r="4.6" fill="#2c3a44" />
      <polygon points={burstPath(10, 4.6, 1.8)} fill="#e9f1f6" />
    </svg>
  );
}

export function EntangleIcon() {
  return (
    <svg viewBox="0 0 32 32" className="dt-icon">
      <circle cx="16" cy="16" r="14" fill="#6b4a33" stroke="#3a281a" strokeWidth="1.5" />
      <g fill="none" stroke="#f4e8da" strokeWidth="1.8" strokeLinecap="round">
        <path d="M9 12c4-3 10-3 14 0-3 1.6-5 4-6 7" />
        <path d="M23 20c-4 3-10 3-14 0 3-1.6 5-4 6-7" />
        <path d="M11 22c3-1 6-4 7-7" />
      </g>
    </svg>
  );
}

export function TargetedIcon() {
  return (
    <svg viewBox="0 0 32 32" className="dt-icon">
      <circle cx="16" cy="16" r="14" fill="#b32630" stroke="#6d1219" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="9" fill="none" stroke="#fbeaec" strokeWidth="1.6" />
      <circle cx="15.4" cy="13" r="2.6" fill="#fbeaec" />
      <path d="M11.6 24c0-3 1.7-5 3.8-5s3.8 2 3.8 5z" fill="#fbeaec" />
      <g stroke="#fbeaec" strokeWidth="1.8" strokeLinecap="round">
        <path d="M16 3.5v3.2M16 25.3v3.2M3.5 16h3.2M25.3 16h3.2" />
      </g>
    </svg>
  );
}

export function ChiIcon() {
  return (
    <svg viewBox="0 0 32 32" className="dt-icon">
      <circle cx="16" cy="16" r="14" fill="#e8c266" stroke="#8a6b1d" strokeWidth="1.5" />
      <circle cx="16" cy="15" r="7.5" fill="#f6ecd2" />
      <path d="M16 7.5a7.5 7.5 0 0 0 0 15 3.75 3.75 0 0 1 0-7.5 3.75 3.75 0 0 0 0-7.5z" fill="#3a2d0c" />
      <path d="M8 23c2.4 3 13.6 3 16 0-2.4 4.6-13.6 4.6-16 0z" fill="#3a2d0c" />
    </svg>
  );
}

export function EvasiveIcon() {
  return (
    <svg viewBox="0 0 32 32" className="dt-icon">
      <circle cx="16" cy="16" r="14" fill="#2f66b5" stroke="#16386b" strokeWidth="1.5" />
      <path d="M15 9l9 7-9 7v-4h-3v-6h3z" fill="#eaf2fd" />
      <g stroke="#eaf2fd" strokeWidth="1.8" strokeLinecap="round">
        <path d="M8 12.5h2.6" />
        <path d="M7 16h3.2" />
        <path d="M8 19.5h2.6" />
      </g>
    </svg>
  );
}

export function KnockdownIcon() {
  return (
    <svg viewBox="0 0 32 32" className="dt-icon">
      <circle cx="16" cy="16" r="14" fill="#f0a323" stroke="#9c6408" strokeWidth="1.5" />
      <circle cx="20.5" cy="10.5" r="2.4" fill="#fff" />
      <path d="M9 20.5l8-4.5 5.5 1.5-1 3-4-1-6 3.5z" fill="#fff" />
      <g stroke="#fff" strokeWidth="1.7" strokeLinecap="round">
        <path d="M8 24.5h4" />
        <path d="M6.5 12l2.4 2" />
      </g>
    </svg>
  );
}

export function CleanseIcon() {
  return (
    <svg viewBox="0 0 32 32" className="dt-icon">
      <circle cx="16" cy="16" r="14" fill="#3ba9a3" stroke="#186a66" strokeWidth="1.5" />
      <path
        d="M16 8.5c3.4 3.2 5.2 6 5.2 8.6 0 3-2.3 5.2-5.2 5.2s-5.2-2.2-5.2-5.2c0-2.6 1.8-5.4 5.2-8.6z"
        fill="#eafaf8"
      />
      <path
        d="M24 16a8 8 0 0 1-8 8"
        fill="none"
        stroke="#eafaf8"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function StunIcon() {
  return (
    <svg viewBox="0 0 32 32" className="dt-icon">
      <circle cx="16" cy="16" r="14" fill="#1d3a63" stroke="#0d1f39" strokeWidth="1.5" />
      <path
        d="M16 8.5a7.5 7.5 0 1 1-7.3 9.2 5.8 5.8 0 0 1 5.6-7.1 4.4 4.4 0 0 1 4.3 5.4 3.2 3.2 0 0 1-3.2 2.4"
        fill="none"
        stroke="#dbe9fb"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ConcussionIcon() {
  return (
    <svg viewBox="0 0 32 32" className="dt-icon">
      <circle cx="16" cy="16" r="14" fill="#c8362b" stroke="#7d1c14" strokeWidth="1.5" />
      <path
        d="M11 25v-4c-2.4-1.3-3.8-3.7-3.8-6.4C7.2 10.3 10.8 7 15.4 7c4.3 0 7.6 2.8 7.6 6.6 0 2-1 3.4-2.4 4.4v2.2h-2.2V25z"
        fill="#f7e2df"
      />
      <path d="M16.8 10.5l-2.6 4.4h2.8l-2.4 4.2" fill="none" stroke="#c8362b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BlessingIcon() {
  return (
    <svg viewBox="0 0 32 32" className="dt-icon">
      <circle cx="16" cy="16" r="14" fill="#2f6f68" stroke="#17403c" strokeWidth="1.5" />
      <path
        d="M16 9c1.6-2 5-1.2 5.4 1.6.6 3.4-3.4 6.4-5.4 9.8-2-3.4-6-6.4-5.4-9.8C11 7.8 14.4 7 16 9z"
        fill="#e6f5f2"
      />
      <path d="M6 20c4 4 16 4 20 0-4 6-16 6-20 0z" fill="#e6f5f2" opacity=".85" />
    </svg>
  );
}

/* ---------------------------------------------------------------- */
/* Card-frame icons                                                   */
/* ---------------------------------------------------------------- */

export function StarIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 32 32" className="dt-rail-icon">
      <polygon points={burstPath(5, 15, 6.4)} fill={color} />
    </svg>
  );
}

export function UpgradeArrowIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 32 32" className="dt-rail-icon">
      <path d="M16 3l10 11h-5.5v15h-9V14H6z" fill={color} />
    </svg>
  );
}

export function MainPhaseIcon() {
  return (
    <svg viewBox="0 0 32 32" className="dt-rail-icon">
      <circle cx="16" cy="16" r="13" fill="#1f7fd0" stroke="#0d3f6b" strokeWidth="1.5" />
      <text
        x="16"
        y="17"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="17"
        fontWeight="800"
        fontFamily="'Oswald', sans-serif"
        fill="#fff"
      >
        M
      </text>
    </svg>
  );
}

export function RollPhaseIcon() {
  return (
    <svg viewBox="0 0 32 32" className="dt-rail-icon">
      <rect x="4" y="4" width="24" height="24" rx="5.5" fill="#efe6d8" stroke="#6b5b43" strokeWidth="1.5" />
      {[
        [11, 11],
        [21, 11],
        [11, 21],
        [21, 21],
        [16, 16],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="2.4" fill="#3a3024" />
      ))}
    </svg>
  );
}

export function InstantIcon() {
  return (
    <svg viewBox="0 0 32 32" className="dt-rail-icon">
      <rect x="5" y="3" width="22" height="26" rx="3" fill="#d8262c" stroke="#7c1418" strokeWidth="1.5" />
      <rect x="14" y="8" width="4" height="11" rx="2" fill="#fff" />
      <circle cx="16" cy="23" r="2.3" fill="#fff" />
    </svg>
  );
}
