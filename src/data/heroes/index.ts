import type { Hero } from '../../engine/types';
import { BARBARIAN } from './season1/barbarian';
import { MONK } from './season1/monk';
import { MOON_ELF } from './season1/moonElf';
import { NINJA } from './season1/ninja';
import { PALADIN } from './season1/paladin';
import { PYROMANCER } from './season1/pyromancer';
import { SHADOW_THIEF } from './season1/shadowThief';
import { TREANT } from './season1/treant';

/** Every hero the game knows about, keyed by id. */
export const HEROES: Record<string, Hero> = {
  [BARBARIAN.id]: BARBARIAN,
  [MONK.id]: MONK,
  [MOON_ELF.id]: MOON_ELF,
  [NINJA.id]: NINJA,
  [PALADIN.id]: PALADIN,
  [PYROMANCER.id]: PYROMANCER,
  [SHADOW_THIEF.id]: SHADOW_THIEF,
  [TREANT.id]: TREANT,
};

export const HERO_LIST: Hero[] = Object.values(HEROES);

export function getHero(id: string): Hero {
  const hero = HEROES[id];
  if (!hero) throw new Error(`Unknown hero: ${id}`);
  return hero;
}
