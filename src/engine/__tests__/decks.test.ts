import { describe, expect, it } from 'vitest';
import { HERO_LIST } from '../../data/heroes';
import { COMMON_CARDS } from '../../data/cards/common';

describe('hero decks', () => {
  it.each(HERO_LIST.map((h) => [h.name, h] as const))('%s has 33 cards', (_name, hero) => {
    const total = hero.cards.reduce((n, card) => n + card.copies, 0);
    expect(total).toBe(33);
  });

  it.each(HERO_LIST.map((h) => [h.name, h] as const))(
    '%s upgrade cards target a real ability',
    (_name, hero) => {
      const abilityIds = new Set(hero.abilities.map((a) => a.id));
      for (const card of hero.cards) {
        if (card.type !== 'upgrade') continue;
        expect(card.upgrades, `${card.name} has no target`).toBeDefined();
        expect(abilityIds, `${card.name} -> ${card.upgrades}`).toContain(card.upgrades);
        expect(['II', 'III']).toContain(card.upgradeLevel);
      }
    },
  );

  it.each(HERO_LIST.map((h) => [h.name, h] as const))('%s has unique card ids', (_name, hero) => {
    const ids = hero.cards.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(HERO_LIST.map((h) => [h.name, h] as const))('%s cards all carry text', (_name, hero) => {
    for (const card of hero.cards) {
      expect(card.text.length, `${card.name} has no text`).toBeGreaterThan(0);
      expect(card.text.join('').trim()).not.toBe('');
      expect(card.cp).toBeGreaterThanOrEqual(0);
    }
  });

  it('shares one common action set across every hero', () => {
    expect(COMMON_CARDS).toHaveLength(18);
    for (const hero of HERO_LIST) {
      const commons = hero.cards.filter((c) => c.id.startsWith('common-'));
      expect(commons).toHaveLength(18);
    }
  });

  it('never ships a III upgrade without its II', () => {
    for (const hero of HERO_LIST) {
      const threes = hero.cards.filter((c) => c.upgradeLevel === 'III');
      for (const three of threes) {
        const two = hero.cards.find(
          (c) => c.upgrades === three.upgrades && c.upgradeLevel === 'II',
        );
        expect(two, `${hero.name}: ${three.name} has no level II`).toBeDefined();
        expect(three.cp).toBeGreaterThanOrEqual(two!.cp);
      }
    }
  });
});
