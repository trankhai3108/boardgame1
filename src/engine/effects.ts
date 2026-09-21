import type { DynamicAmount, Effect, Hero, Die, Target } from './types';
import type { DamageType } from './damage';
import { makeDice, symbolOf } from './dice';
import {
  addStatus,
  drawCards,
  gainCp,
  removeStatus,
  teamOf,
  type GameState,
  type PlayerState,
} from './state';

export interface EffectContext {
  state: GameState;
  /** Index of the player resolving the effects. */
  self: number;
  /** Index of the player being targeted (the opponent, or the attacker when defending). */
  target: number;
  hero: Hero;
  /** The dice that activated the ability, for "N x symbol" amounts. */
  usedDice: readonly Die[];
  /** True when resolving a Defensive Ability. */
  defensive?: boolean;
}

/** Everything an ability contributed that the damage pipeline needs. */
export interface EffectOutcome {
  /** Damage this ability deals to its target. */
  damage: number;
  damageType: DamageType;
  /** Set by an `undefendable` flag or effect. */
  undefendable: boolean;
  /** Damage dealt back to the attacker by a Defensive Ability. */
  damageToAttacker: number;
  /** Flat prevention contributed by a Defensive Ability. */
  prevention: number;
  /** Fractional prevention (divisors) contributed by a Defensive Ability. */
  preventionDivisors: number[];
  /** Effects held back by a "then" clause; resolved after damage. */
  notes: string[];
  log: string[];
}

function emptyOutcome(): EffectOutcome {
  return {
    damage: 0,
    damageType: 'normal',
    undefendable: false,
    damageToAttacker: 0,
    prevention: 0,
    preventionDivisors: [],
    notes: [],
    log: [],
  };
}

/** Resolves `base + sum(perSymbol[s] * count of s among the dice)`. */
export function resolveAmount(
  amount: number | DynamicAmount,
  hero: Hero,
  dice: readonly Die[],
): number {
  if (typeof amount === 'number') return amount;
  let total = amount.base ?? 0;
  if (amount.perSymbol) {
    for (const die of dice) {
      const symbol = symbolOf(hero, die.value);
      total += amount.perSymbol[symbol] ?? 0;
    }
  }
  return total;
}

/** Resolves a target keyword to a player index. */
function indexFor(ctx: EffectContext, target: Target | undefined): number {
  switch (target) {
    case undefined:
    case 'self':
      return ctx.self;
    // "A chosen player" includes yourself, and for the effects that use it
    // (Retaliate's Retribution, Smoke Screen's Ninjutsu, Tend's Wellspring)
    // that is always the sensible choice, so the engine picks it. A real
    // choice UI would let the active player pick anyone.
    case 'chosenPlayer':
      return ctx.self;
    case 'opponent':
    case 'allOpponents':
    case 'attacker':
      return ctx.target;
  }
}

function playerFor(ctx: EffectContext, target: Target | undefined): PlayerState {
  return ctx.state.players[indexFor(ctx, target)];
}

/** Health is shared per team, so healing and direct damage go to the dial. */
function changeHealth(ctx: EffectContext, target: Target | undefined, delta: number): PlayerState {
  const index = indexFor(ctx, target);
  const team = teamOf(ctx.state, index);
  team.health = Math.min(team.maxHealth, team.health + delta);
  return ctx.state.players[index];
}

/** Status stack limit as printed on the hero leaflet, defaulting to 1. */
function stackLimit(hero: Hero, statusId: string): number {
  return hero.statusEffects.find((s) => s.id === statusId)?.stackLimit ?? 1;
}

/**
 * Walks an ability's effects, mutating the state for everything immediate and
 * accumulating whatever the damage pipeline has to see.
 */
