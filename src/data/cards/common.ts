/**
 * Action cards every hero shares (different art, same rules).
 *
 * Generated from zhuanggenhua/BoardGame (MIT). Rules text is faithful;
 * card names there are a Chinese round-trip and do not always match the
 * names printed on the English cards.
 *
 * `effects` is the executable form of the printed text, and `window` narrows
 * when the card may be played: a Roll Phase card needs dice on the table, and
 * an Instant that prevents damage needs an attack to prevent it from.
 */
import type { Card } from '../../engine/types';

export const COMMON_CARDS: Card[] = [
  {
    id: 'common-card-play-six',
    name: 'Play Six!',
    type: 'rollPhase',
    cp: 1,
    copies: 1,
    text: [
      'Set 1 of your dice to 6.',
    ],
    window: { needsRoll: true },
    effects: [
      { t: 'choose', request: { pick: 'die', scope: 'own' }, effects: [{ t: 'setDie', value: 6 }] },
    ],
    art: '/cards/common/common-card-play-six.webp',
  },
  {
    id: 'common-card-just-this',
    name: 'Just This?',
    type: 'rollPhase',
    cp: 0,
    copies: 1,
    text: [
      '1 player may make 1 extra roll attempt with up to 5 dice during their defensive roll phase.',
    ],
    effects: [
      {
        t: 'choose',
        request: { pick: 'player' },
        effects: [{ t: 'extraRollAttempt', phase: 'defensive', target: 'chosen' }],
      },
    ],
    art: '/cards/common/common-card-just-this.webp',
  },
  {
    id: 'common-card-give-hand',
    name: 'Give a Hand!',
    type: 'rollPhase',
    cp: 1,
    copies: 1,
    text: [
      'Select 1 opponent\'s die and force them to reroll it.',
    ],
    window: { needsRoll: true },
    effects: [
      {
        t: 'choose',
        request: { pick: 'die', scope: 'opponents' },
        effects: [{ t: 'rerollDie' }],
      },
    ],
    art: '/cards/common/common-card-give-hand.webp',
  },
  {
    id: 'common-card-i-can-again',
    name: 'I Can Again!',
    type: 'rollPhase',
    cp: 1,
    copies: 1,
    text: [
      '1 player may make 1 extra roll attempt with up to 5 dice during their offensive roll phase.',
    ],
    effects: [
      {
        t: 'choose',
        request: { pick: 'player' },
        effects: [{ t: 'extraRollAttempt', phase: 'offensive', target: 'chosen' }],
      },
    ],
    art: '/cards/common/common-card-i-can-again.webp',
  },
  {
    id: 'common-card-me-too',
    name: 'Me Too!',
    type: 'rollPhase',
    cp: 1,
    copies: 1,
    text: [
      'Set 1 of your dice to match another of your dice (same phase and purpose).',
    ],
    window: { needsRoll: true },
    effects: [
      {
        t: 'choose',
        request: { pick: 'die', scope: 'own' },
        effects: [
          {
            t: 'choose',
            request: { pick: 'dieValue', mode: 'shown' },
            effects: [{ t: 'setDie', fromChoice: true }],
          },
        ],
      },
    ],
    art: '/cards/common/common-card-me-too.webp',
  },
  {
    id: 'common-card-surprise',
    name: 'Surprise!',
    type: 'rollPhase',
    cp: 2,
    copies: 1,
    text: [
      'Change any 1 die to any value.',
    ],
    window: { needsRoll: true },
    effects: [
      {
        t: 'choose',
        request: { pick: 'die' },
        effects: [
          {
            t: 'choose',
            request: { pick: 'dieValue' },
            effects: [{ t: 'setDie', fromChoice: true }],
          },
        ],
      },
    ],
    art: '/cards/common/common-card-surprise.webp',
  },
  {
    id: 'common-card-worthy-of-me',
    name: 'Worthy of Me!',
    type: 'rollPhase',
    cp: 1,
    copies: 1,
    text: [
      'You or 1 teammate may reroll up to 2 dice (same die twice or 2 different dice once each).',
    ],
    window: { needsRoll: true },
    effects: [
      {
        t: 'choose',
        request: { pick: 'die', scope: 'own', optional: true },
        effects: [{ t: 'rerollDie' }],
      },
      {
        t: 'choose',
        request: { pick: 'die', scope: 'own', optional: true },
        effects: [{ t: 'rerollDie' }],
      },
    ],
    art: '/cards/common/common-card-worthy-of-me.webp',
  },
  {
    id: 'common-card-unexpected',
    name: 'Unexpected!',
    type: 'rollPhase',
    cp: 3,
    copies: 1,
    text: [
      'Change any 2 dice to any values.',
    ],
    window: { needsRoll: true },
    effects: [
      {
        t: 'choose',
        request: { pick: 'die' },
        effects: [
          {
            t: 'choose',
            request: { pick: 'dieValue' },
            effects: [{ t: 'setDie', fromChoice: true }],
          },
        ],
      },
      {
        t: 'choose',
        request: { pick: 'die' },
        effects: [
          {
            t: 'choose',
            request: { pick: 'dieValue' },
            effects: [{ t: 'setDie', fromChoice: true }],
          },
        ],
      },
    ],
    art: '/cards/common/common-card-unexpected.webp',
  },
  {
    id: 'common-card-next-time',
    name: 'Next Time!',
    type: 'instant',
    cp: 1,
    copies: 1,
    text: [
      'One player prevents 6 points of incoming damage.',
    ],
    window: { needsAttack: true },
    effects: [{ t: 'preventDamage', amount: 6 }],
    art: '/cards/common/common-card-next-time.webp',
  },
  {
    id: 'common-card-boss-generous',
    name: 'Boss Generous!',
    type: 'instant',
    cp: 0,
    copies: 1,
    text: [
      'Gain 2 CP.',
    ],
    effects: [{ t: 'gainCP', amount: 2 }],
    art: '/cards/common/common-card-boss-generous.webp',
  },
  {
    id: 'common-card-flick',
    name: 'Flick!',
    type: 'instant',
    cp: 1,
    copies: 1,
    text: [
      'Increase or decrease any 1 die by 1 (1 cannot go lower, 6 cannot go higher).',
    ],
    window: { needsRoll: true },
    effects: [
      {
        t: 'choose',
        request: { pick: 'die' },
        effects: [
          {
            t: 'choose',
            request: { pick: 'dieValue', mode: 'adjacent' },
            effects: [{ t: 'setDie', fromChoice: true }],
          },
        ],
      },
    ],
    art: '/cards/common/common-card-flick.webp',
  },
  {
    id: 'common-card-bye-bye',
    name: 'Bye Bye!',
    type: 'instant',
    cp: 2,
    copies: 1,
    text: [
      'Remove 1 status effect from 1 player.',
    ],
    effects: [
      { t: 'choose', request: { pick: 'status' }, effects: [{ t: 'removeStatus' }] },
    ],
    art: '/cards/common/common-card-bye-bye.webp',
  },
  {
    id: 'common-card-double',
    name: 'Double!',
    type: 'instant',
    cp: 1,
    copies: 1,
    text: [
      'Draw 2 cards.',
    ],
    effects: [{ t: 'drawCard', amount: 2 }],
    art: '/cards/common/common-card-double.webp',
  },
  {
    id: 'common-card-super-double',
    name: 'Super Double!',
    type: 'instant',
    cp: 2,
    copies: 1,
    text: [
      'Draw 3 cards.',
    ],
    effects: [{ t: 'drawCard', amount: 3 }],
    art: '/cards/common/common-card-super-double.webp',
  },
  {
    id: 'common-card-get-away',
    name: 'Get Away!',
    type: 'mainPhase',
    cp: 1,
    copies: 1,
    text: [
      'Remove 1 status effect from 1 player.',
    ],
    effects: [
      { t: 'choose', request: { pick: 'status' }, effects: [{ t: 'removeStatus' }] },
    ],
    art: '/cards/common/common-card-get-away.webp',
  },
  {
    id: 'common-card-one-throw-fortune',
    name: 'One Throw Fortune!',
    type: 'mainPhase',
    cp: 0,
    copies: 1,
    text: [
      'Roll 1 die: gain CP equal to half the value (rounded up).',
    ],
    effects: [
      {
        t: 'subRoll',
        dice: 1,
        outcomes: [
          { on: 1, effects: [{ t: 'gainCP', amount: 1 }] },
          { on: 2, effects: [{ t: 'gainCP', amount: 1 }] },
          { on: 3, effects: [{ t: 'gainCP', amount: 2 }] },
          { on: 4, effects: [{ t: 'gainCP', amount: 2 }] },
          { on: 5, effects: [{ t: 'gainCP', amount: 3 }] },
          { on: 6, effects: [{ t: 'gainCP', amount: 3 }] },
        ],
      },
    ],
    art: '/cards/common/common-card-one-throw-fortune.webp',
  },
  {
    id: 'common-card-what-status',
    name: 'What Status?',
    type: 'mainPhase',
    cp: 2,
    copies: 1,
    text: [
      'Remove all status effects from 1 player.',
    ],
    effects: [
      {
        t: 'choose',
        request: { pick: 'player' },
        effects: [{ t: 'removeAllStatus', target: 'chosen' }],
      },
    ],
    art: '/cards/common/common-card-what-status.webp',
  },
  {
    id: 'common-card-transfer-status',
    name: 'Transfer Status!',
    type: 'mainPhase',
    cp: 2,
    copies: 1,
    text: [
      'Transfer 1 status effect from 1 player to another player.',
    ],
    tags: ['Transfer'],
    effects: [
      {
        t: 'choose',
        request: { pick: 'status' },
        effects: [
          {
            t: 'choose',
            request: { pick: 'player' },
            effects: [{ t: 'transferStatus', from: 'chosen', to: 'chosen', amount: 1 }],
          },
        ],
      },
    ],
    art: '/cards/common/common-card-transfer-status.webp',
  },
];
