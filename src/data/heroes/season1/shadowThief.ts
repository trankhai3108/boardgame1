import type { Hero } from '../../../engine/types';
import { COMMON_CARDS } from '../../cards/common';
import { SHADOW_THIEF_CARDS } from '../../cards/shadow-thief';

/**
 * Shadow Thief — Dice Throne Season 1 (box: Pyromancer v Shadow Thief).
 *
 * Abilities, dice faces and status effects are transcribed from the printed
 * hero board and leaflet. The 32-card hero deck is still being sourced.
 *
 * Note: this hero has two defensive abilities. The leaflet requires choosing
 * which one to use before rolling.
 */
export const SHADOW_THIEF: Hero = {
  id: 'shadow-thief',
  name: 'Shadow Thief',
  season: 'season1',
  complexity: 5,
  weapon: 'Poisoned dagger',
  bio:
    "The Shadow Thief doesn't like to end things quickly. He prefers running the " +
    'long con. Increasing his health, poisoning his foes, hiding & striking from ' +
    "the shadows — that's his style. If allowed to reach the conclusion of his " +
    'complicated game plan, his victims will find themselves in utter ruin.',
  palette: {
    primary: '#8de08a',
    accent: '#6b3f96',
    board: '#2c1840',
    abilityBg: 'linear-gradient(170deg, #2f4a28 0%, #24331f 50%, #1a2318 100%)',
    abilityInk: '#e9f7e6',
    abilityEdge: '#7b5aa8',
    ultimateBg: 'linear-gradient(120deg, #3b2458 0%, #2a1840 55%, #1b0f2a 100%)',
    ultimateInk: '#efe9f8',
    ultimateEdge: '#8c66bd',
  },

  dieFaces: [
    { value: 1, symbol: 'dagger', label: 'DAGGER' },
    { value: 2, symbol: 'dagger', label: 'DAGGER' },
    { value: 3, symbol: 'bag', label: 'BAG' },
    { value: 4, symbol: 'bag', label: 'BAG' },
    { value: 5, symbol: 'card', label: 'CARD' },
    { value: 6, symbol: 'shadow', label: 'SHADOW' },
  ],

  abilities: [
    {
      id: 'dagger-strike',
      name: 'Dagger Strike',
      kind: 'offensive',
      level: 'I',
      tiers: [
        {
          requirement: { kind: 'symbols', symbols: { dagger: 3 } },
          text: ['Deal [[dmg:4]] dmg.'],
          effects: [{ t: 'damage', amount: 4 }],
        },
        {
          requirement: { kind: 'symbols', symbols: { dagger: 4 } },
          text: ['Deal [[dmg:6]] dmg.'],
          effects: [{ t: 'damage', amount: 6 }],
        },
        {
          requirement: { kind: 'symbols', symbols: { dagger: 5 } },
          text: ['Deal [[dmg:8]] dmg.'],
          effects: [{ t: 'damage', amount: 8 }],
        },
      ],
      footer: [
        'If [[cardsym]] was rolled, gain [[cp:1]].',
        'If [[shadow]] was rolled, inflict *Poison* [[poison]].',
      ],
    },
    {
      id: 'shifty-strike',
      name: 'Shifty Strike',
      kind: 'offensive',
      level: 'I',
      tiers: [
        {
          requirement: { kind: 'straight', length: 4 },
          requirementLabel: 'SMALL STRAIGHT',
          text: ['Gain [[cp:3]].', 'Then deal 1/2 [[cp]] as dmg *(rounded up)*.'],
          effects: [
            { t: 'gainCP', amount: 3 },
            { t: 'manual', note: 'Deal half your CP (rounded up) as damage.' },
          ],
        },
      ],
    },
    {
      id: 'pickpocket',
      name: 'Pickpocket',
      kind: 'offensive',
      level: 'I',
      tiers: [
        {
          requirement: { kind: 'symbols', symbols: { bag: 3 } },
          text: ['Gain [[cp:2]].'],
          effects: [{ t: 'gainCP', amount: 2 }],
        },
        {
          requirement: { kind: 'symbols', symbols: { bag: 4 } },
          text: ['Gain [[cp:3]].'],
          effects: [{ t: 'gainCP', amount: 3 }],
        },
        {
          requirement: { kind: 'symbols', symbols: { bag: 5 } },
          text: ['Gain [[cp:4]].'],
          effects: [{ t: 'gainCP', amount: 4 }],
        },
      ],
      footer: [
        'If [[shadow]] was rolled, up to [[cp:1]] may instead be stolen from your opponent.',
      ],
    },
    {
      id: 'insidious-strike',
      name: 'Insidious Strike',
      kind: 'offensive',
      level: 'I',
      tiers: [
        {
          requirement: { kind: 'straight', length: 5 },
          requirementLabel: 'LARGE STRAIGHT',
          text: ['Gain [[cp:3]].', 'Then deal [[cp]] as dmg.'],
          effects: [
            { t: 'gainCP', amount: 3 },
            { t: 'manual', note: 'Deal damage equal to your CP.' },
          ],
        },
      ],
    },
    {
      id: 'shadow-dance',
      name: 'Shadow Dance',
      kind: 'offensive',
      level: 'I',
      tiers: [
        {
          requirement: { kind: 'symbols', symbols: { shadow: 3 } },
          text: [
            'Roll [[die:1]]:',
            'Deal 1/2 the value as *pure* dmg.',
            'Then gain *Shadows* [[shadows]] & *Sneak Attack* [[sneakattack]].',
          ],
          effects: [
            { t: 'manual', note: 'Roll 1 die; deal half its value as pure damage.' },
            { t: 'gainStatus', status: 'shadows' },
            { t: 'gainStatus', status: 'sneak-attack' },
          ],
        },
      ],
    },
    {
      id: 'shadow-defense',
      name: 'Shadow Defense',
      kind: 'defensive',
      level: 'I',
      tiers: [
        {
          requirement: { kind: 'defenseRoll', dice: 4 },
          requirementLabel: 'DEFENSE ROLL 4',
          text: [
            'On [[dagger]], inflict *Poison* [[poison]].',
            'On [[shadow]], gain *Sneak Attack* [[sneakattack]].',
            'On [[shadow]][[shadow]], gain *Sneak Attack* [[sneakattack]] and *Shadows* [[shadows]] immediately *(ignoring incoming dmg)*.',
          ],
          effects: [
            {
              t: 'subRoll',
              dice: 4,
              outcomes: [
                { on: 'dagger', effects: [{ t: 'gainStatus', status: 'poison', target: 'attacker' }] },
                { on: 'shadow', effects: [{ t: 'gainStatus', status: 'sneak-attack' }] },
              ],
            },
            {
              t: 'manual',
              note: 'On two Shadows, also gain Shadows immediately, ignoring incoming dmg.',
            },
          ],
        },
      ],
    },
    {
      id: 'carducopia',
      name: 'Carducopia',
      kind: 'offensive',
      level: 'I',
      tiers: [
        {
          requirement: { kind: 'symbols', symbols: { card: 2 } },
          text: ['Draw [[card:1]] × [[cardsym]].'],
          effects: [
            { t: 'manual', note: 'Draw 1 card per Card die used to activate.' },
          ],
        },
      ],
    },
    {
      id: 'counter-strike',
      name: 'Counter Strike',
      kind: 'defensive',
      level: 'I',
      tiers: [
        {
          requirement: { kind: 'defenseRoll', dice: 5 },
          requirementLabel: 'DEFENSE ROLL 5',
          text: [
            'Deal [[dmg:1]] × [[dagger]] dmg.',
            'On [[dagger]], inflict *Poison* [[poison]].',
          ],
          effects: [
            {
              t: 'subRoll',
              dice: 5,
              outcomes: [
                {
                  on: 'dagger',
                  effects: [
                    { t: 'damage', amount: 1, target: 'attacker' },
                    { t: 'gainStatus', status: 'poison', target: 'attacker' },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'shadow-shank',
      name: 'Shadow Shank!',
      kind: 'offensive',
      level: 'I',
      ultimate: true,
      tiers: [
        {
          requirement: { kind: 'symbols', symbols: { shadow: 5 } },
          text: [
            'Gain [[cp:3]] and gain *Shadows* [[shadows]].',
            'Then deal [[cp]] as dmg + [[dmg:5]].',
          ],
          effects: [
            { t: 'gainCP', amount: 3 },
            { t: 'gainStatus', status: 'shadows' },
            { t: 'manual', note: 'Deal damage equal to your CP, plus 5.' },
          ],
        },
      ],
    },
  ],

  statusEffects: [
    {
      id: 'shadows',
      name: 'Shadows',
      polarity: 'positive',
      stackLimit: 1,
      summary: 'A player with this token avoids damage',
      text:
        "When a player with this token is damaged as a result of an opponent's " +
        'Offensive Roll Phase, no damage is received and no defense is made ' +
        '(although the attack still "succeeds" & other effects may apply). Discard ' +
        'this token after the affected player starts & concludes a single turn ' +
        'while under its effects.',
    },
    {
      id: 'sneak-attack',
      name: 'Sneak Attack',
      polarity: 'positive',
      stackLimit: 1,
      summary: 'Spend to add 1 die to your Attack dmg',
      text:
        'After Attacking, a player with this token may spend it and roll 1 die to ' +
        'add the value of the die to their damage total. Attack Modifier.',
    },
    {
      id: 'poison',
      name: 'Poison',
      polarity: 'negative',
      stackLimit: 3,
      summary: 'Receive 1 dmg in Upkeep Phase',
      text:
        'A player afflicted with this token is dealt 1 dmg per Poison token during ' +
        'the Upkeep Phase of their turn. Persistent.',
    },
  ],

  /** 15 hero cards plus the 18 shared action cards: 33 in total. */
  cards: [...SHADOW_THIEF_CARDS, ...COMMON_CARDS],

  portrait: '/heroes/shadow-thief.webp',
  startingHealth: 50,
};
