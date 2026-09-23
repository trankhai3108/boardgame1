import type { Hero } from '../../../engine/types';
import { COMMON_CARDS } from '../../cards/common';
import { TREANT_CARDS } from '../../cards/treant';

/**
 * Treant — Dice Throne Season 1 ReRolled.
 *
 * Abilities, dice faces and status effects are transcribed from the printed
 * hero board and leaflet. The 32-card hero deck is still being sourced.
 *
 * The Treant's Spirits are Companions rather than ordinary status effects:
 * "growing" a Spirit either gains a Seedling or upgrades an existing Spirit
 * (Seedling -> Sapling -> Dryad).
 */
export const TREANT: Hero = {
  id: 'treant',
  name: 'Treant',
  season: 'season1',
  complexity: 6,
  weapon: 'Branches',
  bio:
    'The Treant is the most elder of contenders. He decided he could no longer be a ' +
    'stick in the mud weeping over willows. He chose to branch out, leafing his ' +
    'thicket behind with a sappy goodbye. He dug deep, packed his trunk, spruced ' +
    'himself up, and began lumbering ever closer to the true root of the problem — ' +
    'the Mad King.',
  palette: {
    primary: '#c9a83c',
    accent: '#5f8f36',
    board: '#31491c',
    abilityBg: 'linear-gradient(170deg, #55702c 0%, #3d5420 50%, #293a15 100%)',
    abilityInk: '#f4f7e2',
    abilityEdge: '#8fb24a',
    ultimateBg: 'linear-gradient(120deg, #4c6a26 0%, #35491a 55%, #223010 100%)',
    ultimateInk: '#f4f7e2',
    ultimateEdge: '#a8c65c',
  },

  dieFaces: [
    { value: 1, symbol: 'branch', label: 'BRANCH' },
    { value: 2, symbol: 'branch', label: 'BRANCH' },
    { value: 3, symbol: 'branch', label: 'BRANCH' },
    { value: 4, symbol: 'leaf', label: 'LEAF' },
    { value: 5, symbol: 'leaf', label: 'LEAF' },
    { value: 6, symbol: 'spirit', label: 'SPIRIT' },
  ],

  abilities: [
    {
      id: 'splinter',
      name: 'Splinter',
      kind: 'offensive',
      level: 'I',
      tiers: [
        {
          requirement: { kind: 'symbols', symbols: { branch: 3 } },
          text: ['Deal [[dmg:5]] dmg.'],
          effects: [{ t: 'damage', amount: 5 }],
        },
        {
          requirement: { kind: 'symbols', symbols: { branch: 4 } },
          text: ['Deal [[dmg:6]] dmg.'],
          effects: [{ t: 'damage', amount: 6 }],
        },
        {
          requirement: { kind: 'symbols', symbols: { branch: 5 } },
          text: ['Deal [[dmg:7]] dmg.'],
          effects: [{ t: 'damage', amount: 7 }],
        },
      ],
      footer: ['You may discard 1 *Spirit* to inflict *Barbed Vine* [[barbedvine]].'],
    },
    {
      id: 'tend',
      name: 'Tend',
      kind: 'offensive',
      level: 'I',
      tiers: [
        {
          requirement: { kind: 'symbols', symbols: { leaf: 2, spirit: 2 } },
          text: [
            'Draw [[card:1]]. Grow 3 *Spirits*.',
            'A chosen player gains *Wellspring* [[wellspring]].',
            'A chosen opponent is inflicted with *Barbed Vine* [[barbedvine]].',
          ],
          effects: [
            { t: 'drawCard', amount: 1 },
            { t: 'manual', note: 'Grow 3 Spirits.' },
            { t: 'gainStatus', status: 'wellspring', target: 'chosenPlayer' },
            { t: 'gainStatus', status: 'barbed-vine', target: 'opponent' },
          ],
        },
      ],
    },
    {
      id: 'fertilize',
      name: 'Fertilize',
      kind: 'passive',
      level: 'I',
      tiers: [],
      text: ['During your *Upkeep Phase*, grow 1 *Spirit*.'],
      passive: { upkeep: [{ t: 'growSpirit', amount: 1 }] },
    },
    {
      id: 'overgrowth',
      name: 'Overgrowth',
      kind: 'offensive',
      level: 'I',
      tiers: [
        {
          requirement: { kind: 'symbols', symbols: { branch: 2, leaf: 3 } },
          text: [
            'Deal [[dmg:2]] dmg.',
            'You may remove up to 2 *Spirits* to add [[dmg:4]] dmg per *Spirit* removed.',
            'You may discard *Wellspring* [[wellspring]] to make this *Attack* *undefendable*.',
          ],
          effects: [
            { t: 'damage', amount: 2 },
            { t: 'manual', note: 'Remove up to 2 Spirits; add 4 dmg per Spirit removed.' },
            { t: 'manual', note: 'You may discard Wellspring to make this attack undefendable.' },
          ],
        },
      ],
    },
    {
      id: 'vengeful-vines',
      name: 'Vengeful Vines',
      kind: 'offensive',
      level: 'I',
      tiers: [
        {
          requirement: { kind: 'straight', length: 4 },
          requirementLabel: 'SMALL STRAIGHT',
          text: ['Inflict *Barbed Vine* [[barbedvine]].', 'Deal [[dmg:7]] dmg.'],
          effects: [
            { t: 'gainStatus', status: 'barbed-vine', target: 'opponent' },
            { t: 'damage', amount: 7 },
          ],
        },
      ],
    },
    {
      id: 'natures-grasp',
      name: "Nature's Grasp",
      kind: 'offensive',
      level: 'I',
      tiers: [
        {
          requirement: { kind: 'symbols', symbols: { spirit: 4 } },
          text: [
            'Grow 2 *Spirits*.',
            'Then deal [[dmg:5]] *undefendable* dmg + [[dmg:1]] dmg per *Spirit*.',
          ],
          effects: [
            { t: 'manual', note: 'Grow 2 Spirits.' },
            {
              t: 'manual',
              note: 'Deal 5 undefendable dmg + 1 per Spirit held when the ability activated.',
            },
          ],
        },
      ],
    },
    {
      id: 'call-of-the-wild',
      name: 'Call of the Wild',
      kind: 'offensive',
      level: 'I',
      tiers: [
        {
          requirement: { kind: 'straight', length: 5 },
          requirementLabel: 'LARGE STRAIGHT',
          text: [
            'Deal [[dmg:8]] dmg & roll [[die:4]]:',
            'Add [[dmg:1]] × [[branch]] dmg.',
            'On [[leaf]], gain *Wellspring* [[wellspring]].',
            'Grow 1 × [[spirit]] *Spirits*.',
          ],
          effects: [
            { t: 'damage', amount: 8 },
            {
              t: 'subRoll',
              dice: 4,
              outcomes: [
                { on: 'branch', effects: [{ t: 'damage', amount: 1 }] },
                { on: 'leaf', effects: [{ t: 'gainStatus', status: 'wellspring' }] },
                { on: 'spirit', effects: [{ t: 'manual', note: 'Grow 1 Spirit.' }] },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'rooted',
      name: 'Rooted',
      kind: 'defensive',
      level: 'I',
      tiers: [
        {
          requirement: { kind: 'defenseRoll', dice: 3 },
          requirementLabel: 'DEFENSE ROLL 3',
          text: [
            'Prevent [[prevent:1]] × [[branch]] + [[prevent:1]] × [[spirit]] dmg.',
            'On [[leaf]], grow a *Spirit*.',
          ],
          effects: [
            {
              t: 'subRoll',
              dice: 3,
              outcomes: [
                { on: 'branch', effects: [{ t: 'prevent', amount: 1 }] },
                { on: 'spirit', effects: [{ t: 'prevent', amount: 1 }] },
                { on: 'leaf', effects: [{ t: 'manual', note: 'Grow a Spirit.' }] },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'wake-the-forest',
      name: 'Wake the Forest!',
      kind: 'offensive',
      level: 'I',
      ultimate: true,
      tiers: [
        {
          requirement: { kind: 'symbols', symbols: { spirit: 5 } },
          text: [
            'You and a chosen teammate gain *Wellspring* [[wellspring]].',
            'Grow 5 *Spirits*. Inflict *Barbed Vine* [[barbedvine]]. Then deal [[dmg:10]] dmg.',
          ],
          effects: [
            { t: 'gainStatus', status: 'wellspring' },
            { t: 'manual', note: 'A chosen teammate also gains Wellspring. Grow 5 Spirits.' },
            { t: 'gainStatus', status: 'barbed-vine', target: 'opponent' },
            { t: 'damage', amount: 10 },
          ],
        },
      ],
    },
  ],

  statusEffects: [
    {
      id: 'seedling',
      name: 'Seedling Spirit',
      polarity: 'companion',
      stackLimit: 3,
      summary: 'Spend to re-roll 1 of your dice',
      text:
        'Spend Seedling to re-roll 1 of your dice. To "Grow a Spirit" means to gain a ' +
        'Seedling, or upgrade an existing Spirit (Seedling to Sapling, or Sapling to ' +
        'Dryad). You may spend 1 Spirit of each type once per turn.',
    },
    {
      id: 'sapling',
      name: 'Sapling Spirit',
      polarity: 'companion',
      stackLimit: 2,
      summary: 'Spend to Heal 1 and gain 1 CP',
      text:
        'Spend Sapling to Heal 1 and gain 1 CP. Spend Sapling and 1 CP to draw 1 card.',
    },
    {
      id: 'dryad',
      name: 'Dryad Spirit',
      polarity: 'companion',
      stackLimit: 1,
      summary: 'Spend to add 3 dmg',
      text:
        'Spend Dryad to add 3 dmg. Attack Modifier. If an opponent’s Attack would ' +
        'inflict a Negative Status Effect upon you, you may spend Dryad at the ' +
        'conclusion of their Offensive Roll Phase to prevent that incoming status ' +
        'effect.',
    },
    {
      id: 'barbed-vine',
      name: 'Barbed Vine',
      polarity: 'negative',
      stackLimit: 1,
      summary: 'Receive 1 dmg for additional Roll Attempts',
      text:
        'A player afflicted with this token receives 1 dmg for each Roll Attempt ' +
        'beyond the first during their Offensive Roll Phase, up to a maximum of 2 dmg ' +
        'per turn. This token is removed and then this dmg is applied at the ' +
        'conclusion of the Roll Phase.',
    },
    {
      id: 'wellspring',
      name: 'Wellspring',
      polarity: 'positive',
      stackLimit: 1,
      summary: 'Heal 1/2 of 1 die during Main Phase',
      text:
        'A player with this token may spend it during their Main Phase & roll 1 die: ' +
        'gain 1/2 the value as Health (rounded up).',
    },
  ],

  /** 15 hero cards plus the 18 shared action cards: 33 in total. */
  cards: [...TREANT_CARDS, ...COMMON_CARDS],

  portrait: '/heroes/treant.webp',
  startingHealth: 50,
};
