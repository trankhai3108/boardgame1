import { describe, expect, it } from 'vitest';
import { HERO_LIST } from '../../data/heroes';
import { EN } from '../en';
import { VI } from '../vi';
import { fill } from '../index';
import { K } from '../types';
import type { Effect } from '../../engine/types';

/** Labels on every `pick: 'oneOf'` question buried in an effect tree. */
function walkEffects(effects: readonly Effect[], out: Record<string, string>): void {
  for (const effect of effects) {
    switch (effect.t) {
      case 'choose':
        if (effect.request.pick === 'oneOf') {
          for (const option of effect.request.options) {
            out[K.choiceOption(option.id)] = option.label;
          }
        }
        walkEffects(effect.effects, out);
        break;
      case 'when':
        walkEffects(effect.effects, out);
        walkEffects(effect.otherwise ?? [], out);
        break;
      case 'subRoll':
        for (const outcome of effect.outcomes) walkEffects(outcome.effects, out);
        walkEffects(effect.otherwise ?? [], out);
        walkEffects(effect.total ?? [], out);
        break;
      default:
        break;
    }
  }
}

/** Every translatable string the data carries, as key -> English. */
function dataKeys(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const hero of HERO_LIST) {
    out[K.hero(hero.id, 'name')] = hero.name;
    out[K.hero(hero.id, 'weapon')] = hero.weapon;
    out[K.hero(hero.id, 'bio')] = hero.bio;
    for (const face of hero.dieFaces) out[K.dieLabel(face.label)] = face.label;
    for (const ability of hero.abilities) {
      out[K.abilityName(hero.id, ability.id)] = ability.name;
      ability.text?.forEach((l, i) => (out[K.abilityText(hero.id, ability.id, i)] = l));
      ability.footer?.forEach((l, i) => (out[K.abilityFooter(hero.id, ability.id, i)] = l));
      ability.tiers.forEach((tier, t) => {
        if (tier.requirementLabel) out[K.comboLabel(tier.requirementLabel)] = tier.requirementLabel;
        tier.text.forEach((l, i) => (out[K.abilityTier(hero.id, ability.id, t, i)] = l));
        walkEffects(tier.effects, out);
      });
      for (const option of ability.passive?.options ?? []) {
        out[K.passiveOption(option.id)] = option.label;
        walkEffects(option.effects, out);
      }
      walkEffects(ability.passive?.upkeep ?? [], out);
    }
    for (const status of hero.statusEffects) {
      out[K.statusName(status.id)] = status.name;
      out[K.statusSummary(status.id)] = status.summary;
      out[K.statusText(status.id)] = status.text;
    }
    for (const card of hero.cards) {
      out[K.cardName(card.id)] = card.name;
      card.text.forEach((l, i) => (out[K.cardText(card.id, i)] = l));
    }
  }
  return out;
}

describe('translations', () => {
  const keys = dataKeys();

  it('covers every string the data carries', () => {
    const missing = Object.keys(keys).filter((k) => !(k in VI));
    expect(missing, `untranslated: ${missing.slice(0, 10).join(', ')}`).toHaveLength(0);
  });

  it('translates every interface string', () => {
    const missing = Object.keys(EN).filter((k) => !(k in VI));
    expect(missing, `untranslated UI: ${missing.join(', ')}`).toHaveLength(0);
  });

  it('carries no stale keys the data no longer has', () => {
    const known = new Set([...Object.keys(keys), ...Object.keys(EN)]);
    const stale = Object.keys(VI).filter((k) => !known.has(k));
    expect(stale, `stale: ${stale.slice(0, 10).join(', ')}`).toHaveLength(0);
  });

  it('keeps icon markup intact when translating', () => {
    const tokens = (s: string) => (s.match(/\[\[[a-z]+(?::[^\]]+)?\]\]/g) ?? []).sort();
    for (const [key, english] of Object.entries(keys)) {
      const viText = VI[key];
      if (!viText) continue;
      expect(tokens(viText), `${key} lost or gained icon markup`).toEqual(tokens(english));
    }
  });

  it('keeps every interface placeholder', () => {
    for (const [key, english] of Object.entries(EN)) {
      const slots = (english.match(/\{(\w+)\}/g) ?? []).sort();
      const viSlots = (VI[key]?.match(/\{(\w+)\}/g) ?? []).sort();
      expect(viSlots, `${key} placeholder mismatch`).toEqual(slots);
    }
  });

  it('fills placeholders', () => {
    expect(fill('{a} vs {b}', { a: 'One', b: 'Two' })).toBe('One vs Two');
    expect(fill('{missing}', {})).toBe('{missing}');
  });
});
