import type { Hero } from '../../../engine/types';
import { COMMON_CARDS } from '../../cards/common';
import { MOON_ELF_CARDS } from '../../cards/moon-elf';
import { SHARED_STATUS_EFFECTS } from '../../statusEffects';

/**
 * Moon Elf — Dice Throne Season 1 (box: Barbarian v Moon Elf).
 *
 * Abilities, dice faces and status effects are transcribed from the printed
 * hero board and leaflet. The 32-card hero deck is still being sourced.
 */
export const MOON_ELF: Hero = {
  id: 'moon-elf',
  name: 'Moon Elf',
  season: 'season1',
  complexity: 2,
  weapon: 'Bow & Arrows',
  bio:
    'The Moon Elf draws her energy from the light of the moon. Her exploding arrows ' +
    'can pierce even the toughest of armor when loosed from her giant long bow. Her ' +
    'quick and nimble stature makes her extremely hard to hit, as she picks off her ' +
    'targeted foes from the vale of the forest.',
  palette: {
    primary: '#8fd4ee',
    accent: '#2b6f95',
    board: '#14293d',
    abilityBg: 'linear-gradient(170deg, #1d3a55 0%, #142942 55%, #0c1a2c 100%)',
    abilityInk: '#e6f4fb',
    abilityEdge: '#4d86b5',
    ultimateBg: 'linear-gradient(120deg, #1a3a5c 0%, #122a44 55%, #0a1b2d 100%)',
    ultimateInk: '#e6f4fb',
    ultimateEdge: '#5b9bc9',
  },

  dieFaces: [
    { value: 1, symbol: 'arrow', label: 'ARROW' },
    { value: 2, symbol: 'arrow', label: 'ARROW' },
    { value: 3, symbol: 'arrow', label: 'ARROW' },
    { value: 4, symbol: 'foot', label: 'FOOT' },
    { value: 5, symbol: 'foot', label: 'FOOT' },
    { value: 6, symbol: 'moon', label: 'MOON' },
  ],

  abilities: [
    {
      id: 'longbow',
      name: 'Longbow',
      kind: 'offensive',
      level: 'I',
      tiers: [
        {
          requirement: { kind: 'symbols', symbols: { arrow: 3 } },
          text: ['Deal [[dmg:4]] dmg.'],
          effects: [{ t: 'damage', amount: 4 }],
        },
        {
          requirement: { kind: 'symbols', symbols: { arrow: 4 } },
          text: ['Deal [[dmg:5]] dmg.'],
          effects: [{ t: 'damage', amount: 5 }],
        },
        {
          requirement: { kind: 'symbols', symbols: { arrow: 5 } },
          text: ['Deal [[dmg:7]] dmg.'],
          effects: [{ t: 'damage', amount: 7 }],
        },
      ],
    },
    {
      id: 'demising-shot',
      name: 'Demising Shot',
      kind: 'offensive',
      level: 'I',
      tiers: [
        {
          requirement: { kind: 'symbols', symbols: { arrow: 3, moon: 2 } },
          text: ['Inflict *Targeted* [[targeted]].', 'Then deal [[dmg:4]] dmg.'],
          effects: [
            { t: 'gainStatus', status: 'targeted', target: 'opponent' },
            { t: 'damage', amount: 4 },
          ],
        },
      ],
    },
    {
      id: 'covered-shot',
      name: 'Covered Shot',
      kind: 'offensive',
      level: 'I',
      tiers: [
        {
          requirement: { kind: 'symbols', symbols: { arrow: 2, foot: 3 } },
          text: ['Gain *Evasive* [[evasive]].', 'Deal [[dmg:7]] dmg.'],
          effects: [
            { t: 'gainStatus', status: 'evasive' },
            { t: 'damage', amount: 7 },
          ],
        },
      ],
    },
    {
      id: 'exploding-arrow',
      name: 'Exploding Arrow',
      kind: 'offensive',
      level: 'I',
      tiers: [
        {
          requirement: { kind: 'symbols', symbols: { arrow: 1, moon: 3 } },
          text: [
            'Roll [[die:5]]:',
            'Deal [[dmg:3]] dmg + [[dmg:1]] × [[arrow]] + [[dmg:1]] × [[foot]] dmg.',
            'Additionally, opponent loses [[cp:1]] × [[moon]].',
            'Inflict *Blind* [[blind]].',
          ],
          effects: [
            { t: 'damage', amount: 3 },
            {
              t: 'subRoll',
              dice: 5,
              outcomes: [
                { on: 'arrow', effects: [{ t: 'damage', amount: 1 }] },
                { on: 'foot', effects: [{ t: 'damage', amount: 1 }] },
                { on: 'moon', effects: [{ t: 'gainCP', amount: -1, target: 'opponent' }] },
              ],
            },
            { t: 'gainStatus', status: 'blind', target: 'opponent' },
          ],
        },
      ],
    },
    {
      id: 'entangling-shot',
      name: 'Entangling Shot',
      kind: 'offensive',
      level: 'I',
      tiers: [
        {
          requirement: { kind: 'straight', length: 4 },
          requirementLabel: 'SMALL STRAIGHT',
          text: ['Inflict *Entangle* [[entangle]].', 'Deal [[dmg:7]] dmg.'],
          effects: [
            { t: 'gainStatus', status: 'entangle', target: 'opponent' },
            { t: 'damage', amount: 7 },
          ],
        },
      ],
    },
    {
      id: 'eclipse',
      name: 'Eclipse',
      kind: 'offensive',
      level: 'I',
      tiers: [
        {
          requirement: { kind: 'symbols', symbols: { moon: 4 } },
          text: [
            'Inflict *Blind* [[blind]], *Entangle* [[entangle]], & *Targeted* [[targeted]].',
            'Then deal [[dmg:7]] dmg.',
          ],
          effects: [
            { t: 'gainStatus', status: 'blind', target: 'opponent' },
            { t: 'gainStatus', status: 'entangle', target: 'opponent' },
            { t: 'gainStatus', status: 'targeted', target: 'opponent' },
            { t: 'damage', amount: 7 },
          ],
        },
      ],
    },
    {
      id: 'blinding-shot',
      name: 'Blinding Shot',
      kind: 'offensive',
      level: 'I',
      tiers: [
        {
          requirement: { kind: 'straight', length: 5 },
          requirementLabel: 'LARGE STRAIGHT',
          text: [
            'Inflict *Blind* [[blind]].',
            'Gain *Evasive* [[evasive]].',
            'Deal [[dmg:8]] dmg.',
          ],
          effects: [
            { t: 'gainStatus', status: 'blind', target: 'opponent' },
            { t: 'gainStatus', status: 'evasive' },
            { t: 'damage', amount: 8 },
          ],
        },
      ],
    },
    {
      id: 'missed-me',
      name: 'Missed Me',
      kind: 'defensive',
      level: 'I',
      tiers: [
        {
          requirement: { kind: 'defenseRoll', dice: 5 },
          requirementLabel: 'DEFENSE ROLL 5',
          text: [
            'On [[foot]], prevent 1/2 dmg *(rounded up)*.',
            'For every [[arrow]], deal [[dmg:1]] dmg.',
          ],
          effects: [
            {
              t: 'subRoll',
              dice: 5,
              outcomes: [
                { on: 'arrow', effects: [{ t: 'damage', amount: 1, target: 'attacker' }] },
                { on: 'foot', effects: [{ t: 'preventFraction', divisor: 2 }] },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'lunar-eclipse',
      name: 'Lunar Eclipse!',
      kind: 'offensive',
      level: 'I',
      ultimate: true,
      tiers: [
        {
          requirement: { kind: 'symbols', symbols: { moon: 5 } },
          text: [
            'Gain *Evasive* [[evasive]]. Inflict *Blind* [[blind]], *Entangle* [[entangle]], & *Targeted* [[targeted]].',
            'Then deal [[dmg:12]] dmg.',
          ],
          effects: [
            { t: 'gainStatus', status: 'evasive' },
            { t: 'gainStatus', status: 'blind', target: 'opponent' },
            { t: 'gainStatus', status: 'entangle', target: 'opponent' },
            { t: 'gainStatus', status: 'targeted', target: 'opponent' },
            { t: 'damage', amount: 12 },
          ],
        },
      ],
    },
  ],

  statusEffects: [
    {
      id: 'blind',
      name: 'Blind',
      polarity: 'negative',
      stackLimit: 1,
      summary: 'On 1-2, fail Offensive Roll Phase',
      text:
        'The next time a player afflicted with this token concludes their Offensive ' +
        'Roll Phase, they must remove it and roll 1 die. On 1-2, their Offensive ' +
        'Roll Phase fails and has no effect of any kind.',
    },
    {
      id: 'entangle',
      name: 'Entangle',
      polarity: 'negative',
      stackLimit: 1,
      summary: 'Lose 1 Roll Attempt',
      text:
        'A player afflicted with this token gets 1 fewer Roll Attempts during their ' +
        'next Offensive Roll Phase. At the conclusion of the Roll Phase, remove this ' +
        'token.',
    },
    SHARED_STATUS_EFFECTS.evasive,
    {
      id: 'targeted',
      name: 'Targeted',
      polarity: 'negative',
      stackLimit: 1,
      summary: '+2 Incoming Attack dmg',
      text:
        'When a player afflicted with this token is Attacked by an opponent, the ' +
        'Incoming Attack dmg is increased by 2. Attack Modifier. Persistent.',
    },
  ],

  /** 15 hero cards plus the 18 shared action cards: 33 in total. */
  cards: [...MOON_ELF_CARDS, ...COMMON_CARDS],

  portrait: '/heroes/moon-elf.webp',
  startingHealth: 50,
};
