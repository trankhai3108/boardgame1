/**
 * Ninja hero cards.
 *
 * Generated from zhuanggenhua/BoardGame (MIT). Rules text is faithful;
 * card names there are a Chinese round-trip and do not always match the
 * names printed on the English cards.
 */
import type { Card } from '../../engine/types';

export const NINJA_CARDS: Card[] = [
  {
    id: 'ninja-ninja-card-training',
    name: 'Training!',
    type: 'mainPhase',
    cp: 0,
    copies: 1,
    text: [
      'Gain 1 Ninjutsu.',
    ],
    art: '/cards/ninja/ninja-ninja-card-training.webp',
  },
  {
    id: 'ninja-upgrade-blink-2',
    name: 'Shade Shift II',
    type: 'upgrade',
    cp: 2,
    copies: 1,
    text: [
      'Upgrade Shade Shift to level II.',
    ],
    upgrades: 'shade-shift',
    upgradeLevel: 'II',
  },
  {
    id: 'ninja-upgrade-going-forward-2',
    name: 'Walk the Line II',
    type: 'upgrade',
    cp: 2,
    copies: 1,
    text: [
      'Upgrade Walk the Line to level II.',
    ],
    upgrades: 'walk-the-line',
    upgradeLevel: 'II',
  },
  {
    id: 'ninja-upgrade-slash-2',
    name: 'Slash II',
    type: 'upgrade',
    cp: 2,
    copies: 1,
    text: [
      'Upgrade Slash to level II.',
    ],
    upgrades: 'slash',
    upgradeLevel: 'II',
  },
  {
    id: 'ninja-upgrade-shadow-step-2',
    name: 'Shadewalk II',
    type: 'upgrade',
    cp: 2,
    copies: 1,
    text: [
      'Upgrade Shadewalk to level II.',
    ],
    upgrades: 'shadewalk',
    upgradeLevel: 'II',
  },
  {
    id: 'ninja-ninja-card-shuriken',
    name: 'Shuriken!',
    type: 'rollPhase',
    cp: 1,
    copies: 1,
    text: [
      'Roll 5 dice;',
      'each Ninjatō adds +1 attack damage.',
    ],
    art: '/cards/ninja/ninja-ninja-card-shuriken.webp',
  },
  {
    id: 'ninja-ninja-card-escape',
    name: 'Escape!',
    type: 'instant',
    cp: 0,
    copies: 1,
    text: [
      'Play after being attacked;',
      'reduce damage or gain Smoke Bomb by die result.',
    ],
    art: '/cards/ninja/ninja-ninja-card-escape.webp',
  },
  {
    id: 'ninja-ninja-card-poison-dart',
    name: 'Poison Dart!',
    type: 'mainPhase',
    cp: 2,
    copies: 1,
    text: [
      'Apply 1 Delayed Poison.',
    ],
    art: '/cards/ninja/ninja-ninja-card-poison-dart.webp',
  },
  {
    id: 'ninja-ninja-card-knife-fan',
    name: 'Knife Fan!',
    type: 'mainPhase',
    cp: 2,
    copies: 1,
    text: [
      'Deal 1 undefendable damage.',
    ],
    art: '/cards/ninja/ninja-ninja-card-knife-fan.webp',
  },
  {
    id: 'ninja-upgrade-smoke-screen-2',
    name: 'Smoke Screen II',
    type: 'upgrade',
    cp: 2,
    copies: 1,
    text: [
      'Upgrade Smoke Screen to level II.',
    ],
    upgrades: 'smoke-screen',
    upgradeLevel: 'II',
  },
  {
    id: 'ninja-upgrade-shadow-fang-2',
    name: 'Shadow Fang II',
    type: 'upgrade',
    cp: 2,
    copies: 1,
    text: [
      'Upgrade Shadow Fang to level II.',
    ],
    upgrades: 'shadow-fang',
    upgradeLevel: 'II',
  },
  {
    id: 'ninja-upgrade-poison-blade-2',
    name: 'Poison Blade II',
    type: 'upgrade',
    cp: 2,
    copies: 1,
    text: [
      'Upgrade Poison Blade to level II.',
    ],
    upgrades: 'poison-blade',
    upgradeLevel: 'II',
  },
  {
    id: 'ninja-upgrade-death-blossom-2',
    name: 'Death Blossom II',
    type: 'upgrade',
    cp: 2,
    copies: 1,
    text: [
      'Upgrade Death Blossom to level II.',
    ],
    upgrades: 'death-blossom',
    upgradeLevel: 'II',
  },
  {
    id: 'ninja-ninja-card-vanish',
    name: 'Vanish!',
    type: 'instant',
    cp: 0,
    copies: 1,
    text: [
      'Gain Smoke Bomb.',
    ],
    art: '/cards/ninja/ninja-ninja-card-vanish.webp',
  },
  {
    id: 'ninja-ninja-card-dojo',
    name: 'Dojo!',
    type: 'mainPhase',
    cp: 0,
    copies: 1,
    text: [
      'Roll 1 die.',
      'If you roll Mask, gain Smoke Bomb and 2 Ninjutsu.',
      'Otherwise, draw 1.',
    ],
    art: '/cards/ninja/ninja-ninja-card-dojo.webp',
  },
];
