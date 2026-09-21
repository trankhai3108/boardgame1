import type { Ability, DiceRequirement, Die, Hero } from './types';
import { largestOfAKind, longestStraight, symbolOf, valueCounts } from './dice';

/** One way the current dice can activate an ability. */
export interface ComboMatch {
  ability: Ability;
  /** Which tier of the ability the dice satisfy. */
  tierIndex: number;
  /** The dice that satisfy the requirement (not the whole hand). */
  usedDice: Die[];
}

/**
 * Returns the dice that satisfy `req`, or null if it is not satisfied.
 *
 * Defensive requirements are never matched here — the defender simply rolls
 * the stated number of dice, so `defenseRoll` always returns null.
 */
export function matchRequirement(
  hero: Hero,
  dice: readonly Die[],
  req: DiceRequirement,
): Die[] | null {
  switch (req.kind) {
    case 'symbols': {
      const used: Die[] = [];
      const remaining = new Map(Object.entries(req.symbols));
      for (const die of dice) {
        const symbol = symbolOf(hero, die.value);
        const need = remaining.get(symbol) ?? 0;
        if (need > 0) {
          remaining.set(symbol, need - 1);
          used.push(die);
        }
      }
      for (const need of remaining.values()) if (need > 0) return null;
      return used;
    }

    case 'straight': {
      if (longestStraight(dice) < req.length) return null;
      // Find the run's starting value, then take one die per value in it.
      const present = new Set(dice.map((d) => d.value));
      let start = 0;
      let run = 0;
      for (let v = 1; v <= 6; v++) {
        run = present.has(v) ? run + 1 : 0;
        if (run >= req.length) {
          start = v - req.length + 1;
          break;
        }
      }
      const used: Die[] = [];
      for (let v = start; v < start + req.length; v++) {
        const die = dice.find((d) => d.value === v && !used.includes(d));
        if (die) used.push(die);
      }
      return used;
    }

    case 'ofAKind': {
      if (largestOfAKind(dice) < req.count) return null;
      const counts = valueCounts(dice);
      const value = counts.findIndex((n) => n >= req.count);
      return dice.filter((d) => d.value === value).slice(0, req.count);
    }

    case 'defenseRoll':
      return null;
  }
}

/**
 * Every offensive ability the current dice can activate, including each
 * satisfied tier of a multi-tier ability.
 */
export function availableAbilities(hero: Hero, dice: readonly Die[]): ComboMatch[] {
  const out: ComboMatch[] = [];
  for (const ability of hero.abilities) {
    if (ability.kind !== 'offensive') continue;
    ability.tiers.forEach((tier, tierIndex) => {
      const usedDice = matchRequirement(hero, dice, tier.requirement);
      if (usedDice) out.push({ ability, tierIndex, usedDice });
    });
  }
  return out;
}

/**
 * The strongest tier of each activatable ability — later tiers on a hero board
 * are always the stronger ones (Smack 3/4/5 swords, Holy Attack small/large
 * straight), so the last satisfied tier wins.
 */
export function bestAbilities(hero: Hero, dice: readonly Die[]): ComboMatch[] {
  const best = new Map<string, ComboMatch>();
  for (const match of availableAbilities(hero, dice)) {
    best.set(match.ability.id, match);
  }
  return [...best.values()];
}
