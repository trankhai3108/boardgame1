import type { StatusEffect } from '../engine/types';

/**
 * Status effects shared by several heroes. A hero's definition references these
 * by id and may add its own unique ones.
 *
 * Text is transcribed from the hero leaflets.
 */
export const SHARED_STATUS_EFFECTS: Record<string, StatusEffect> = {
  crit: {
    id: 'crit',
    name: 'Crit',
    polarity: 'positive',
    stackLimit: 1,
    summary: 'Spend to add 4 dmg to your Attack',
    text:
      'If a player with this token is dealing at least 5 dmg as a result of their ' +
      'Offensive Roll Phase, this token may be spent to deal 4 dmg. Attack Modifier.',
  },
  protect: {
    id: 'protect',
    name: 'Protect',
    polarity: 'positive',
    stackLimit: 1,
    summary: 'Prevent 1/2 incoming damage',
    text:
      'A player with this token may spend it at any time to prevent 1/2 incoming ' +
      'damage (rounded up).',
  },
  accuracy: {
    id: 'accuracy',
    name: 'Accuracy',
    polarity: 'positive',
    stackLimit: 1,
    summary: 'Spend to make your Attack undefendable',
    text:
      'A player with this token may spend it at the conclusion of their Offensive ' +
      'Roll Phase to make their Attack undefendable. Attack Modifier.',
  },
  evasive: {
    id: 'evasive',
    name: 'Evasive',
    polarity: 'positive',
    stackLimit: 3,
    summary: 'Spend & roll 1-2 to avoid damage',
    text:
      'When a player with this token receives damage, they may choose to spend it. ' +
      'If spent, roll 1 die. If the outcome is 1-2, no dmg is received (although ' +
      'other associated effects may still apply). Multiple tokens may be spent in ' +
      'an attempt to prevent the same source of damage.',
  },
  knockdown: {
    id: 'knockdown',
    name: 'Knockdown',
    polarity: 'negative',
    stackLimit: 1,
    summary: 'Spend 2 CP or skip Offensive Roll Phase',
    text:
      'To remove this token, a player afflicted with it must spend 2 CP before the ' +
      'start of their Offensive Roll Phase. If the player does not, they must skip ' +
      'their Offensive Roll Phase and then remove this token.',
  },
  stun: {
    id: 'stun',
    name: 'Stun',
    polarity: 'negative',
    stackLimit: 1,
    summary: 'Perform another Offensive Roll Phase',
    text:
      'A player afflicted with this token may take no actions of any kind (i.e. no ' +
      'cards may be played, no defense may be made, no status tokens or passive ' +
      'abilities may be used, etc). After the Attack concludes, the player who ' +
      'inflicted Stun removes the token and then immediately targets the same ' +
      'opponent with an additional Offensive Roll Phase (if this opponent is ' +
      'removed from the battlefield, this additional Offensive Roll Phase is ' +
      'forfeited).',
  },
  burn: {
    id: 'burn',
    name: 'Burn',
    polarity: 'negative',
    stackLimit: 1,
    summary: 'Receive 2 dmg in Upkeep Phase',
    text:
      'A player afflicted with this token receives 2 dmg during their Upkeep Phase. ' +
      'Persistent.',
  },
  retribution: {
    id: 'retribution',
    name: 'Retribution',
    polarity: 'positive',
    stackLimit: 1,
    summary: 'Spend when Attacked to deal 1/2 dmg back',
    text:
      "This token may be spent after being Attacked as a result of an opponent's " +
      'Offensive Roll Phase to deal half of the incoming dmg (rounded up) back to ' +
      'the Attacker.',
  },
};
