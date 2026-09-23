import type { Hero } from '../../../engine/types';
import { COMMON_CARDS } from '../../cards/common';
import { MONK_CARDS } from '../../cards/monk';
import { SHARED_STATUS_EFFECTS } from '../../statusEffects';

/**
 * Monk — Dice Throne Season 1 (box: Monk v Paladin).
 *
 * Abilities, dice faces and status effects are transcribed from the printed
 * hero board and leaflet. The 32-card hero deck is still being sourced.
 */
export const MONK: Hero = {
  id: 'monk',
  name: 'Monk',
  season: 'season1',
  complexity: 4,
  weapon: 'Chi',
  bio:
    'The Monk is a master in the art of Chi. He can channel this ancient energy to ' +
    'absorb incoming attacks from his opponents. He can also use Chi to unleash a ' +
    'maelstrom of pain. The Monk is not only the calm before the storm, but the ' +
    'storm itself.',
  palette: {
    primary: '#c8a24a',
    accent: '#7f9a4e',
    board: '#4a4430',
    abilityBg: 'linear-gradient(170deg, #9a8a64 0%, #7b6d4c 50%, #574c34 100%)',
    abilityInk: '#fdf6e4',
    abilityEdge: '#9fbb6a',
    ultimateBg: 'linear-gradient(120deg, #6b5c3a 0%, #4b4029 55%, #322a1a 100%)',
    ultimateInk: '#fdf6e4',
    ultimateEdge: '#a8c271',
  },

  dieFaces: [
    { value: 1, symbol: 'fist', label: 'FIST' },
    { value: 2, symbol: 'fist', label: 'FIST' },
    { value: 3, symbol: 'palm', label: 'PALM' },
    { value: 4, symbol: 'zen', label: 'ZEN' },
    { value: 5, symbol: 'zen', label: 'ZEN' },
    { value: 6, symbol: 'lotus', label: 'LOTUS' },
  ],

  abilities: [
    {
      id: 'fist-strike',
      name: 'Fist Strike',
      kind: 'offensive',
      level: 'I',
      tiers: [
        {
          requirement: { kind: 'symbols', symbols: { fist: 3 } },
          text: ['Deal [[dmg:6]] dmg.'],
          effects: [{ t: 'damage', amount: 6 }],
        },
        {
          requirement: { kind: 'symbols', symbols: { fist: 4 } },
          text: ['Deal [[dmg:7]] dmg.'],
          effects: [{ t: 'damage', amount: 7 }],
        },
        {
          requirement: { kind: 'symbols', symbols: { fist: 5 } },
          text: ['Deal [[dmg:8]] dmg.'],
          effects: [{ t: 'damage', amount: 8 }],
        },
      ],
      upgrades: {
        // Level III prints 7/8/9 with the Knockdown clause; II is the same
        // damage without it, which is the only reading the source supports.
        II: [
        {
          requirement: { kind: 'symbols', symbols: { fist: 3 } },
          text: ['Deal [[dmg:7]] dmg.'],
          effects: [
            { t: 'damage', amount: 7 },
          ],
        },
        {
          requirement: { kind: 'symbols', symbols: { fist: 4 } },
          text: ['Deal [[dmg:8]] dmg.'],
          effects: [
            { t: 'damage', amount: 8 },
          ],
        },
        {
          requirement: { kind: 'symbols', symbols: { fist: 5 } },
          text: ['Deal [[dmg:9]] dmg.'],
          effects: [
            { t: 'damage', amount: 9 },
          ],
        },
        ],
        III: [
        {
          requirement: { kind: 'symbols', symbols: { fist: 3 } },
          text: ['Deal [[dmg:7]] dmg.'],
          effects: [
            { t: 'damage', amount: 7 },
            {
              t: 'when',
              cond: { ofAKind: 4 },
              effects: [{ t: 'gainStatus', status: 'knockdown', target: 'opponent' }],
            },
          ],
        },
        {
          requirement: { kind: 'symbols', symbols: { fist: 4 } },
          text: ['Deal [[dmg:8]] dmg.'],
          effects: [
            { t: 'damage', amount: 8 },
            {
              t: 'when',
              cond: { ofAKind: 4 },
              effects: [{ t: 'gainStatus', status: 'knockdown', target: 'opponent' }],
            },
          ],
        },
        {
          requirement: { kind: 'symbols', symbols: { fist: 5 } },
          text: ['Deal [[dmg:9]] dmg.'],
          effects: [
            { t: 'damage', amount: 9 },
            {
              t: 'when',
              cond: { ofAKind: 4 },
              effects: [{ t: 'gainStatus', status: 'knockdown', target: 'opponent' }],
            },
          ],
        },
        ],
      },
    },
    {
      id: 'meditate',
      name: 'Meditate',
      kind: 'offensive',
      level: 'I',
      tiers: [
        {
          requirement: { kind: 'symbols', symbols: { zen: 3 } },
          text: [
            'Gain 5 *Chi* [[chi]].',
            'Gain *Evasive* [[evasive]]',
            '- or -',
            'gain *Cleanse* [[cleanse]].',
          ],
          effects: [
            { t: 'gainStatus', status: 'chi', amount: 5 },
            {
              t: 'choose',
              request: {
                pick: 'oneOf',
                options: [
                  { id: 'monk-evasive', label: 'Gain Evasive' },
                  { id: 'monk-cleanse', label: 'Gain Cleanse' },
                ],
              },
              effects: [
                {
                  t: 'when',
                  cond: { chose: 'monk-evasive' },
                  effects: [{ t: 'gainStatus', status: 'evasive' }],
                  otherwise: [{ t: 'gainStatus', status: 'cleanse' }],
                },
              ],
            },
          ],
        },
      ],
      upgrades: {
        II: [
          {
            requirement: { kind: 'symbols', symbols: { zen: 3 } },
            text: ['Gain 6 *Chi* [[chi]].', 'Gain *Evasive* [[evasive]] & *Cleanse* [[cleanse]].'],
            effects: [
              { t: 'gainStatus', status: 'chi', amount: 6 },
              { t: 'gainStatus', status: 'evasive' },
              { t: 'gainStatus', status: 'cleanse' },
            ],
          },
        ],
      },
    },
    {
      id: 'combo-strike',
      name: 'Combo Strike',
      kind: 'offensive',
      level: 'I',
      tiers: [
        {
          requirement: { kind: 'symbols', symbols: { fist: 3, palm: 1 } },
          text: [
            'Deal [[dmg:6]] dmg & roll [[die:1]]:',
            'On [[fist]], add [[dmg:2]] dmg.',
            'On [[palm]], add [[dmg:3]] dmg.',
            'On [[zen]], gain 2 *Chi* [[chi]].',
            'On [[lotus]], gain *Evasive* [[evasive]]',
            '- or -',
            'gain *Cleanse* [[cleanse]].',
          ],
          effects: [
            { t: 'damage', amount: 6 },
            {
              t: 'subRoll',
              dice: 1,
              outcomes: [
                { on: 'fist', effects: [{ t: 'damage', amount: 2 }] },
                { on: 'palm', effects: [{ t: 'damage', amount: 3 }] },
                { on: 'zen', effects: [{ t: 'gainStatus', status: 'chi', amount: 2 }] },
                { on: 'lotus', effects: [{
              t: 'choose',
              request: {
                pick: 'oneOf',
                options: [
                  { id: 'monk-evasive', label: 'Gain Evasive' },
                  { id: 'monk-cleanse', label: 'Gain Cleanse' },
                ],
              },
              effects: [
                {
                  t: 'when',
                  cond: { chose: 'monk-evasive' },
                  effects: [{ t: 'gainStatus', status: 'evasive' }],
                  otherwise: [{ t: 'gainStatus', status: 'cleanse' }],
                },
              ],
            }] },
              ],
            },
          ],
        },
      ],
      upgrades: {
        II: [
          {
            requirement: { kind: 'symbols', symbols: { fist: 3, palm: 1 } },
            text: ['Deal [[dmg:5]] dmg & roll [[die:2]]:', 'Then resolve each face.'],
            effects: [
              { t: 'damage', amount: 5 },
              {
                t: 'subRoll',
                dice: 2,
                outcomes: [
                  { on: 'fist', effects: [{ t: 'damage', amount: 2 }] },
                  { on: 'palm', effects: [{ t: 'damage', amount: 3 }] },
                  { on: 'zen', effects: [{ t: 'gainStatus', status: 'chi', amount: 2 }] },
                  {
                    on: 'lotus',
                    effects: [
                      {
                        t: 'choose',
                        request: {
                          pick: 'oneOf',
                          options: [
                            { id: 'monk-evasive', label: 'Gain Evasive' },
                            { id: 'monk-cleanse', label: 'Gain Cleanse' },
                          ],
                        },
                        effects: [
                          {
                            t: 'when',
                            cond: { chose: 'monk-evasive' },
                            effects: [{ t: 'gainStatus', status: 'evasive' }],
                            otherwise: [{ t: 'gainStatus', status: 'cleanse' }],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    },
    {
      id: 'tempest-rush',
      name: 'Tempest Rush',
      kind: 'offensive',
      level: 'I',
      tiers: [
        {
          requirement: { kind: 'symbols', symbols: { palm: 3 } },
          text: [
            'Roll [[die:3]]:',
            'Deal dmg equal to the total roll value.',
            'If the roll value is at least [[dmg:13]], inflict *Knockdown* [[knockdown]].',
          ],
          effects: [
            {
              t: 'subRoll',
              dice: 3,
              outcomes: [],
              total: [
                { t: 'damage', amount: { perPip: 1 } },
                {
                  t: 'when',
                  cond: { rollAtLeast: 13 },
                  effects: [{ t: 'gainStatus', status: 'knockdown', target: 'opponent' }],
                },
              ],
            },
          ],
        },
      ],
      upgrades: {
        II: [
          {
            requirement: { kind: 'symbols', symbols: { palm: 3 } },
            text: [
              'Roll [[die:3]]:',
              'Deal dmg equal to the total roll value.',
              'If the roll value is at least [[dmg:12]], inflict *Knockdown* [[knockdown]].',
            ],
            effects: [
              {
                t: 'subRoll',
                dice: 3,
                outcomes: [],
                total: [
                  { t: 'damage', amount: { perPip: 1 } },
                  {
                    t: 'when',
                    cond: { rollAtLeast: 12 },
                    effects: [{ t: 'gainStatus', status: 'knockdown', target: 'opponent' }],
                  },
                ],
              },
            ],
          },
        ],
      },
    },
    {
      id: 'fist-of-harmony',
      name: 'Fist of Harmony',
      kind: 'offensive',
      level: 'I',
      tiers: [
        {
          requirement: { kind: 'straight', length: 4 },
          requirementLabel: 'SMALL STRAIGHT',
          text: ['Deal [[dmg:6]] dmg.', 'Then gain 2 *Chi* [[chi]].'],
          effects: [
            { t: 'damage', amount: 6 },
            { t: 'gainStatus', status: 'chi', amount: 2 },
          ],
        },
      ],
      upgrades: {
        II: [
          {
            requirement: { kind: 'straight', length: 4 },
            requirementLabel: 'SMALL STRAIGHT',
            text: ['Deal [[dmg:6]] dmg.', 'Then gain 3 *Chi* [[chi]].'],
            effects: [
              { t: 'damage', amount: 6 },
              { t: 'gainStatus', status: 'chi', amount: 3 },
            ],
          },
        ],
      },
    },
    {
      id: 'lotus-strike',
      name: 'Lotus Strike',
      kind: 'offensive',
      level: 'I',
      tiers: [
        {
          requirement: { kind: 'symbols', symbols: { lotus: 4 } },
          text: [
            'Deal [[dmg:5]] *undefendable* dmg.',
            'Then increase *Chi* [[chi]] stack limit by 1 and gain 5 *Chi* [[chi]].',
          ],
          effects: [
            { t: 'damage', amount: 5, undefendable: true },
            { t: 'stackLimitBonus', status: 'chi', amount: 1 },
            { t: 'gainStatus', status: 'chi', amount: 5 },
          ],
        },
      ],
      upgrades: {
        II: [
          {
            requirement: { kind: 'symbols', symbols: { lotus: 3 } },
            text: [
              'Deal [[dmg:2]] *undefendable* dmg.',
              'Then gain *Evasive* [[evasive]] & 2 *Chi* [[chi]].',
            ],
            effects: [
              { t: 'damage', amount: 2, undefendable: true },
              { t: 'gainStatus', status: 'evasive' },
              { t: 'gainStatus', status: 'chi', amount: 2 },
            ],
          },
          {
            requirement: { kind: 'symbols', symbols: { lotus: 4 } },
            text: [
              'Deal [[dmg:6]] *undefendable* dmg.',
              'Then increase *Chi* [[chi]] stack limit by 1 and gain 6 *Chi* [[chi]].',
            ],
            effects: [
              { t: 'damage', amount: 6, undefendable: true },
              { t: 'stackLimitBonus', status: 'chi', amount: 1 },
              { t: 'gainStatus', status: 'chi', amount: 6 },
            ],
          },
        ],
      },
    },
    {
      id: 'fist-of-tranquility',
      name: 'Fist of Tranquility',
      kind: 'offensive',
      level: 'I',
      tiers: [
        {
          requirement: { kind: 'straight', length: 5 },
          requirementLabel: 'LARGE STRAIGHT',
          text: ['Deal [[dmg:7]] dmg.', 'Then gain *Evasive* [[evasive]] & 3 *Chi* [[chi]].'],
          effects: [
            { t: 'damage', amount: 7 },
            { t: 'gainStatus', status: 'evasive' },
            { t: 'gainStatus', status: 'chi', amount: 3 },
          ],
        },
      ],
      upgrades: {
        II: [
          {
            requirement: { kind: 'straight', length: 5 },
            requirementLabel: 'LARGE STRAIGHT',
            text: [
              'Deal [[dmg:7]] dmg. Inflict *Knockdown* [[knockdown]].',
              'Then gain *Evasive* [[evasive]] & 3 *Chi* [[chi]].',
            ],
            effects: [
              { t: 'damage', amount: 7 },
              { t: 'gainStatus', status: 'knockdown', target: 'opponent' },
              { t: 'gainStatus', status: 'evasive' },
              { t: 'gainStatus', status: 'chi', amount: 3 },
            ],
          },
        ],
      },
    },
    {
      id: 'serenity',
      name: 'Serenity',
      kind: 'defensive',
      level: 'I',
      tiers: [
        {
          requirement: { kind: 'defenseRoll', dice: 4 },
          requirementLabel: 'DEFENSE ROLL 4',
          text: ['Gain 1 × [[zen]] *Chi* [[chi]].', 'Deal [[dmg:1]] × [[fist]] dmg.'],
          effects: [
            {
              t: 'subRoll',
              dice: 4,
              outcomes: [
                { on: 'zen', effects: [{ t: 'gainStatus', status: 'chi', amount: 1 }] },
                { on: 'fist', effects: [{ t: 'damage', amount: 1, target: 'attacker' }] },
              ],
            },
          ],
        },
      ],
      upgrades: {
        II: [
          {
            requirement: { kind: 'defenseRoll', dice: 5 },
            requirementLabel: 'DEFENSE ROLL 5',
            text: ['Gain 1 × [[zen]] *Chi* [[chi]].', 'Deal [[dmg:1]] × [[fist]] dmg.'],
            effects: [
              {
                t: 'subRoll',
                dice: 5,
                outcomes: [
                  { on: 'zen', effects: [{ t: 'gainStatus', status: 'chi', amount: 1 }] },
                  { on: 'fist', effects: [{ t: 'damage', amount: 1, target: 'attacker' }] },
                ],
              },
            ],
          },
        ],
        III: [
          {
            requirement: { kind: 'defenseRoll', dice: 5 },
            requirementLabel: 'DEFENSE ROLL 5',
            text: [
              'Gain 1 × [[zen]] *Chi* [[chi]]. Deal [[dmg:1]] × [[fist]] dmg.',
              'With both [[zen]] and [[lotus]], gain *Evasive* [[evasive]] or *Cleanse* [[cleanse]].',
            ],
            effects: [
              {
                t: 'subRoll',
                dice: 5,
                outcomes: [
                  { on: 'zen', effects: [{ t: 'gainStatus', status: 'chi', amount: 1 }] },
                  { on: 'fist', effects: [{ t: 'damage', amount: 1, target: 'attacker' }] },
                  {
                    on: 'lotus',
                    atLeast: 1,
                    effects: [
                      {
                        t: 'when',
                        cond: { rolled: 'zen' },
                        effects: [
                          {
                            t: 'choose',
                            request: {
                              pick: 'oneOf',
                              options: [
                                { id: 'monk-evasive', label: 'Gain Evasive' },
                                { id: 'monk-cleanse', label: 'Gain Cleanse' },
                              ],
                            },
                            effects: [
                              {
                                t: 'when',
                                cond: { chose: 'monk-evasive' },
                                effects: [{ t: 'gainStatus', status: 'evasive' }],
                                otherwise: [{ t: 'gainStatus', status: 'cleanse' }],
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    },
    {
      id: 'transcendence',
      name: 'Transcendence!',
      kind: 'offensive',
      level: 'I',
      ultimate: true,
      tiers: [
        {
          requirement: { kind: 'symbols', symbols: { lotus: 5 } },
          text: [
            'Gain *Evasive* [[evasive]] & *Cleanse* [[cleanse]]. Inflict *Knockdown* [[knockdown]]. Deal [[dmg:10]] dmg.',
            'Then increase *Chi* [[chi]] stack limit by 1 and gain 6 *Chi* [[chi]].',
          ],
          effects: [
            { t: 'gainStatus', status: 'evasive' },
            { t: 'gainStatus', status: 'cleanse' },
            { t: 'gainStatus', status: 'knockdown', target: 'opponent' },
            { t: 'damage', amount: 10 },
            { t: 'stackLimitBonus', status: 'chi', amount: 1 },
            { t: 'gainStatus', status: 'chi', amount: 6 },
          ],
        },
      ],
    },
  ],

  statusEffects: [
    {
      id: 'chi',
      name: 'Chi',
      polarity: 'positive',
      stackLimit: 11,
      summary: 'Spend these tokens to increase or reduce dmg',
      text:
        'Chi tokens may be spent at any time to prevent 1 incoming damage per token. ' +
        'Alternatively, you may spend Chi to increase Attack dmg by 1 per token ' +
        'spent. Chi may not be used to increase dmg the turn that it was gained. ' +
        'Attack Modifier.',
    },
    SHARED_STATUS_EFFECTS.evasive,
    SHARED_STATUS_EFFECTS.knockdown,
    {
      id: 'cleanse',
      name: 'Cleanse',
      polarity: 'positive',
      stackLimit: 4,
      summary: 'Spend to remove a status effect token',
      text:
        'A player with this token may spend it at any time to remove a single status ' +
        'effect token from themselves.',
    },
  ],

  /** 15 hero cards plus the 18 shared action cards: 33 in total. */
  cards: [...MONK_CARDS, ...COMMON_CARDS],

  portrait: '/heroes/monk.webp',
  startingHealth: 50,
};
