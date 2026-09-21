import type { Hero } from '../../../engine/types';
import { COMMON_CARDS } from '../../cards/common';
import { NINJA_CARDS } from '../../cards/ninja';

/**
 * Ninja — Dice Throne Season 1 ReRolled.
 *
 * Abilities, dice faces and status effects are transcribed from the printed
 * hero board and leaflet. The 32-card hero deck is still being sourced.
 */
export const NINJA: Hero = {
  id: 'ninja',
  name: 'Ninja',
  season: 'season1',
  complexity: 2,
  weapon: 'Ninjatō',
  bio:
    'The Ninja knows that victory is never truly certain, so she has spent countless ' +
    'hours to hone her craft. As a master of ninjutsu, she deals massive amounts of ' +
    "damage using unconventional methods. When she's prepared, she can even dodge " +
    'incoming attacks with more consistency than any other hero.',
  palette: {
    primary: '#7ce07c',
    accent: '#2f6b3a',
    board: '#1b3a24',
    abilityBg: 'linear-gradient(170deg, #2b5b36 0%, #1e4227 50%, #142d1b 100%)',
    abilityInk: '#e8f8e6',
    abilityEdge: '#5fa662',
    ultimateBg: 'linear-gradient(120deg, #2b5b36 0%, #1a3d23 55%, #102618 100%)',
    ultimateInk: '#e8f8e6',
    ultimateEdge: '#7ec97f',
  },

  dieFaces: [
    { value: 1, symbol: 'ninjato', label: 'NINJATŌ' },
    { value: 2, symbol: 'ninjato', label: 'NINJATŌ' },
    { value: 3, symbol: 'ninjato', label: 'NINJATŌ' },
    { value: 4, symbol: 'shuriken', label: 'SHURIKEN' },
    { value: 5, symbol: 'shuriken', label: 'SHURIKEN' },
    { value: 6, symbol: 'mask', label: 'MASK' },
  ],

  abilities: [
    {
      id: 'slash',
      name: 'Slash',
      kind: 'offensive',
      level: 'I',
      tiers: [
        {
          requirement: { kind: 'symbols', symbols: { ninjato: 3 } },
          text: ['Deal [[dmg:5]] dmg.'],
          effects: [{ t: 'damage', amount: 5 }],
        },
        {
          requirement: { kind: 'symbols', symbols: { ninjato: 4 } },
          text: ['Deal [[dmg:6]] dmg.'],
          effects: [{ t: 'damage', amount: 6 }],
        },
        {
          requirement: { kind: 'symbols', symbols: { ninjato: 5 } },
          text: ['Deal [[dmg:7]] dmg.'],
          effects: [{ t: 'damage', amount: 7 }],
        },
      ],
    },
    {
      id: 'walk-the-line',
      name: 'Walk the Line',
      kind: 'offensive',
      level: 'I',
      tiers: [
        {
          requirement: { kind: 'symbols', symbols: { shuriken: 4 } },
          text: [
            'Roll [[die:2]] and deal dmg equal to the total roll value.',
            'If the final roll value is 6 or less, this *Attack* becomes *undefendable*.',
          ],
          effects: [
            {
              t: 'manual',
              note:
                'Roll 2 dice; deal damage equal to the total. If the total is 6 or ' +
                'less, the attack is undefendable.',
            },
          ],
        },
      ],
    },
    {
      id: 'death-blossom',
      name: 'Death Blossom',
      kind: 'offensive',
      level: 'I',
      tiers: [
        {
          requirement: { kind: 'symbols', symbols: { ninjato: 3, shuriken: 2 } },
          text: [
            'Roll [[die:5]]:',
            'Deal [[dmg:1]] × [[ninjato]] + [[dmg:2]] × [[shuriken]] dmg.',
            'On [[mask]], this *Attack* becomes *undefendable*.',
          ],
          effects: [
            {
              t: 'subRoll',
              dice: 5,
              outcomes: [
                { on: 'ninjato', effects: [{ t: 'damage', amount: 1 }] },
                { on: 'shuriken', effects: [{ t: 'damage', amount: 2 }] },
                { on: 'mask', effects: [{ t: 'undefendable' }] },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'smoke-screen',
      name: 'Smoke Screen',
      kind: 'offensive',
      level: 'I',
      tiers: [
        {
          requirement: { kind: 'symbols', symbols: { ninjato: 1, shuriken: 2, mask: 1 } },
          text: [
            'A chosen player gains *Smoke Bomb* [[smokebomb]] and 2 *Ninjutsu* [[ninjutsu]].',
            'A chosen opponent is inflicted with *Delayed Poison* [[delayedpoison]].',
          ],
          effects: [
            { t: 'gainStatus', status: 'smoke-bomb', target: 'chosenPlayer' },
            { t: 'gainStatus', status: 'ninjutsu', amount: 2, target: 'chosenPlayer' },
            { t: 'gainStatus', status: 'delayed-poison', target: 'opponent' },
          ],
        },
      ],
    },
    {
      id: 'poison-blade',
      name: 'Poison Blade',
      kind: 'offensive',
      level: 'I',
      tiers: [
        {
          requirement: { kind: 'straight', length: 4 },
          requirementLabel: 'SMALL STRAIGHT',
          text: ['Inflict *Delayed Poison* [[delayedpoison]].', 'Deal [[dmg:5]] dmg.'],
          effects: [
            { t: 'gainStatus', status: 'delayed-poison', target: 'opponent' },
            { t: 'damage', amount: 5 },
          ],
        },
      ],
    },
    {
      id: 'shadewalk',
      name: 'Shadewalk',
      kind: 'offensive',
      level: 'I',
      tiers: [
        {
          requirement: { kind: 'symbols', symbols: { mask: 4 } },
          text: [
            'Gain *Smoke Bomb* [[smokebomb]].',
            'Inflict *Delayed Poison* [[delayedpoison]].',
            'Deal [[dmg:6]] *undefendable* dmg.',
          ],
          effects: [
            { t: 'gainStatus', status: 'smoke-bomb' },
            { t: 'gainStatus', status: 'delayed-poison', target: 'opponent' },
            { t: 'damage', amount: 6, undefendable: true },
          ],
        },
      ],
    },
    {
      id: 'shadow-fang',
      name: 'Shadow Fang',
      kind: 'offensive',
      level: 'I',
      tiers: [
        {
          requirement: { kind: 'straight', length: 5 },
          requirementLabel: 'LARGE STRAIGHT',
          text: ['Gain 2 *Ninjutsu* [[ninjutsu]].', 'Then deal [[dmg:8]] dmg.'],
          effects: [
            { t: 'gainStatus', status: 'ninjutsu', amount: 2 },
            { t: 'damage', amount: 8 },
          ],
        },
      ],
    },
    {
      id: 'shade-shift',
      name: 'Shade Shift',
      kind: 'defensive',
      level: 'I',
      tiers: [
        {
          requirement: { kind: 'defenseRoll', dice: 3 },
          requirementLabel: 'DEFENSE ROLL 3',
          text: [
            'On [[ninjato]], deal [[dmg:1]] dmg.',
            'On [[shuriken]], deal [[dmg:2]] dmg.',
            'On [[mask]][[mask]], gain *Smoke Bomb* [[smokebomb]].',
            'You may re-roll one of these dice.',
          ],
          effects: [
            {
              t: 'subRoll',
              dice: 3,
              outcomes: [
                { on: 'ninjato', effects: [{ t: 'damage', amount: 1, target: 'attacker' }] },
                { on: 'shuriken', effects: [{ t: 'damage', amount: 2, target: 'attacker' }] },
              ],
            },
            { t: 'manual', note: 'On two Masks, gain Smoke Bomb. You may re-roll one die.' },
          ],
        },
      ],
    },
    {
      id: 'assassinate',
      name: 'Assassinate!',
      kind: 'offensive',
      level: 'I',
      ultimate: true,
      tiers: [
        {
          requirement: { kind: 'symbols', symbols: { mask: 5 } },
          text: [
            'Inflict *Delayed Poison* [[delayedpoison]] on two chosen opponents *(may be the same opponent)*.',
            'Gain *Smoke Bomb* [[smokebomb]]. Deal [[dmg:10]] dmg.',
          ],
          effects: [
            { t: 'gainStatus', status: 'delayed-poison', amount: 2, target: 'opponent' },
            { t: 'gainStatus', status: 'smoke-bomb' },
            { t: 'damage', amount: 10 },
          ],
        },
      ],
    },
  ],

  statusEffects: [
    {
      id: 'delayed-poison',
      name: 'Delayed Poison',
      polarity: 'negative',
      stackLimit: 2,
      summary: 'Receive 3 dmg at the end of your turn',
      text:
        'A player afflicted with this token removes it at the conclusion of their ' +
        'turn and then receives 3 dmg.',
    },
    {
      id: 'smoke-bomb',
      name: 'Smoke Bomb',
      polarity: 'positive',
      stackLimit: 1,
      summary: 'Spend & roll 1-3 to avoid damage',
      text:
        'When a player with this token receives dmg, they may choose to spend it. If ' +
        'spent, roll 1 die. If the outcome is 1-3, no dmg is received (although ' +
        'other associated effects may still apply).',
    },
    {
      id: 'ninjutsu',
      name: 'Ninjutsu',
      polarity: 'positive',
      stackLimit: 3,
      summary: 'Spend & roll to modify your Attack',
      text:
        'After Attacking, a player with this token may spend it and roll 1 die: On ' +
        '1-3, add 1 dmg. On 4-5, add 2 dmg. On 6, choose either to add 2 dmg, ' +
        'inflict Delayed Poison, or make your Attack undefendable. Attack Modifier.',
    },
  ],

  /** 15 hero cards plus the 18 shared action cards: 33 in total. */
  cards: [...NINJA_CARDS, ...COMMON_CARDS],

  portrait: '/heroes/ninja.webp',
  startingHealth: 50,
};
