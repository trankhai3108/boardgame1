import type { Hero } from '../../../engine/types';
import { COMMON_CARDS } from '../../cards/common';
import { BARBARIAN_CARDS } from '../../cards/barbarian';
import { SHARED_STATUS_EFFECTS } from '../../statusEffects';

/**
 * Barbarian — Dice Throne Season 1 (box: Barbarian v Moon Elf).
 *
 * Abilities, dice faces and status effects are transcribed from the printed
 * hero board and leaflet. The 32-card hero deck is still being sourced.
 */
export const BARBARIAN: Hero = {
  id: 'barbarian',
  name: 'Barbarian',
  season: 'season1',
  complexity: 1,
  weapon: 'Anything that goes chop or smash',
  bio:
    "The Barbarian isn't the most elegant hero around. He loves to smash things. " +
    'He is known for hitting his opponents so hard, they are left stunned and ' +
    'concussed. His endless barrage of heavy-hitting attacks shows that even the ' +
    'most simple fighting style can be deadly.',
  palette: {
    primary: '#e0761f',
    accent: '#8c2f16',
    board: '#5e2010',
    abilityBg: 'linear-gradient(170deg, #7d2f16 0%, #5a2010 50%, #3d160a 100%)',
    abilityInk: '#f7e3c8',
    abilityEdge: '#b4582a',
    ultimateBg: 'linear-gradient(120deg, #6b2711 0%, #4a1a0c 55%, #2e0f06 100%)',
    ultimateInk: '#fbe7c9',
    ultimateEdge: '#c06a30',
  },

  dieFaces: [
    { value: 1, symbol: 'sword', label: 'SWORD' },
    { value: 2, symbol: 'sword', label: 'SWORD' },
    { value: 3, symbol: 'sword', label: 'SWORD' },
    { value: 4, symbol: 'life', label: 'LIFE' },
    { value: 5, symbol: 'life', label: 'LIFE' },
    { value: 6, symbol: 'pow', label: 'POW' },
  ],

  abilities: [
    {
      id: 'smack',
      name: 'Smack',
      kind: 'offensive',
      level: 'I',
      tiers: [
        {
          requirement: { kind: 'symbols', symbols: { sword: 3 } },
          text: ['Deal [[dmg:4]] dmg.'],
          effects: [{ t: 'damage', amount: 4 }],
        },
        {
          requirement: { kind: 'symbols', symbols: { sword: 4 } },
          text: ['Deal [[dmg:6]] dmg.'],
          effects: [{ t: 'damage', amount: 6 }],
        },
        {
          requirement: { kind: 'symbols', symbols: { sword: 5 } },
          text: ['Deal [[dmg:8]] dmg.'],
          effects: [{ t: 'damage', amount: 8 }],
        },
      ],
    },
    {
      id: 'sturdy-blow',
      name: 'Sturdy Blow',
      kind: 'offensive',
      level: 'I',
      tiers: [
        {
          requirement: { kind: 'symbols', symbols: { sword: 2, pow: 2 } },
          text: ['Deal [[dmg:4]] *undefendable* dmg.'],
          effects: [{ t: 'damage', amount: 4, undefendable: true }],
        },
      ],
    },
    {
      id: 'fortitude',
      name: 'Fortitude',
      kind: 'offensive',
      level: 'I',
      tiers: [
        {
          requirement: { kind: 'symbols', symbols: { life: 3 } },
          text: ['Heal [[heal:4]].'],
          effects: [{ t: 'heal', amount: 4 }],
        },
        {
          requirement: { kind: 'symbols', symbols: { life: 4 } },
          text: ['Heal [[heal:5]].'],
          effects: [{ t: 'heal', amount: 5 }],
        },
        {
          requirement: { kind: 'symbols', symbols: { life: 5 } },
          text: ['Heal [[heal:6]].'],
          effects: [{ t: 'heal', amount: 6 }],
        },
      ],
    },
    {
      id: 'overpower',
      name: 'Overpower',
      kind: 'offensive',
      level: 'I',
      tiers: [
        {
          requirement: { kind: 'symbols', symbols: { sword: 3, pow: 2 } },
          text: [
            'Roll [[die:3]]:',
            'Then deal dmg equal to the total roll value.',
            'If the roll value is at least [[dmg:14]], inflict *Concussion* [[concussion]].',
          ],
          effects: [{ t: 'manual', note: 'Roll 3 dice; deal damage equal to the total. On 14+, inflict Concussion.' }],
        },
      ],
    },
    {
      id: 'mighty-blow',
      name: 'Mighty Blow',
      kind: 'offensive',
      level: 'I',
      tiers: [
        {
          requirement: { kind: 'straight', length: 4 },
          requirementLabel: 'SMALL STRAIGHT',
          text: ['Deal [[dmg:9]] dmg.'],
          effects: [{ t: 'damage', amount: 9 }],
        },
      ],
    },
    {
      id: 'crit-bash',
      name: 'Crit Bash',
      kind: 'offensive',
      level: 'I',
      tiers: [
        {
          requirement: { kind: 'symbols', symbols: { pow: 4 } },
          text: ['Inflict *Stun* [[stun]].', 'Then deal [[dmg:5]] *undefendable* dmg.'],
          effects: [
            { t: 'gainStatus', status: 'stun', target: 'opponent' },
            { t: 'damage', amount: 5, undefendable: true },
          ],
        },
      ],
    },
    {
      id: 'reckless',
      name: 'Reckless',
      kind: 'offensive',
      level: 'I',
      tiers: [
        {
          requirement: { kind: 'straight', length: 5 },
          requirementLabel: 'LARGE STRAIGHT',
          text: [
            'Deal [[dmg:15]] dmg, receive [[dmg:4]] dmg in return.',
            '*(Return dmg only applies if at least [[dmg:1]] dmg was dealt successfully).*',
          ],
          effects: [
            { t: 'damage', amount: 15 },
            { t: 'damage', amount: 4, target: 'self' },
          ],
        },
      ],
    },
    {
      id: 'thick-skin',
      name: 'Thick Skin',
      kind: 'defensive',
      level: 'I',
      tiers: [
        {
          requirement: { kind: 'defenseRoll', dice: 3 },
          requirementLabel: 'DEFENSE ROLL 3',
          text: ['Heal [[heal:2]] × [[life]].'],
          effects: [
            {
              t: 'subRoll',
              dice: 3,
              outcomes: [{ on: 'life', effects: [{ t: 'heal', amount: 2 }] }],
            },
          ],
        },
      ],
    },
    {
      id: 'rage',
      name: 'Rage!',
      kind: 'offensive',
      level: 'I',
      ultimate: true,
      tiers: [
        {
          requirement: { kind: 'symbols', symbols: { pow: 5 } },
          text: ['Inflict *Stun* [[stun]].', 'Deal [[dmg:15]] dmg.'],
          effects: [
            { t: 'gainStatus', status: 'stun', target: 'opponent' },
            { t: 'damage', amount: 15 },
          ],
        },
      ],
    },
  ],

  statusEffects: [
    {
      id: 'concussion',
      name: 'Concussion',
      polarity: 'negative',
      stackLimit: 1,
      summary: 'Skip Income Phase',
      text:
        'A player afflicted with this token must skip their Income Phase and then ' +
        'remove this token.',
    },
    SHARED_STATUS_EFFECTS.stun,
  ],

  /** 15 hero cards plus the 18 shared action cards: 33 in total. */
  cards: [...BARBARIAN_CARDS, ...COMMON_CARDS],

  portrait: '/heroes/barbarian.webp',
  startingHealth: 50,
};