export function resolveEffects(
  effects: readonly Effect[],
  ctx: EffectContext,
  out: EffectOutcome = emptyOutcome(),
): EffectOutcome {
  const self = ctx.state.players[ctx.self];

  for (const effect of effects) {
    switch (effect.t) {
      case 'damage': {
        const amount = resolveAmount(effect.amount, ctx.hero, ctx.usedDice);
        if (effect.undefendable) out.undefendable = true;
        if (effect.target === 'self') {
          // Reckless-style recoil: applied directly, not through the pipeline.
          changeHealth(ctx, 'self', -amount);
          out.log.push(`${self.name} takes ${amount} recoil dmg`);
        } else if (effect.target === 'attacker' || (ctx.defensive && !effect.target)) {
          out.damageToAttacker += amount;
        } else if (effect.target === 'allOpponents') {
          // Collateral: dealt immediately, outside the attack being resolved.
          // Each opposing team takes it once per member, as the rules require.
          for (const team of ctx.state.teams) {
            if (team === teamOf(ctx.state, ctx.self)) continue;
            const hits = team.members.length * amount;
            team.health -= hits;
            out.log.push(`${team.name} takes ${hits} collateral dmg`);
          }
        } else {
          out.damage += amount;
        }
        break;
      }

      case 'heal': {
        const amount = resolveAmount(effect.amount, ctx.hero, ctx.usedDice);
        const who = changeHealth(ctx, effect.target, amount);
        out.log.push(`${who.name} heals ${amount}`);
        break;
      }

      case 'gainCP': {
        const amount = resolveAmount(effect.amount, ctx.hero, ctx.usedDice);
        const who = playerFor(ctx, effect.target);
        gainCp(who, amount);
        out.log.push(
          amount >= 0 ? `${who.name} gains ${amount} CP` : `${who.name} loses ${-amount} CP`,
        );
        break;
      }

      case 'drawCard': {
        const who = playerFor(ctx, effect.target);
        const drawn = drawCards(ctx.state, who, effect.amount);
        out.log.push(`${who.name} draws ${drawn.length}`);
        break;
      }

      case 'discardCard': {
        const who = playerFor(ctx, effect.target);
        const discarded = who.hand.splice(0, effect.amount);
        who.discard.push(...discarded);
        break;
      }

      case 'gainStatus': {
        const who = playerFor(ctx, effect.target);
        const amount = effect.amount ?? 1;
        addStatus(who, effect.status, amount, stackLimit(ctx.hero, effect.status));
        out.log.push(`${who.name} gains ${amount} ${effect.status}`);
        break;
      }

      case 'removeStatus': {
        const who = playerFor(ctx, effect.target);
        if (effect.status) removeStatus(who, effect.status, effect.amount ?? 1);
        else out.notes.push('Remove a status effect token of your choice.');
        break;
      }

      case 'transferStatus':
        out.notes.push('Transfer a status effect token between chosen players.');
        break;

      case 'setHealth': {
        teamOf(ctx.state, indexFor(ctx, effect.target)).health = effect.amount;
        break;
      }

      case 'prevent':
        out.prevention += resolveAmount(effect.amount, ctx.hero, ctx.usedDice);
        break;

      case 'preventFraction':
        out.preventionDivisors.push(effect.divisor);
        break;

      case 'undefendable':
        out.undefendable = true;
        break;

      case 'reroll':
        out.notes.push(`You may re-roll ${effect.dice} dice.`);
        break;

      case 'subRoll': {
        // Roll the extra dice, then apply each matching outcome once per die.
        const rolled = makeDice(effect.dice, ctx.state.rng);
        const shown = rolled.map((d) => symbolOf(ctx.hero, d.value));
        out.log.push(`sub-roll: ${shown.join(', ')}`);
        for (const die of rolled) {
          const symbol = symbolOf(ctx.hero, die.value);
          for (const outcome of effect.outcomes) {
            const hit = typeof outcome.on === 'number' ? outcome.on === die.value : outcome.on === symbol;
            if (hit) {
              resolveEffects(outcome.effects, { ...ctx, usedDice: [die] }, out);
            }
          }
        }
        break;
      }

      case 'manual':
        out.notes.push(effect.note);
        break;
    }
  }

  return out;
}
