/**
 * Card and ability text is authored with inline icon markup so the rendered
 * text matches the printed components:
 *
 *   'Deal [[dmg:5]] dmg & roll [[die:2]]:'  ->  Deal (5) dmg & roll 2 [die]:
 *
 * Supported tokens: dmg, heal, prevent, cp, card, die, sword, helmet, life, prayer,
 * crit, protect, accuracy, retribution, blessing, pow, fist,
 * palm, zen, lotus, arrow, foot, moon, chi, evasive, knockdown, cleanse, stun,
 * concussion, blind, entangle, targeted, flame, blaze, fierysoul, meteor, burn,
 * firemastery, dagger, bag, cardsym, shadow, shadows, sneakattack, poison,
 * ninjato, shuriken, mask, delayedpoison, smokebomb, ninjutsu, branch, leaf,
 * spirit, seedling, sapling, dryad, barbedvine, wellspring.
 *
 * Note: `card` is the draw-a-card icon; the Shadow Thief die face is `cardsym`.
 * `*text*` renders italic, matching the italicised status-effect names on cards.
 */
import { Fragment, type ReactNode } from 'react';
import {
  AccuracyIcon,
  ArrowIcon,
  BlazeIcon,
  BlindIcon,
  BagIcon,
  BarbedVineIcon,
  BranchIcon,
  BurnIcon,
  CardFaceIcon,
  BlessingIcon,
  ChiIcon,
  CleanseIcon,
  ConcussionIcon,
  EntangleIcon,
  FierySoulIcon,
  FireMasteryIcon,
  FlameIcon,
  CardIcon,
  CpIcon,
  CritIcon,
  DieIcon,
  DaggerIcon,
  DelayedPoisonIcon,
  DryadIcon,
  DmgIcon,
  EvasiveIcon,
  FistIcon,
  FootIcon,
  HealIcon,
  HelmetIcon,
  KnockdownIcon,
  LifeIcon,
  LotusIcon,
  MeteorIcon,
  LeafIcon,
  MaskIcon,
  MoonIcon,
  NinjatoIcon,
  NinjutsuIcon,
  PoisonIcon,
  PalmIcon,
  PowIcon,
  PrayerIcon,
  PreventIcon,
  ProtectIcon,
  RetributionIcon,
  SaplingIcon,
  SeedlingIcon,
  ShadowIcon,
  ShurikenIcon,
  SmokeBombIcon,
  SpiritIcon,
  ShadowsIcon,
  SneakAttackIcon,
  StunIcon,
  SwordIcon,
  TargetedIcon,
  WellspringIcon,
  ZenIcon,
} from './icons';

const VALUE_ICONS: Record<string, (v?: string) => ReactNode> = {
  dmg: (v) => <DmgIcon value={v} />,
  heal: (v) => <HealIcon value={v} />,
  cp: (v) => <CpIcon value={v} />,
  prevent: (v) => <PreventIcon value={v} />,
  card: (v) => <CardIcon value={v ?? 1} />,
};

const PLAIN_ICONS: Record<string, () => ReactNode> = {
  die: () => <DieIcon />,
  sword: () => <SwordIcon />,
  helmet: () => <HelmetIcon />,
  life: () => <LifeIcon />,
  prayer: () => <PrayerIcon />,
  pow: () => <PowIcon />,
  fist: () => <FistIcon />,
  palm: () => <PalmIcon />,
  zen: () => <ZenIcon />,
  lotus: () => <LotusIcon />,
  arrow: () => <ArrowIcon />,
  foot: () => <FootIcon />,
  moon: () => <MoonIcon />,
  flame: () => <FlameIcon />,
  blaze: () => <BlazeIcon />,
  fierysoul: () => <FierySoulIcon />,
  meteor: () => <MeteorIcon />,
  dagger: () => <DaggerIcon />,
  bag: () => <BagIcon />,
  cardsym: () => <CardFaceIcon />,
  shadow: () => <ShadowIcon />,
  ninjato: () => <NinjatoIcon />,
  shuriken: () => <ShurikenIcon />,
  mask: () => <MaskIcon />,
  branch: () => <BranchIcon />,
  leaf: () => <LeafIcon />,
  spirit: () => <SpiritIcon />,
  crit: () => <CritIcon />,
  protect: () => <ProtectIcon />,
  accuracy: () => <AccuracyIcon />,
  retribution: () => <RetributionIcon />,
  blessing: () => <BlessingIcon />,
  stun: () => <StunIcon />,
  concussion: () => <ConcussionIcon />,
  chi: () => <ChiIcon />,
  evasive: () => <EvasiveIcon />,
  knockdown: () => <KnockdownIcon />,
  cleanse: () => <CleanseIcon />,
  blind: () => <BlindIcon />,
  entangle: () => <EntangleIcon />,
  targeted: () => <TargetedIcon />,
  burn: () => <BurnIcon />,
  firemastery: () => <FireMasteryIcon />,
  shadows: () => <ShadowsIcon />,
  sneakattack: () => <SneakAttackIcon />,
  poison: () => <PoisonIcon />,
  delayedpoison: () => <DelayedPoisonIcon />,
  smokebomb: () => <SmokeBombIcon />,
  ninjutsu: () => <NinjutsuIcon />,
  seedling: () => <SeedlingIcon />,
  sapling: () => <SaplingIcon />,
  dryad: () => <DryadIcon />,
  barbedvine: () => <BarbedVineIcon />,
  wellspring: () => <WellspringIcon />,
};

const TOKEN_SOURCE = /\[\[([a-z]+)(?::([^\]]+))?\]\]|\*([^*]+)\*/g;

/** Turn one authored line into React nodes with icons and italics inlined. */
export function renderMarkup(line: string): ReactNode {
  const out: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  // A fresh regex per call, so recursive calls don't share lastIndex.
  const token = new RegExp(TOKEN_SOURCE.source, 'g');
  while ((match = token.exec(line)) !== null) {
    if (match.index > last) out.push(line.slice(last, match.index));

    const [, name, value, italic] = match;
    if (italic !== undefined) {
      // Italic runs can themselves contain icon tokens, so recurse.
      out.push(<em key={key++}>{renderMarkup(italic)}</em>);
    } else if (name in VALUE_ICONS) {
      out.push(<Fragment key={key++}>{VALUE_ICONS[name](value)}</Fragment>);
    } else if (name in PLAIN_ICONS) {
      // 'die:2' renders the count before the die, as the cards print it.
      if (value) out.push(`${value} `);
      out.push(<Fragment key={key++}>{PLAIN_ICONS[name]()}</Fragment>);
    } else {
      // Unknown token: show it raw so the gap is obvious during authoring.
      out.push(match[0]);
    }
    last = match.index + match[0].length;
  }

  if (last < line.length) out.push(line.slice(last));
  return out;
}
