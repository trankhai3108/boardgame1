/**
 * Shadow Thief hero cards.
 *
 * Generated from zhuanggenhua/BoardGame (MIT). Rules text is faithful;
 * card names there are a Chinese round-trip and do not always match the
 * names printed on the English cards.
 */
import type { Card } from '../../engine/types';

export const SHADOW_THIEF_CARDS: Card[] = [
  {
    id: 'shadow-thief-upgrade-pickpocket-2',
    name: 'Shifty Strike II',
    type: 'upgrade',
    cp: 2,
    copies: 1,
    text: [
      'Upgrade Shifty Strike to level II.',
    ],
    upgrades: 'shifty-strike',
    upgradeLevel: 'II',
  },
  {
    id: 'shadow-thief-upgrade-kidney-shot-2',
    name: 'Insidious Strike II',
    type: 'upgrade',
    cp: 2,
    copies: 1,
    text: [
      'Upgrade Insidious Strike to level II.',
    ],
    upgrades: 'insidious-strike',
    upgradeLevel: 'II',
  },
  {
    id: 'shadow-thief-action-sneaky-sneaky',
    name: 'Sneaky Sneaky!',
    type: 'mainPhase',
    cp: 1,
    copies: 1,
    text: [
      'Gain Sneak Attack [[dagger]].',
    ],
    art: '/cards/shadow-thief/shadow-thief-action-sneaky-sneaky.webp',
  },
  {
    id: 'shadow-thief-action-one-with-shadows',
    name: 'One with Shadows!',
    type: 'mainPhase',
    cp: 0,
    copies: 1,
    text: [
      'Roll 1 die: if Shadow, gain Sneak Attack + 2 CP;',
      'otherwise draw 1 card.',
    ],
    art: '/cards/shadow-thief/shadow-thief-action-one-with-shadows.webp',
  },
  {
    id: 'shadow-thief-upgrade-shadow-defense-2',
    name: 'Shadow Defense II',
    type: 'upgrade',
    cp: 2,
    copies: 1,
    text: [
      'Upgrade Shadow Defense to level II.',
    ],
    upgrades: 'shadow-defense',
    upgradeLevel: 'II',
  },
  {
    id: 'shadow-thief-action-poison-tip',
    name: 'Poison Tip!',
    type: 'instant',
    cp: 2,
    copies: 1,
    text: [
      'Inflict Poison on opponent.',
    ],
    art: '/cards/shadow-thief/shadow-thief-action-poison-tip.webp',
  },
  {
    id: 'shadow-thief-action-card-trick',
    name: 'Card Trick!',
    type: 'mainPhase',
    cp: 2,
    copies: 1,
    text: [
      'Opponent discards 1.',
      'Draw 1 (2 if Sneak).',
    ],
    art: '/cards/shadow-thief/shadow-thief-action-card-trick.webp',
  },
  {
    id: 'shadow-thief-upgrade-dagger-strike-2',
    name: 'Dagger Strike II',
    type: 'upgrade',
    cp: 2,
    copies: 1,
    text: [
      'Upgrade Dagger Strike to level II.',
    ],
    upgrades: 'dagger-strike',
    upgradeLevel: 'II',
  },
  {
    id: 'shadow-thief-action-shadow-coins',
    name: 'Shadow Coins!',
    type: 'instant',
    cp: 0,
    copies: 1,
    text: [
      'Gain 2 CP.',
      'If you have Shadow [[moon]], gain 3 CP instead.',
    ],
    art: '/cards/shadow-thief/shadow-thief-action-shadow-coins.webp',
  },
  {
    id: 'shadow-thief-action-shadow-manipulation',
    name: 'Shadow Manipulation!',
    type: 'rollPhase',
    cp: 4,
    copies: 1,
    text: [
      'Change the value of any 1 die.',
      'If you have Shadow, change the value of any 2 dice instead.',
    ],
    art: '/cards/shadow-thief/shadow-thief-action-shadow-manipulation.webp',
  },
  {
    id: 'shadow-thief-upgrade-shadow-dance-2',
    name: 'Shadow Dance II',
    type: 'upgrade',
    cp: 1,
    copies: 1,
    text: [
      'Upgrade Shadow Dance to level II.',
    ],
    upgrades: 'shadow-dance',
    upgradeLevel: 'II',
  },
  {
    id: 'shadow-thief-upgrade-steal-2',
    name: 'Pickpocket II',
    type: 'upgrade',
    cp: 1,
    copies: 1,
    text: [
      'Upgrade Pickpocket to level II.',
    ],
    upgrades: 'pickpocket',
    upgradeLevel: 'II',
  },
  {
    id: 'shadow-thief-upgrade-cornucopia-2',
    name: 'Carducopia II',
    type: 'upgrade',
    cp: 2,
    copies: 1,
    text: [
      'Upgrade Carducopia to level II.',
    ],
    upgrades: 'carducopia',
    upgradeLevel: 'II',
  },
  {
    id: 'shadow-thief-upgrade-fearless-riposte-2',
    name: 'Counter Strike II',
    type: 'upgrade',
    cp: 4,
    copies: 1,
    text: [
      'Upgrade Counter Strike to level II.',
    ],
    upgrades: 'counter-strike',
    upgradeLevel: 'II',
  },
  {
    id: 'shadow-thief-action-into-the-shadows',
    name: 'Into the Shadows!',
    type: 'instant',
    cp: 4,
    copies: 1,
    text: [
      'Gain 1 Shadow token.',
    ],
    art: '/cards/shadow-thief/shadow-thief-action-into-the-shadows.webp',
  },
];
