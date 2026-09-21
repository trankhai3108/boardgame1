/**
 * Treant hero cards.
 *
 * Generated from zhuanggenhua/BoardGame (MIT). Rules text is faithful;
 * card names there are a Chinese round-trip and do not always match the
 * names printed on the English cards.
 */
import type { Card } from '../../engine/types';

export const TREANT_CARDS: Card[] = [
  {
    id: 'treant-treant-card-trample',
    name: 'Trample!',
    type: 'rollPhase',
    cp: 1,
    copies: 1,
    text: [
      'Roll 5 dice.',
      'Each Branch adds +1 attack damage.',
      'If this card added at least +3 damage, apply Barbed Vine.',
    ],
    art: '/cards/treant/treant-treant-card-trample.webp',
  },
  {
    id: 'treant-upgrade-tend-care-2',
    name: 'Tend II',
    type: 'upgrade',
    cp: 2,
    copies: 1,
    text: [
      'Upgrade Tend to level II.',
    ],
    upgrades: 'tend',
    upgradeLevel: 'II',
  },
  {
    id: 'treant-upgrade-rooted-2',
    name: 'Rooted II',
    type: 'upgrade',
    cp: 3,
    copies: 1,
    text: [
      'Upgrade Rooted to level II.',
    ],
    upgrades: 'rooted',
    upgradeLevel: 'II',
  },
  {
    id: 'treant-treant-card-drink-deep',
    name: 'Drink Deep!',
    type: 'mainPhase',
    cp: 1,
    copies: 1,
    text: [
      'Choose 1 player to gain Wellspring.',
    ],
    art: '/cards/treant/treant-treant-card-drink-deep.webp',
  },
  {
    id: 'treant-upgrade-shattering-fist-3',
    name: 'Splinter III',
    type: 'upgrade',
    cp: 2,
    copies: 1,
    text: [
      'Upgrade Splinter to level III.',
    ],
    upgrades: 'splinter',
    upgradeLevel: 'III',
  },
  {
    id: 'treant-treant-card-harvest',
    name: 'Harvest!',
    type: 'mainPhase',
    cp: 0,
    copies: 1,
    text: [
      'Remove up to 3 Spirits.',
      'Gain 1 CP per removed Spirit.',
      'If you removed at least 2 Spirits, up to 2 players gain Wellspring.',
    ],
    art: '/cards/treant/treant-treant-card-harvest.webp',
  },
  {
    id: 'treant-treant-card-cultivate',
    name: 'Grow!',
    type: 'mainPhase',
    cp: 3,
    copies: 1,
    text: [
      'Grow 3 Spirits.',
    ],
    art: '/cards/treant/treant-treant-card-cultivate.webp',
  },
  {
    id: 'treant-treant-card-downpour',
    name: 'Downpour!',
    type: 'mainPhase',
    cp: 2,
    copies: 1,
    text: [
      'You may grow each current Spirit once, in any order.',
    ],
    art: '/cards/treant/treant-treant-card-downpour.webp',
  },
  {
    id: 'treant-upgrade-nature-touch-2',
    name: 'Nature\'s Grasp II',
    type: 'upgrade',
    cp: 2,
    copies: 1,
    text: [
      'Upgrade Nature\'s Grasp to level II.',
    ],
    upgrades: 'natures-grasp',
    upgradeLevel: 'II',
  },
  {
    id: 'treant-treant-card-soulfire',
    name: 'Soulfire!',
    type: 'rollPhase',
    cp: 1,
    copies: 1,
    text: [
      'Roll 3 dice: Branch deals 1 collateral damage to all opponents;',
      'Leaf gains Wellspring;',
      'Spirit grows 1 Spirit.',
    ],
    art: '/cards/treant/treant-treant-card-soulfire.webp',
  },
  {
    id: 'treant-treant-card-mother-tree',
    name: 'Mother Tree!',
    type: 'mainPhase',
    cp: 0,
    copies: 1,
    text: [
      'Roll 1 die.',
      'If you roll Spirit, grow 4 Spirits.',
      'Otherwise, draw 1.',
    ],
    art: '/cards/treant/treant-treant-card-mother-tree.webp',
  },
  {
    id: 'treant-upgrade-vengeful-vines-2',
    name: 'Vengeful Vines II',
    type: 'upgrade',
    cp: 2,
    copies: 1,
    text: [
      'Upgrade Vengeful Vines to level II.',
    ],
    upgrades: 'vengeful-vines',
    upgradeLevel: 'II',
  },
  {
    id: 'treant-upgrade-wild-growth-2',
    name: 'Call of the Wild II',
    type: 'upgrade',
    cp: 2,
    copies: 1,
    text: [
      'Upgrade Call of the Wild to level II.',
    ],
    upgrades: 'call-of-the-wild',
    upgradeLevel: 'II',
  },
  {
    id: 'treant-upgrade-shattering-fist-2',
    name: 'Splinter II',
    type: 'upgrade',
    cp: 1,
    copies: 1,
    text: [
      'Upgrade Splinter to level II.',
    ],
    upgrades: 'splinter',
    upgradeLevel: 'II',
  },
  {
    id: 'treant-treant-card-planting',
    name: 'Planting',
    type: 'mainPhase',
    cp: 1,
    copies: 1,
    text: [
      'Grow 3 Spirits.',
    ],
    art: '/cards/treant/treant-treant-card-planting.webp',
  },
];
