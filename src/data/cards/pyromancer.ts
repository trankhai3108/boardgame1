/**
 * Pyromancer hero cards.
 *
 * Generated from zhuanggenhua/BoardGame (MIT). Rules text is faithful;
 * card names there are a Chinese round-trip and do not always match the
 * names printed on the English cards.
 */
import type { Card } from '../../engine/types';

export const PYROMANCER_CARDS: Card[] = [
  {
    id: 'pyromancer-card-turning-up-the-heat',
    name: 'Turning Up the Heat!',
    type: 'mainPhase',
    cp: 0,
    copies: 1,
    text: [
      'Gain 1 Fire Mastery.',
      'Then you may spend any amount of CP;',
      'for each CP, gain 1 Fire Mastery.',
    ],
    effects: [
      { t: 'gainStatus', status: 'fire-mastery' },
      { t: 'spendCpForStatus', status: 'fire-mastery' },
    ],
    art: '/cards/pyromancer/pyromancer-card-turning-up-the-heat.webp',
  },
  {
    id: 'pyromancer-card-infernal-embrace',
    name: 'Infernal Embrace!',
    type: 'mainPhase',
    cp: 0,
    copies: 1,
    text: [
      'Roll 1 die:',
      'Meteor: gain Fire Mastery to the cap',
      'Otherwise: draw 1 card',
    ],
    effects: [
      {
        t: 'subRoll',
        dice: 1,
        outcomes: [
          { on: 'meteor', effects: [{ t: 'gainStatus', status: 'fire-mastery', amount: 99 }] },
        ],
        otherwise: [{ t: 'drawCard', amount: 1 }],
      },
    ],
    art: '/cards/pyromancer/pyromancer-card-infernal-embrace.webp',
  },
  {
    id: 'pyromancer-card-fan-the-flames',
    name: 'Fan the Flames!',
    type: 'mainPhase',
    cp: 3,
    copies: 1,
    text: [
      'Fire Mastery stack limit +1.',
      'Gain 2 Fire Mastery.',
    ],
    effects: [
      { t: 'stackLimitBonus', status: 'fire-mastery', amount: 1 },
      { t: 'gainStatus', status: 'fire-mastery', amount: 2 },
    ],
    art: '/cards/pyromancer/pyromancer-card-fan-the-flames.webp',
  },
  {
    id: 'pyromancer-card-red-hot',
    name: 'Red Hot!',
    type: 'rollPhase',
    cp: 1,
    copies: 1,
    text: [
      'This turn, your damage +1 per Fire Mastery.',
    ],
    window: { needsAttack: true, who: 'attacker' },
    effects: [
      { t: 'attackBonus', amount: { perStatus: { 'fire-mastery': 1 } } },
    ],
    art: '/cards/pyromancer/pyromancer-card-red-hot.webp',
  },
  {
    id: 'pyromancer-card-get-fired-up',
    name: 'Get Fired Up!',
    type: 'rollPhase',
    cp: 1,
    copies: 1,
    text: [
      'Roll 1 die:',
      'Fire: +3 damage',
      'Blaze: inflict Burn',
      'Fiery Soul: gain 2 Fire Mastery',
      'Meteor: inflict Knockdown',
    ],
    window: { needsAttack: true, who: 'attacker' },
    effects: [
      {
        t: 'subRoll',
        dice: 1,
        outcomes: [
          { on: 'flame', effects: [{ t: 'attackBonus', amount: 3 }] },
          { on: 'blaze', effects: [{ t: 'statusOnDefender', status: 'burn' }] },
          { on: 'fierySoul', effects: [{ t: 'gainStatus', status: 'fire-mastery', amount: 2 }] },
          { on: 'meteor', effects: [{ t: 'statusOnDefender', status: 'knockdown' }] },
        ],
      },
    ],
    art: '/cards/pyromancer/pyromancer-card-get-fired-up.webp',
  },
  {
    id: 'pyromancer-card-magma-armor-2',
    name: 'Molten Armor II',
    type: 'upgrade',
    cp: 1,
    copies: 1,
    text: [
      'Upgrade Molten Armor to level II.',
    ],
    upgrades: 'molten-armor',
    upgradeLevel: 'II',
  },
  {
    id: 'pyromancer-card-magma-armor-3',
    name: 'Molten Armor III',
    type: 'upgrade',
    cp: 3,
    copies: 1,
    text: [
      'Upgrade Molten Armor to level III.',
    ],
    upgrades: 'molten-armor',
    upgradeLevel: 'III',
  },
  {
    id: 'pyromancer-card-fireball-2',
    name: 'Fireball II',
    type: 'upgrade',
    cp: 1,
    copies: 1,
    text: [
      'Upgrade Fireball to level II.',
    ],
    upgrades: 'fireball',
    upgradeLevel: 'II',
  },
  {
    id: 'pyromancer-card-burning-soul-2',
    name: 'Burning Soul II',
    type: 'upgrade',
    cp: 1,
    copies: 1,
    text: [
      'Upgrade Burning Soul to level II.',
    ],
    upgrades: 'burning-soul',
    upgradeLevel: 'II',
  },
  {
    id: 'pyromancer-card-hot-streak-2',
    name: 'Hot Streak II',
    type: 'upgrade',
    cp: 2,
    copies: 1,
    text: [
      'Upgrade Hot Streak to level II.',
    ],
    upgrades: 'hot-streak',
    upgradeLevel: 'II',
  },
  {
    id: 'pyromancer-card-meteor-2',
    name: 'Meteorite II',
    type: 'upgrade',
    cp: 2,
    copies: 1,
    text: [
      'Upgrade Meteorite to level II.',
    ],
    upgrades: 'meteorite',
    upgradeLevel: 'II',
  },
  {
    id: 'pyromancer-card-pyro-blast-2',
    name: 'Pyroblast II',
    type: 'upgrade',
    cp: 2,
    copies: 1,
    text: [
      'Upgrade Pyroblast to level II.',
    ],
    upgrades: 'pyroblast',
    upgradeLevel: 'II',
  },
  {
    id: 'pyromancer-card-pyro-blast-3',
    name: 'Pyroblast III',
    type: 'upgrade',
    cp: 3,
    copies: 1,
    text: [
      'Upgrade Pyroblast to level III.',
    ],
    upgrades: 'pyroblast',
    upgradeLevel: 'III',
  },
  {
    id: 'pyromancer-card-burn-down-2',
    name: 'Combustion II',
    type: 'upgrade',
    cp: 2,
    copies: 1,
    text: [
      'Upgrade Combustion to level II.',
    ],
    upgrades: 'combustion',
    upgradeLevel: 'II',
  },
  {
    id: 'pyromancer-card-ignite-2',
    name: 'Ignite II',
    type: 'upgrade',
    cp: 2,
    copies: 1,
    text: [
      'Upgrade Ignite to level II.',
    ],
    upgrades: 'ignite',
    upgradeLevel: 'II',
  },
];
