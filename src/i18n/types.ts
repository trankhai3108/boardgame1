/** Languages the app ships with. */
export type Lang = 'en' | 'vi';

export const LANGS: { id: Lang; label: string; flag: string }[] = [
  { id: 'en', label: 'English', flag: 'EN' },
  { id: 'vi', label: 'Tiếng Việt', flag: 'VI' },
];

/**
 * A flat key -> string map.
 *
 * English is the source language: hero, ability, card and status text already
 * live in the data files in English, so `en` only needs UI strings and every
 * lookup falls back to the value carried by the data. A `vi` entry overrides
 * that fallback.
 */
export type Dict = Record<string, string>;

/* ------------------------------------------------------------------ */
/* Key builders — used by both the translator and the coverage report  */
/* ------------------------------------------------------------------ */

export const K = {
  hero: (heroId: string, field: 'name' | 'bio' | 'weapon') => `hero.${heroId}.${field}`,
  abilityName: (heroId: string, abilityId: string) => `ability.${heroId}.${abilityId}.name`,
  /** Passive ability body text. */
  abilityText: (heroId: string, abilityId: string, i: number) =>
    `ability.${heroId}.${abilityId}.text.${i}`,
  abilityTier: (heroId: string, abilityId: string, tier: number, i: number) =>
    `ability.${heroId}.${abilityId}.tier.${tier}.${i}`,
  abilityFooter: (heroId: string, abilityId: string, i: number) =>
    `ability.${heroId}.${abilityId}.footer.${i}`,
  comboLabel: (label: string) => `combo.${label}`,
  cardName: (cardId: string) => `card.${cardId}.name`,
  cardText: (cardId: string, i: number) => `card.${cardId}.text.${i}`,
  statusName: (statusId: string) => `status.${statusId}.name`,
  statusSummary: (statusId: string) => `status.${statusId}.summary`,
  statusText: (statusId: string) => `status.${statusId}.text`,
  dieLabel: (label: string) => `die.${label}`,
  passiveOption: (optionId: string) => `passive.${optionId}`,
} as const;
