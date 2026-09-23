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
      upgrades: {
        II: [
        {
          requirement: { kind: 'symbols', symbols: { arrow: 3 } },
          text: ['Deal [[dmg:4]] dmg.'],
          effects: [
            { t: 'damage', amount: 4 },
            {
              t: 'when',
              cond: { ofAKind: 4 },
              effects: [{ t: 'gainStatus', status: 'entangle', target: 'opponent' }],
            },
          ],
        },
        {
          requirement: { kind: 'symbols', symbols: { arrow: 4 } },
          text: ['Deal [[dmg:6]] dmg.'],
          effects: [
            { t: 'damage', amount: 6 },
            {
              t: 'when',
              cond: { ofAKind: 4 },
              effects: [{ t: 'gainStatus', status: 'entangle', target: 'opponent' }],
            },
          ],
        },
        {
          requirement: { kind: 'symbols', symbols: { arrow: 5 } },
          text: ['Deal [[dmg:8]] dmg.'],
          effects: [
            { t: 'damage', amount: 8 },
            {
              t: 'when',
              cond: { ofAKind: 4 },
              effects: [{ t: 'gainStatus', status: 'entangle', target: 'opponent' }],
            },
          ],
        },
        ],
        III: [
        {
          requirement: { kind: 'symbols', symbols: { arrow: 3 } },
          text: ['Deal [[dmg:5]] dmg.'],
          effects: [
            { t: 'damage', amount: 5 },
            {
              t: 'when',
              cond: { ofAKind: 3 },
              effects: [{ t: 'gainStatus', status: 'entangle', target: 'opponent' }],
            },
          ],
        },
        {
          requirement: { kind: 'symbols', symbols: { arrow: 4 } },
          text: ['Deal [[dmg:7]] dmg.'],
          effects: [
            { t: 'damage', amount: 7 },
            {
              t: 'when',
              cond: { ofAKind: 3 },
              effects: [{ t: 'gainStatus', status: 'entangle', target: 'opponent' }],
            },
          ],
        },
        {
          requirement: { kind: 'symbols', symbols: { arrow: 5 } },
          text: ['Deal [[dmg:9]] dmg.'],
          effects: [
            { t: 'damage', amount: 9 },
            {
              t: 'when',
              cond: { ofAKind: 3 },
              effects: [{ t: 'gainStatus', status: 'entangle', target: 'opponent' }],
            },
          ],
        },
        ],
      },
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
      upgrades: {
        II: [
          {
            requirement: { kind: 'symbols', symbols: { arrow: 2, moon: 1 } },
            text: ['Inflict *Targeted* [[targeted]] & *Entangle* [[entangle]].'],
            effects: [
              { t: 'gainStatus', status: 'targeted', target: 'opponent' },
              { t: 'gainStatus', status: 'entangle', target: 'opponent' },
            ],
          },
          {
            requirement: { kind: 'symbols', symbols: { arrow: 3, moon: 2 } },
            text: ['Inflict *Targeted* [[targeted]].', 'Deal [[dmg:6]] dmg.'],
            effects: [
              { t: 'gainStatus', status: 'targeted', target: 'opponent' },
              { t: 'damage', amount: 6 },
            ],
          },
        ],
      },
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
      upgrades: {
        II: [
          {
            requirement: { kind: 'symbols', symbols: { foot: 3 } },
            text: [
              'A chosen player gains *Evasive* [[evasive]].',
              'Deal [[dmg:2]] *undefendable* dmg.',
            ],
            effects: [
              {
                t: 'choose',
                request: { pick: 'player' },
                effects: [{ t: 'gainStatus', status: 'evasive', target: 'chosen' }],
              },
              { t: 'damage', amount: 2, undefendable: true },
            ],
          },
          {
            requirement: { kind: 'symbols', symbols: { arrow: 2, foot: 3 } },
            text: ['Gain *Evasive* [[evasive]].', 'Deal [[dmg:9]] dmg.'],
            effects: [
              { t: 'gainStatus', status: 'evasive' },
              { t: 'damage', amount: 9 },
            ],
          },
        ],
      },
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
      upgrades: {
        II: [
        {
          requirement: { kind: 'symbols', symbols: { arrow: 1, moon: 3 } },
          text: [
            'Deal [[dmg:3]] dmg & roll [[die:5]]:',
            'Add [[dmg:1]] × [[arrow]] and [[dmg:2]] × [[foot]].',
            'Opponent loses [[cp:1]] × [[moon]]. Inflict *Blind* [[blind]].',
          ],
          effects: [
            { t: 'damage', amount: 3 },
            {
              t: 'subRoll',
              dice: 5,
              outcomes: [
                { on: 'arrow', effects: [{ t: 'damage', amount: 1 }] },
                { on: 'foot', effects: [{ t: 'damage', amount: 2 }] },
                { on: 'moon', effects: [{ t: 'gainCP', amount: -1, target: 'opponent' }] },
              ],
            },
            { t: 'gainStatus', status: 'blind', target: 'opponent' },
          ],
        },
        ],
        III: [
        {
          requirement: { kind: 'symbols', symbols: { arrow: 1, moon: 3 } },
          text: [
            'Deal [[dmg:3]] dmg & roll [[die:5]]:',
            'Add [[dmg:1]] × [[arrow]] and [[dmg:2]] × [[foot]].',
            'Opponent loses [[cp:1]] × [[moon]]. Inflict *Blind* [[blind]] & *Entangle* [[entangle]].',
          ],
          effects: [
            { t: 'damage', amount: 3 },
            {
              t: 'subRoll',
              dice: 5,
              outcomes: [
                { on: 'arrow', effects: [{ t: 'damage', amount: 1 }] },
                { on: 'foot', effects: [{ t: 'damage', amount: 2 }] },
                { on: 'moon', effects: [{ t: 'gainCP', amount: -1, target: 'opponent' }] },
              ],
            },
            { t: 'gainStatus', status: 'blind', target: 'opponent' },
            { t: 'gainStatus', status: 'entangle', target: 'opponent' },
          ],
        },
        ],
      },
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
      upgrades: {
        II: [
          {
            requirement: { kind: 'straight', length: 4 },
            requirementLabel: 'SMALL STRAIGHT',
            text: ['Inflict *Entangle* [[entangle]].', 'Deal [[dmg:9]] dmg.'],
            effects: [
              { t: 'gainStatus', status: 'entangle', target: 'opponent' },
              { t: 'damage', amount: 9 },
            ],
          },
        ],
      },
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
      upgrades: {
        II: [
          {
            requirement: { kind: 'symbols', symbols: { moon: 3 } },
            text: [
              'Gain *Evasive* [[evasive]].',
              'Inflict *Blind* [[blind]], *Entangle* [[entangle]] & *Targeted* [[targeted]].',
            ],
            effects: [
              { t: 'gainStatus', status: 'evasive' },
              { t: 'gainStatus', status: 'blind', target: 'opponent' },
              { t: 'gainStatus', status: 'entangle', target: 'opponent' },
              { t: 'gainStatus', status: 'targeted', target: 'opponent' },
            ],
          },
          {
            requirement: { kind: 'symbols', symbols: { moon: 4 } },
            text: [
              'Inflict *Blind* [[blind]], *Entangle* [[entangle]] & *Targeted* [[targeted]].',
              'Deal [[dmg:9]] dmg.',
            ],
            effects: [
              { t: 'gainStatus', status: 'blind', target: 'opponent' },
              { t: 'gainStatus', status: 'entangle', target: 'opponent' },
              { t: 'gainStatus', status: 'targeted', target: 'opponent' },
              { t: 'damage', amount: 9 },
            ],
          },
        ],
      },
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
      upgrades: {
        II: [
          {
            requirement: { kind: 'symbols', symbols: { arrow: 1, foot: 2, moon: 1 } },
            text: ['Gain 3 *Evasive* [[evasive]].', 'Inflict *Entangle* [[entangle]].'],
            effects: [
              { t: 'gainStatus', status: 'evasive', amount: 3 },
              { t: 'gainStatus', status: 'entangle', target: 'opponent' },
            ],
          },
          {
            requirement: { kind: 'straight', length: 5 },
            requirementLabel: 'LARGE STRAIGHT',
            text: [
              'Inflict *Blind* [[blind]]. Gain *Evasive* [[evasive]].',
              'Deal [[dmg:10]] dmg.',
            ],
            effects: [
              { t: 'gainStatus', status: 'blind', target: 'opponent' },
              { t: 'gainStatus', status: 'evasive' },
              { t: 'damage', amount: 10 },
            ],
          },
        ],
      },
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
            'On [[foot]][[foot]], prevent 1/2 the incoming dmg *(rounded up)*.',
            'For every 2 × [[arrow]], deal [[dmg:1]].',
          ],
          effects: [
            {
              t: 'subRoll',
              dice: 5,
              outcomes: [
                /*
                 * Rulebook p.10, worked example: the Elf rolls one Bow and
                 * four Feet, prevents half the damage and deals nothing back.
                 * So the halving wants two Feet and happens once however many
                 * more she rolls, and a lone Bow deals nothing — it is one
                 * damage per pair, not per Bow.
                 */
                { on: 'foot', atLeast: 2, effects: [{ t: 'preventFraction', divisor: 2 }] },
                { on: 'arrow', atLeast: 2, effects: [{ t: 'damage', amount: 1, target: 'attacker' }] },
                { on: 'arrow', atLeast: 4, effects: [{ t: 'damage', amount: 1, target: 'attacker' }] },
              ],
            },
          ],
        },
      ],
      upgrades: {
        /*
         * Not attested. The rulebook prints level I only, and the project the
         * other heroes' upgrades came from has nothing past it for this slot,
         * so this adds the one clause the hero's own kit makes obvious — the
         * shape Thick Skin II uses — rather than inventing numbers.
         */
        II: [
          {
            requirement: { kind: 'defenseRoll', dice: 5 },
            requirementLabel: 'DEFENSE ROLL 5',
            text: [
              'On [[foot]][[foot]], prevent 1/2 the incoming dmg *(rounded up)*.',
              'For every 2 × [[arrow]], deal [[dmg:1]].',
              'On [[moon]][[moon]], gain *Evasive* [[evasive]].',
            ],
            effects: [
              {
                t: 'subRoll',
                dice: 5,
                outcomes: [
                  { on: 'foot', atLeast: 2, effects: [{ t: 'preventFraction', divisor: 2 }] },
                  { on: 'arrow', atLeast: 2, effects: [{ t: 'damage', amount: 1, target: 'attacker' }] },
                  { on: 'arrow', atLeast: 4, effects: [{ t: 'damage', amount: 1, target: 'attacker' }] },
                  { on: 'moon', atLeast: 2, effects: [{ t: 'gainStatus', status: 'evasive' }] },
                ],
              },
            ],
          },
        ],
      },
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
      stackLimit: 2,
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
      stackLimit: 2,
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
      stackLimit: 3,
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
