/**
 * Paladin hero cards.
 *
 * Generated from zhuanggenhua/BoardGame (MIT). Rules text is faithful;
 * card names there are a Chinese round-trip and do not always match the
 * names printed on the English cards.
 */
import type { Card } from '../../engine/types';

export const PALADIN_CARDS: Card[] = [
  {
    id: 'paladin-card-might',
    name: 'Might!',
    type: 'mainPhase',
    cp: 1,
    copies: 1,
    text: [
      'Gain 1 Crit token.',
    ],
    art: '/cards/paladin/paladin-card-might.webp',
  },
  {
    id: 'paladin-card-consecrate',
    name: 'Consecrate!',
    type: 'mainPhase',
    cp: 4,
    copies: 1,
    text: [
      'Gain Protect, Retribution, Crit, and Accuracy (1 each).',
    ],
    art: '/cards/paladin/paladin-card-consecrate.webp',
  },
  {
    id: 'paladin-card-divine-favor',
    name: 'Divine Favor!',
    type: 'mainPhase',
    cp: 1,
    copies: 1,
    text: [
      'Roll 1 die: Sword -> Draw 2;',
      'Helmet -> Heal 3;',
      'Life -> Heal 4;',
      'Prayer -> Gain 3 CP.',
    ],
    art: '/cards/paladin/paladin-card-divine-favor.webp',
  },
  {
    id: 'paladin-card-absolution',
    name: 'Absolution!',
    type: 'instant',
    cp: 1,
    copies: 1,
    text: [
      'Roll 1 die: Sword -> Deal 1 undefendable damage;',
      'Helmet -> Prevent 1 damage;',
      'Life -> Prevent 2 damage;',
      'Prayer -> Gain 1 CP.',
    ],
    art: '/cards/paladin/paladin-card-absolution.webp',
  },
  {
    id: 'paladin-card-gods-grace',
    name: 'God\'s Grace!',
    type: 'mainPhase',
    cp: 0,
    copies: 1,
    text: [
      'Roll 1 die: Prayer -> Gain 4 CP;',
      'Otherwise -> Draw 1 card.',
    ],
    art: '/cards/paladin/paladin-card-gods-grace.webp',
  },
  {
    id: 'paladin-card-holy-defense-3',
    name: 'Divine Defense III',
    type: 'upgrade',
    cp: 4,
    copies: 1,
    text: [
      'Upgrade Divine Defense to level III.',
    ],
    upgrades: 'divine-defense',
    upgradeLevel: 'III',
  },
  {
    id: 'paladin-card-holy-defense-2',
    name: 'Divine Defense II',
    type: 'upgrade',
    cp: 3,
    copies: 1,
    text: [
      'Upgrade Divine Defense to level II.',
    ],
    upgrades: 'divine-defense',
    upgradeLevel: 'II',
  },
  {
    id: 'paladin-card-holy-light-2',
    name: 'Holy Light II',
    type: 'upgrade',
    cp: 2,
    copies: 1,
    text: [
      'Upgrade Holy Light to level II.',
    ],
    upgrades: 'holy-light',
    upgradeLevel: 'II',
  },
  {
    id: 'paladin-card-righteous-combat-3',
    name: 'Righteous Combat III',
    type: 'upgrade',
    cp: 4,
    copies: 1,
    text: [
      'Upgrade Righteous Combat to level III.',
    ],
    upgrades: 'righteous-combat',
    upgradeLevel: 'III',
  },
  {
    id: 'paladin-card-righteous-combat-2',
    name: 'Righteous Combat II',
    type: 'upgrade',
    cp: 2,
    copies: 1,
    text: [
      'Upgrade Righteous Combat to level II.',
    ],
    upgrades: 'righteous-combat',
    upgradeLevel: 'II',
  },
  {
    id: 'paladin-card-blessing-of-might-2',
    name: 'Mighty Prayer II',
    type: 'upgrade',
    cp: 2,
    copies: 1,
    text: [
      'Upgrade Mighty Prayer to level II.',
    ],
    upgrades: 'mighty-prayer',
    upgradeLevel: 'II',
  },
  {
    id: 'paladin-card-holy-strike-2',
    name: 'Holy Attack II',
    type: 'upgrade',
    cp: 2,
    copies: 1,
    text: [
      'Upgrade Holy Attack to level II.',
    ],
    upgrades: 'holy-attack',
    upgradeLevel: 'II',
  },
  {
    id: 'paladin-card-vengeance-2',
    name: 'Retaliate II',
    type: 'upgrade',
    cp: 1,
    copies: 1,
    text: [
      'Upgrade Retaliate to level II.',
    ],
    upgrades: 'retaliate',
    upgradeLevel: 'II',
  },
  {
    id: 'paladin-card-righteous-prayer-2',
    name: 'Righteous Prayer II',
    type: 'upgrade',
    cp: 2,
    copies: 1,
    text: [
      'Upgrade Righteous Prayer to level II.',
    ],
    upgrades: 'righteous-prayer',
    upgradeLevel: 'II',
  },
  {
    id: 'paladin-card-tithes-2',
    name: 'Tithe II',
    type: 'upgrade',
    cp: 3,
    copies: 1,
    text: [
      'Upgrade Tithe to level II.',
    ],
    upgrades: 'tithe',
    upgradeLevel: 'II',
  },
];
