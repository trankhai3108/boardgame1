/**
 * Monk hero cards.
 *
 * Generated from zhuanggenhua/BoardGame (MIT). Rules text is faithful;
 * card names there are a Chinese round-trip and do not always match the
 * names printed on the English cards.
 */
import type { Card } from '../../engine/types';

export const MONK_CARDS: Card[] = [
  {
    id: 'monk-card-enlightenment',
    name: 'Enlightenment!',
    type: 'mainPhase',
    cp: 0,
    copies: 1,
    text: [
      'Roll 1 die: if Lotus, gain 2 Chi, Evasive and Cleanse;',
      'otherwise draw 1 card.',
    ],
    effects: [
      {
        t: 'subRoll',
        dice: 1,
        outcomes: [
          {
            on: 'lotus',
            effects: [
              { t: 'gainStatus', status: 'chi', amount: 2 },
              { t: 'gainStatus', status: 'evasive' },
              { t: 'gainStatus', status: 'cleanse' },
            ],
          },
        ],
        otherwise: [{ t: 'drawCard', amount: 1 }],
      },
    ],
    art: '/cards/monk/monk-card-enlightenment.webp',
  },
  {
    id: 'monk-card-inner-peace',
    name: 'Inner Peace!',
    type: 'instant',
    cp: 0,
    copies: 1,
    text: [
      'Gain 2 Chi.',
    ],
    effects: [
      { t: 'gainStatus', status: 'chi', amount: 2 },
    ],
    art: '/cards/monk/monk-card-inner-peace.webp',
  },
  {
    id: 'monk-card-deep-thought',
    name: 'Deep Thought!',
    type: 'instant',
    cp: 3,
    copies: 1,
    text: [
      'Gain 5 Chi.',
    ],
    effects: [
      { t: 'gainStatus', status: 'chi', amount: 5 },
    ],
    art: '/cards/monk/monk-card-deep-thought.webp',
  },
  {
    id: 'monk-card-buddha-light',
    name: 'Buddha Light!',
    type: 'mainPhase',
    cp: 3,
    copies: 1,
    text: [
      'Gain 1 Chi, Evasive and Cleanse;',
      'inflict Stun on 1 opponent.',
    ],
    effects: [
      { t: 'gainStatus', status: 'chi' },
      { t: 'gainStatus', status: 'evasive' },
      { t: 'gainStatus', status: 'cleanse' },
      {
        t: 'choose',
        request: { pick: 'player', scope: 'opponents' },
        effects: [
            { t: 'gainStatus', status: 'stun', amount: 1, target: 'chosen' },
        ],
      },
    ],
    art: '/cards/monk/monk-card-buddha-light.webp',
  },
  {
    id: 'monk-card-palm-strike',
    name: 'Palm Strike!',
    type: 'mainPhase',
    cp: 0,
    copies: 1,
    text: [
      'Inflict Stun on 1 opponent.',
    ],
    effects: [
      {
        t: 'choose',
        request: { pick: 'player', scope: 'opponents' },
        effects: [
            { t: 'gainStatus', status: 'stun', amount: 1, target: 'chosen' },
        ],
      },
    ],
    art: '/cards/monk/monk-card-palm-strike.webp',
  },
  {
    id: 'monk-card-meditation-3',
    name: 'Serenity III',
    type: 'upgrade',
    cp: 3,
    copies: 1,
    text: [
      'Upgrade Serenity to level III.',
    ],
    upgrades: 'serenity',
    upgradeLevel: 'III',
  },
  {
    id: 'monk-card-meditation-2',
    name: 'Serenity II',
    type: 'upgrade',
    cp: 2,
    copies: 1,
    text: [
      'Upgrade Serenity to level II.',
    ],
    upgrades: 'serenity',
    upgradeLevel: 'II',
  },
  {
    id: 'monk-card-zen-fist-2',
    name: 'Fist of Tranquility II',
    type: 'upgrade',
    cp: 2,
    copies: 1,
    text: [
      'Upgrade Fist of Tranquility to level II.',
    ],
    upgrades: 'fist-of-tranquility',
    upgradeLevel: 'II',
  },
  {
    id: 'monk-card-storm-assault-2',
    name: 'Tempest Rush II',
    type: 'upgrade',
    cp: 1,
    copies: 1,
    text: [
      'Upgrade Tempest Rush to level II.',
    ],
    upgrades: 'tempest-rush',
    upgradeLevel: 'II',
  },
  {
    id: 'monk-card-combo-punch-2',
    name: 'Combo Strike II',
    type: 'upgrade',
    cp: 2,
    copies: 1,
    text: [
      'Upgrade Combo Strike to level II.',
    ],
    upgrades: 'combo-strike',
    upgradeLevel: 'II',
  },
  {
    id: 'monk-card-lotus-bloom-2',
    name: 'Lotus Strike II',
    type: 'upgrade',
    cp: 2,
    copies: 1,
    text: [
      'Upgrade Lotus Strike to level II.',
    ],
    upgrades: 'lotus-strike',
    upgradeLevel: 'II',
  },
  {
    id: 'monk-card-mahayana-2',
    name: 'Fist of Harmony II',
    type: 'upgrade',
    cp: 1,
    copies: 1,
    text: [
      'Upgrade Fist of Harmony to level II.',
    ],
    upgrades: 'fist-of-harmony',
    upgradeLevel: 'II',
  },
  {
    id: 'monk-card-thrust-punch-2',
    name: 'Fist Strike II',
    type: 'upgrade',
    cp: 2,
    copies: 1,
    text: [
      'Upgrade Fist Strike to level II.',
    ],
    upgrades: 'fist-strike',
    upgradeLevel: 'II',
  },
  {
    id: 'monk-card-thrust-punch-3',
    name: 'Fist Strike III',
    type: 'upgrade',
    cp: 2,
    copies: 1,
    text: [
      'Upgrade Fist Strike to level III.',
    ],
    upgrades: 'fist-strike',
    upgradeLevel: 'III',
  },
  {
    id: 'monk-card-contemplation-2',
    name: 'Meditate II',
    type: 'upgrade',
    cp: 2,
    copies: 1,
    text: [
      'Upgrade Meditate to level II.',
    ],
    upgrades: 'meditate',
    upgradeLevel: 'II',
  },
];
