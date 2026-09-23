import type { Hero } from '../../../engine/types';
import { COMMON_CARDS } from '../../cards/common';
import { PYROMANCER_CARDS } from '../../cards/pyromancer';
import { SHARED_STATUS_EFFECTS } from '../../statusEffects';

/**
 * Pyromancer — Dice Throne Season 1 (box: Pyromancer v Shadow Thief).
 *
 * Abilities, dice faces and status effects are transcribed from the printed
 * hero board and leaflet. The 32-card hero deck is still being sourced.
 */
export const PYROMANCER: Hero = {
  id: 'pyromancer',
  name: 'Pyromancer',
  season: 'season1',
  complexity: 3,
  weapon: 'Fire and explosions',
  bio:
    'The Pyromancer has only one way to deal with her enemies: swift, hot ' +
    'destruction. Even her defense is offensive. She is a glass cannon who deals ' +
    'massive amounts of damage, turning her foes to ash.',
  palette: {
    primary: '#f5a623',
    accent: '#cf3a1e',
    board: '#6d2409',
    abilityBg: 'linear-gradient(170deg, #8e3a12 0%, #6b2708 50%, #481a05 100%)',
    abilityInk: '#fdeacb',
    abilityEdge: '#d4762c',
    ultimateBg: 'linear-gradient(120deg, #8a3410 0%, #5e2208 55%, #3c1404 100%)',
    ultimateInk: '#fdeacb',
    ultimateEdge: '#e08a34',
  },

  dieFaces: [
    { value: 1, symbol: 'flame', label: 'FLAME' },
    { value: 2, symbol: 'flame', label: 'FLAME' },
    { value: 3, symbol: 'flame', label: 'FLAME' },
    { value: 4, symbol: 'blaze', label: 'BLAZE' },
    { value: 5, symbol: 'fierySoul', label: 'FIERY SOUL' },
    { value: 6, symbol: 'meteor', label: 'METEOR' },
  ],

  abilities: [
    {
      id: 'fireball',
      name: 'Fireball',
      kind: 'offensive',
      level: 'I',
      tiers: [
        {
          requirement: { kind: 'symbols', symbols: { flame: 3 } },
          text: ['Deal [[dmg:4]] dmg.'],
          effects: [{ t: 'damage', amount: 4 }],
        },
        {
          requirement: { kind: 'symbols', symbols: { flame: 4 } },
          text: ['Deal [[dmg:6]] dmg.'],
          effects: [{ t: 'damage', amount: 6 }],
        },
        {
          requirement: { kind: 'symbols', symbols: { flame: 5 } },
          text: ['Deal [[dmg:8]] dmg.'],
          effects: [{ t: 'damage', amount: 8 }],
        },
      ],
      footer: ['Gain 1 *Fire Mastery* [[firemastery]].'],
    },
    {
      id: 'burning-soul',
      name: 'Burning Soul',
      kind: 'offensive',
      level: 'I',
      tiers: [
        {
          requirement: { kind: 'symbols', symbols: { fierySoul: 2 } },
          text: [
            'Gain 2 × [[fierysoul]] *Fire Mastery* [[firemastery]].',
            'Deal [[dmg:1]] × [[fierysoul]] *collateral* dmg to all opponents.',
          ],
          effects: [
            // Both scale with the number of Fiery Soul dice used to activate.
            { t: 'gainStatus', status: 'fire-mastery', amount: { perSymbol: { fierySoul: 2 } } },
            {
              t: 'damage',
              target: 'allOpponents',
              amount: { perSymbol: { fierySoul: 1 } },
            },
          ],
        },
      ],
    },
    {
      id: 'pyroblast',
      name: 'Pyroblast',
      kind: 'offensive',
      level: 'I',
      tiers: [
        {
          requirement: { kind: 'symbols', symbols: { flame: 3, meteor: 1 } },
          text: [
            'Deal [[dmg:6]] dmg and roll [[die:1]]:',
            'On [[flame]], add [[dmg:3]] dmg.',
            'On [[blaze]], inflict *Burn* [[burn]].',
            'On [[fierysoul]], gain 2 *Fire Mastery* [[firemastery]].',
            'On [[meteor]], inflict *Knockdown* [[knockdown]].',
          ],
          effects: [
            { t: 'damage', amount: 6 },
            {
              t: 'subRoll',
              dice: 1,
              outcomes: [
                { on: 'flame', effects: [{ t: 'damage', amount: 3 }] },
                { on: 'blaze', effects: [{ t: 'gainStatus', status: 'burn', target: 'opponent' }] },
                { on: 'fierySoul', effects: [{ t: 'gainStatus', status: 'fire-mastery', amount: 2 }] },
                { on: 'meteor', effects: [{ t: 'gainStatus', status: 'knockdown', target: 'opponent' }] },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'combustion',
      name: 'Combustion',
      kind: 'offensive',
      level: 'I',
      tiers: [
        {
          requirement: { kind: 'symbols', symbols: { flame: 1, blaze: 1, fierySoul: 1, meteor: 1 } },
          text: [
            'Gain 1 *Fire Mastery* [[firemastery]].',
            'Then remove up to 4 *Fire Mastery* [[firemastery]] tokens and deal [[dmg:3]] *undefendable* dmg per token removed.',
          ],
          effects: [
            { t: 'gainStatus', status: 'fire-mastery', amount: 1 },
            { t: 'spendTokens', status: 'fire-mastery', max: 4, damage: 3, undefendable: true },
          ],
        },
      ],
    },
    {
      id: 'hot-streak',
      name: 'Hot Streak',
      kind: 'offensive',
      level: 'I',
      tiers: [
        {
          requirement: { kind: 'straight', length: 4 },
          requirementLabel: 'SMALL STRAIGHT',
          text: [
            'Gain 2 *Fire Mastery* [[firemastery]].',
            'Then deal [[dmg:5]] + [[dmg:1]] dmg per *Fire Mastery* [[firemastery]].',
          ],
          effects: [
            { t: 'gainStatus', status: 'fire-mastery', amount: 2 },
            { t: 'damage', amount: { base: 5, perStatus: { 'fire-mastery': 1 } } },
          ],
        },
      ],
    },
    {
      id: 'meteorite',
      name: 'Meteorite',
      kind: 'offensive',
      level: 'I',
      tiers: [
        {
          requirement: { kind: 'symbols', symbols: { meteor: 4 } },
          text: [
            'Gain 2 *Fire Mastery* [[firemastery]].',
            'Inflict *Stun* [[stun]].',
            'Then deal [[dmg:1]] *undefendable* dmg per *Fire Mastery* [[firemastery]].',
            'Additionally, deal [[dmg:2]] *collateral* dmg to all opponents.',
          ],
          effects: [
            { t: 'gainStatus', status: 'fire-mastery', amount: 2 },
            { t: 'gainStatus', status: 'stun', target: 'opponent' },
            {
              t: 'damage',
              undefendable: true,
              amount: { perStatus: { 'fire-mastery': 1 } },
            },
            { t: 'damage', amount: 2, target: 'allOpponents' },
          ],
        },
      ],
    },
    {
      id: 'ignite',
      name: 'Ignite',
      kind: 'offensive',
      level: 'I',
      tiers: [
        {
          requirement: { kind: 'straight', length: 5 },
          requirementLabel: 'LARGE STRAIGHT',
          text: [
            'Gain 2 *Fire Mastery* [[firemastery]].',
            'Then deal [[dmg:4]] + [[dmg:2]] dmg per *Fire Mastery* [[firemastery]].',
          ],
          effects: [
            { t: 'gainStatus', status: 'fire-mastery', amount: 2 },
            { t: 'damage', amount: { base: 4, perStatus: { 'fire-mastery': 2 } } },
          ],
        },
      ],
    },
    {
      id: 'molten-armor',
      name: 'Molten Armor',
      kind: 'defensive',
      level: 'I',
      tiers: [
        {
          requirement: { kind: 'defenseRoll', dice: 5 },
          requirementLabel: 'DEFENSE ROLL 5',
          text: [
            'Gain 1 × [[fierysoul]] *Fire Mastery* [[firemastery]].',
            'Deal [[dmg:1]] × [[flame]] dmg.',
          ],
          effects: [
            {
              t: 'subRoll',
              dice: 5,
              outcomes: [
                { on: 'fierySoul', effects: [{ t: 'gainStatus', status: 'fire-mastery', amount: 1 }] },
                { on: 'flame', effects: [{ t: 'damage', amount: 1, target: 'attacker' }] },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'scorch-the-earth',
      name: 'Scorch the Earth!',
      kind: 'offensive',
      level: 'I',
      ultimate: true,
      tiers: [
        {
          requirement: { kind: 'symbols', symbols: { meteor: 5 } },
          text: [
            'Gain 3 *Fire Mastery* [[firemastery]]. Inflict *Knockdown* [[knockdown]] & *Burn* [[burn]]. Deal [[dmg:12]] dmg.',
            'Additionally, deal [[dmg:2]] *collateral* dmg to all opponents.',
          ],
          effects: [
            { t: 'gainStatus', status: 'fire-mastery', amount: 3 },
            { t: 'gainStatus', status: 'knockdown', target: 'opponent' },
            { t: 'gainStatus', status: 'burn', target: 'opponent' },
            { t: 'damage', amount: 12 },
            { t: 'damage', amount: 2, target: 'allOpponents' },
          ],
        },
      ],
    },
  ],

  statusEffects: [
    SHARED_STATUS_EFFECTS.knockdown,
    SHARED_STATUS_EFFECTS.burn,
    {
      id: 'fire-mastery',
      name: 'Fire Mastery',
      polarity: 'positive',
      stackLimit: 5,
      summary: 'Remove 1 token per turn',
      text:
        'A player with this token must "cool off" during their Upkeep Phase by ' +
        'removing 1 token (Fire Mastery increases the power of various abilities).',
    },
    SHARED_STATUS_EFFECTS.stun,
  ],

  /** 15 hero cards plus the 18 shared action cards: 33 in total. */
  cards: [...PYROMANCER_CARDS, ...COMMON_CARDS],

  portrait: '/heroes/pyromancer.webp',
  startingHealth: 50,
};
