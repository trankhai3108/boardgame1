/**
 * Moon Elf hero cards.
 *
 * Generated from zhuanggenhua/BoardGame (MIT). Rules text is faithful;
 * card names there are a Chinese round-trip and do not always match the
 * names printed on the English cards.
 */
import type { Card } from '../../engine/types';

export const MOON_ELF_CARDS: Card[] = [
  {
    id: 'moon-elf-moon-shadow-strike',
    name: 'Moon Shadow Strike',
    type: 'mainPhase',
    cp: 0,
    copies: 1,
    text: [
      'Roll 1 die: Moon -> Inflict Blind, Entangle, and Targeted.',
      'Otherwise -> Draw 1 card.',
    ],
    art: '/cards/moon-elf/moon-elf-moon-shadow-strike.webp',
  },
  {
    id: 'moon-elf-dodge',
    name: 'Dodge!',
    type: 'instant',
    cp: 1,
    copies: 1,
    text: [
      'Gain 1 Evasive token.',
    ],
    art: '/cards/moon-elf/moon-elf-dodge.webp',
  },
  {
    id: 'moon-elf-volley',
    name: 'Volley!',
    type: 'rollPhase',
    cp: 1,
    copies: 1,
    text: [
      'Attack Modifier.',
      'Roll 5 dice: add damage equal to the number of Arrows.',
      'Inflict Entangle.',
    ],
    art: '/cards/moon-elf/moon-elf-volley.webp',
  },
  {
    id: 'moon-elf-watch-out',
    name: 'Watch Out!',
    type: 'rollPhase',
    cp: 0,
    copies: 1,
    text: [
      'Attack Modifier.',
      'Roll 1 die: Arrow -> +2 damage;',
      'Foot -> Inflict Entangle;',
      'Moon -> Inflict Blind.',
    ],
    art: '/cards/moon-elf/moon-elf-watch-out.webp',
  },
  {
    id: 'moon-elf-moonlight-magic',
    name: 'Moonlight Magic!',
    type: 'mainPhase',
    cp: 4,
    copies: 1,
    text: [
      'Gain Evasive.',
      'Inflict Blind, Entangle, and Targeted on opponent.',
    ],
    art: '/cards/moon-elf/moon-elf-moonlight-magic.webp',
  },
  {
    id: 'moon-elf-upgrade-elusive-step-2',
    name: 'Missed Me II',
    type: 'upgrade',
    cp: 3,
    copies: 1,
    text: [
      'Upgrade Missed Me to level II.',
    ],
    upgrades: 'missed-me',
    upgradeLevel: 'II',
  },
  {
    id: 'moon-elf-upgrade-eclipse-2',
    name: 'Eclipse II',
    type: 'upgrade',
    cp: 2,
    copies: 1,
    text: [
      'Upgrade Eclipse to level II.',
    ],
    upgrades: 'eclipse',
    upgradeLevel: 'II',
  },
  {
    id: 'moon-elf-upgrade-blinding-shot-2',
    name: 'Blinding Shot II',
    type: 'upgrade',
    cp: 2,
    copies: 1,
    text: [
      'Upgrade Blinding Shot to level II.',
    ],
    upgrades: 'blinding-shot',
    upgradeLevel: 'II',
  },
  {
    id: 'moon-elf-upgrade-entangling-shot-2',
    name: 'Entangling Shot II',
    type: 'upgrade',
    cp: 2,
    copies: 1,
    text: [
      'Upgrade Entangling Shot to level II.',
    ],
    upgrades: 'entangling-shot',
    upgradeLevel: 'II',
  },
  {
    id: 'moon-elf-upgrade-exploding-arrow-3',
    name: 'Exploding Arrow III',
    type: 'upgrade',
    cp: 3,
    copies: 1,
    text: [
      'Upgrade Exploding Arrow to level III.',
    ],
    upgrades: 'exploding-arrow',
    upgradeLevel: 'III',
  },
  {
    id: 'moon-elf-upgrade-exploding-arrow-2',
    name: 'Exploding Arrow II',
    type: 'upgrade',
    cp: 2,
    copies: 1,
    text: [
      'Upgrade Exploding Arrow to level II.',
    ],
    upgrades: 'exploding-arrow',
    upgradeLevel: 'II',
  },
  {
    id: 'moon-elf-upgrade-covering-fire-2',
    name: 'Covered Shot II',
    type: 'upgrade',
    cp: 2,
    copies: 1,
    text: [
      'Upgrade Covered Shot to level II.',
    ],
    upgrades: 'covered-shot',
    upgradeLevel: 'II',
  },
  {
    id: 'moon-elf-upgrade-deadeye-shot-2',
    name: 'Demising Shot II',
    type: 'upgrade',
    cp: 2,
    copies: 1,
    text: [
      'Upgrade Demising Shot to level II.',
    ],
    upgrades: 'demising-shot',
    upgradeLevel: 'II',
  },
  {
    id: 'moon-elf-upgrade-longbow-3',
    name: 'Longbow III',
    type: 'upgrade',
    cp: 3,
    copies: 1,
    text: [
      'Upgrade Longbow to level III.',
    ],
    upgrades: 'longbow',
    upgradeLevel: 'III',
  },
  {
    id: 'moon-elf-upgrade-longbow-2',
    name: 'Longbow II',
    type: 'upgrade',
    cp: 2,
    copies: 1,
    text: [
      'Upgrade Longbow to level II.',
    ],
    upgrades: 'longbow',
    upgradeLevel: 'II',
  },
];
