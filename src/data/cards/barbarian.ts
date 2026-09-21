/**
 * Barbarian hero cards.
 *
 * Generated from zhuanggenhua/BoardGame (MIT). Rules text is faithful;
 * card names there are a Chinese round-trip and do not always match the
 * names printed on the English cards.
 */
import type { Card } from '../../engine/types';

export const BARBARIAN_CARDS: Card[] = [
  {
    id: 'barbarian-card-energetic',
    name: 'Energetic!',
    type: 'mainPhase',
    cp: 0,
    copies: 1,
    text: [
      'Roll 1 die: if Pow, heal 2 and inflict Concussion on 1 opponent.',
      'Otherwise draw 1 card.',
    ],
    art: '/cards/barbarian/barbarian-card-energetic.webp',
  },
  {
    id: 'barbarian-card-dizzy',
    name: 'Dizzy!',
    type: 'rollPhase',
    cp: 0,
    copies: 1,
    text: [
      'If you have dealt at least 8 damage to the opponent, inflict Concussion.',
    ],
    art: '/cards/barbarian/barbarian-card-dizzy.webp',
  },
  {
    id: 'barbarian-card-head-blow',
    name: 'Head Blow!',
    type: 'instant',
    cp: 1,
    copies: 1,
    text: [
      'Inflict Concussion on 1 opponent.',
    ],
    art: '/cards/barbarian/barbarian-card-head-blow.webp',
  },
  {
    id: 'barbarian-card-lucky',
    name: 'Lucky!',
    type: 'instant',
    cp: 0,
    copies: 1,
    text: [
      'Roll 3 dice: Heal 1 + 2×Life.',
    ],
    art: '/cards/barbarian/barbarian-card-lucky.webp',
  },
  {
    id: 'barbarian-card-more-please',
    name: 'More Please!',
    type: 'rollPhase',
    cp: 2,
    copies: 1,
    text: [
      'Roll 5 dice: +1 damage per Sword.',
      'Inflict Concussion.',
    ],
    art: '/cards/barbarian/barbarian-card-more-please.webp',
  },
  {
    id: 'barbarian-card-thick-skin-2',
    name: 'Thick Skin II',
    type: 'upgrade',
    cp: 3,
    copies: 1,
    text: [
      'Upgrade Thick Skin to level II.',
    ],
    upgrades: 'thick-skin',
    upgradeLevel: 'II',
  },
  {
    id: 'barbarian-card-slap-2',
    name: 'Smack II',
    type: 'upgrade',
    cp: 2,
    copies: 1,
    text: [
      'Upgrade Smack to level II.',
    ],
    upgrades: 'smack',
    upgradeLevel: 'II',
  },
  {
    id: 'barbarian-card-slap-3',
    name: 'Smack III',
    type: 'upgrade',
    cp: 3,
    copies: 1,
    text: [
      'Upgrade Smack to level III.',
    ],
    upgrades: 'smack',
    upgradeLevel: 'III',
  },
  {
    id: 'barbarian-card-all-out-strike-2',
    name: 'Sturdy Blow II',
    type: 'upgrade',
    cp: 2,
    copies: 1,
    text: [
      'Upgrade Sturdy Blow to level II.',
    ],
    upgrades: 'sturdy-blow',
    upgradeLevel: 'II',
  },
  {
    id: 'barbarian-card-all-out-strike-3',
    name: 'Sturdy Blow III',
    type: 'upgrade',
    cp: 3,
    copies: 1,
    text: [
      'Upgrade Sturdy Blow to level III.',
    ],
    upgrades: 'sturdy-blow',
    upgradeLevel: 'III',
  },
  {
    id: 'barbarian-card-powerful-strike-2',
    name: 'Mighty Blow II',
    type: 'upgrade',
    cp: 2,
    copies: 1,
    text: [
      'Upgrade Mighty Blow to level II.',
    ],
    upgrades: 'mighty-blow',
    upgradeLevel: 'II',
  },
  {
    id: 'barbarian-card-reckless-strike-2',
    name: 'Reckless II',
    type: 'upgrade',
    cp: 2,
    copies: 1,
    text: [
      'Upgrade Reckless to level II.',
    ],
    upgrades: 'reckless',
    upgradeLevel: 'II',
  },
  {
    id: 'barbarian-card-suppress-2',
    name: 'Overpower II',
    type: 'upgrade',
    cp: 2,
    copies: 1,
    text: [
      'Upgrade Overpower to level II.',
    ],
    upgrades: 'overpower',
    upgradeLevel: 'II',
  },
  {
    id: 'barbarian-card-steadfast-2',
    name: 'Fortitude II',
    type: 'upgrade',
    cp: 2,
    copies: 1,
    text: [
      'Upgrade Fortitude to level II.',
    ],
    upgrades: 'fortitude',
    upgradeLevel: 'II',
  },
  {
    id: 'barbarian-card-violent-assault-2',
    name: 'Crit Bash II',
    type: 'upgrade',
    cp: 2,
    copies: 1,
    text: [
      'Upgrade Crit Bash to level II.',
    ],
    upgrades: 'crit-bash',
    upgradeLevel: 'II',
  },
];
