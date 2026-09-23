import type { Hero } from '../../../engine/types';
import { COMMON_CARDS } from '../../cards/common';
import { PALADIN_CARDS } from '../../cards/paladin';
import { SHARED_STATUS_EFFECTS } from '../../statusEffects';

/**
 * Paladin — Dice Throne Season 1 (box: Monk v Paladin).
 *
 * Abilities, dice faces and status effects are transcribed from the printed
 * hero board and leaflet. The 32-card hero deck is still being sourced; see
 * `cards` below.
 */
export const PALADIN: Hero = {
  id: 'paladin',
  name: 'Paladin',
  season: 'season1',
  complexity: 5,
  weapon: 'Sword',
  bio:
    "The Paladin's sword of righteousness strikes hard and true. Through faithful " +
    'devotion, he is capable of celestial defense. The Paladin wades into battle ' +
    'assured that the Divine is with him and that victory is his sovereign right.',
  palette: {
    primary: '#d4af37',
    accent: '#2d5f8a',
    board: '#8fa8b8',
  },

  dieFaces: [
    { value: 1, symbol: 'sword', label: 'SWORD' },
    { value: 2, symbol: 'sword', label: 'SWORD' },
    { value: 3, symbol: 'helmet', label: 'HELMET' },
    { value: 4, symbol: 'helmet', label: 'HELMET' },
    { value: 5, symbol: 'life', label: 'LIFE' },
    { value: 6, symbol: 'prayer', label: 'PRAYER' },
  ],

  abilities: [
    {
      id: 'tithe',
      name: 'Tithe',
      kind: 'passive',
      level: 'I',
      tiers: [],
      text: [
        'You may re-roll 1 of your dice at any time for [[cp:1]] per re-roll.',
        'You may draw [[card:1]] at any time for [[cp:3]] per card.',
      ],
      passive: {
        options: [
          {
            id: 'tithe-reroll',
            cp: 1,
            label: 'Re-roll a die',
            window: 'roll',
            // The owner picks which die, the same way the cards do.
            effects: [
              { t: 'choose', request: { pick: 'die', scope: 'own' }, effects: [{ t: 'rerollDie' }] },
            ],
          },
          {
            id: 'tithe-draw',
            cp: 3,
            label: 'Draw a card',
            window: 'any',
            effects: [{ t: 'drawCard', amount: 1 }],
          },
        ],
      },
    },
    {
      id: 'retaliate',
      name: 'Retaliate',
      kind: 'offensive',
      level: 'I',
      tiers: [
        {
          requirement: { kind: 'symbols', symbols: { helmet: 3, prayer: 1 } },
          text: ['A chosen player gains *Retribution* [[retribution]].', 'Gain [[cp:3]].'],
          effects: [
            { t: 'gainStatus', status: 'retribution', target: 'chosenPlayer' },
            { t: 'gainCP', amount: 3 },
          ],
        },
      ],
    },
    {
      id: 'righteous-combat',
      name: 'Righteous Combat',
      kind: 'offensive',
      level: 'I',
      tiers: [
        {
          requirement: { kind: 'symbols', symbols: { sword: 3, helmet: 2 } },
          text: [
            'Deal [[dmg:5]] dmg & roll [[die:2]]:',
            'Add [[dmg:1]] \u00d7 [[helmet]] + [[dmg:2]] \u00d7 [[sword]] dmg.',
            'Heal [[heal:2]] \u00d7 [[life]].',
            'Gain [[cp:1]] \u00d7 [[prayer]].',
          ],
          effects: [
            { t: 'damage', amount: 5 },
            {
              t: 'subRoll',
              dice: 2,
              outcomes: [
                { on: 'helmet', effects: [{ t: 'damage', amount: 1 }] },
                { on: 'sword', effects: [{ t: 'damage', amount: 2 }] },
                { on: 'life', effects: [{ t: 'heal', amount: 2 }] },
                { on: 'prayer', effects: [{ t: 'gainCP', amount: 1 }] },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'mighty-prayer',
      name: 'Mighty Prayer',
      kind: 'offensive',
      level: 'I',
      tiers: [
        {
          requirement: { kind: 'symbols', symbols: { sword: 3, prayer: 1 } },
          text: ['Deal [[dmg:3]] *undefendable* dmg.', 'Then gain *Crit* [[crit]] & *Accuracy* [[accuracy]].'],
          effects: [
            { t: 'damage', amount: 3, undefendable: true },
            { t: 'gainStatus', status: 'crit' },
            { t: 'gainStatus', status: 'accuracy' },
          ],
        },
      ],
    },
    {
      id: 'holy-attack',
      name: 'Holy Attack',
      kind: 'offensive',
      level: 'I',
      tiers: [
        {
          requirement: { kind: 'straight', length: 4 },
          requirementLabel: 'SMALL STRAIGHT',
          text: ['Heal [[heal:1]].', 'Deal [[dmg:6]] dmg.'],
          effects: [
            { t: 'heal', amount: 1 },
            { t: 'damage', amount: 6 },
          ],
        },
        {
          requirement: { kind: 'straight', length: 5 },
          requirementLabel: 'LARGE STRAIGHT',
          text: ['Heal [[heal:2]].', 'Deal [[dmg:8]] dmg.'],
          effects: [
            { t: 'heal', amount: 2 },
            { t: 'damage', amount: 8 },
          ],
        },
      ],
    },
    {
      id: 'righteous-prayer',
      name: 'Righteous Prayer',
      kind: 'offensive',
      level: 'I',
      tiers: [
        {
          requirement: { kind: 'symbols', symbols: { prayer: 4 } },
          text: ['Deal [[dmg:8]] dmg.', 'Then gain *Crit* [[crit]] and [[cp:2]].'],
          effects: [
            { t: 'damage', amount: 8 },
            { t: 'gainStatus', status: 'crit' },
            { t: 'gainCP', amount: 2 },
          ],
        },
      ],
    },
    {
      id: 'holy-light',
      name: 'Holy Light',
      kind: 'offensive',
      level: 'I',
      tiers: [
        {
          requirement: { kind: 'symbols', symbols: { life: 2 } },
          text: [
            'Heal [[heal:1]] \u00d7 [[life]] & roll [[die:2]]:',
            'On [[sword]], gain *Crit* [[crit]].',
            'On [[helmet]], gain *Protect* [[protect]].',
            'On [[life]], draw [[card:1]].',
            'On [[prayer]], gain [[cp:2]].',
          ],
          effects: [
            { t: 'heal', amount: { perSymbol: { life: 1 } } },
            {
              t: 'subRoll',
              dice: 2,
              outcomes: [
                { on: 'sword', effects: [{ t: 'gainStatus', status: 'crit' }] },
                { on: 'helmet', effects: [{ t: 'gainStatus', status: 'protect' }] },
                { on: 'life', effects: [{ t: 'drawCard', amount: 1 }] },
                { on: 'prayer', effects: [{ t: 'gainCP', amount: 2 }] },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'divine-defense',
      name: 'Divine Defense',
      kind: 'defensive',
      level: 'I',
      tiers: [
        {
          requirement: { kind: 'defenseRoll', dice: 3 },
          requirementLabel: 'DEFENSE ROLL 3',
          text: [
            'On [[sword]], deal [[dmg:1]] dmg.',
            'Prevent [[prevent:1]] \u00d7 [[helmet]] + [[prevent:2]] \u00d7 [[life]] dmg.',
            'Gain [[cp:1]] \u00d7 [[prayer]].',
          ],
          effects: [
            {
              t: 'subRoll',
              dice: 3,
              outcomes: [
                { on: 'sword', effects: [{ t: 'damage', amount: 1, target: 'attacker' }] },
                { on: 'helmet', effects: [{ t: 'prevent', amount: 1 }] },
                { on: 'life', effects: [{ t: 'prevent', amount: 2 }] },
                { on: 'prayer', effects: [{ t: 'gainCP', amount: 1 }] },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'resolute-faith',
      name: 'Resolute Faith!',
      kind: 'offensive',
      level: 'I',
      ultimate: true,
      tiers: [
        {
          requirement: { kind: 'symbols', symbols: { prayer: 5 } },
          text: ['Gain *Blessing of Divinity* [[blessing]].', 'Heal [[heal:5]].', 'Deal [[dmg:10]] dmg.'],
          effects: [
            { t: 'gainStatus', status: 'blessing-of-divinity' },
            { t: 'heal', amount: 5 },
            { t: 'damage', amount: 10 },
          ],
        },
      ],
    },
  ],

  statusEffects: [
    SHARED_STATUS_EFFECTS.retribution,
    SHARED_STATUS_EFFECTS.crit,
    SHARED_STATUS_EFFECTS.protect,
    SHARED_STATUS_EFFECTS.accuracy,
    {
      id: 'blessing-of-divinity',
      name: 'Blessing of Divinity',
      polarity: 'unique',
      stackLimit: 1,
      summary: 'Prevent being defeated',
      text:
        'The next time a player (or team) with this token would have their health ' +
        'reduced to 0, remove this token and set their health to 1 instead. This ' +
        'token may not be removed or transferred by any other means.',
    },
  ],

  /** 15 hero cards plus the 18 shared action cards: 33 in total. */
  cards: [...PALADIN_CARDS, ...COMMON_CARDS],

  portrait: '/heroes/paladin.webp',
  startingHealth: 50,
};
