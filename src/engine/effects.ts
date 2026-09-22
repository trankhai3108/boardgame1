import type {
  ChoiceSpec,
  Condition,
  DynamicAmount,
  Effect,
  Hero,
  Die,
  SubRollOutcome,
  Target,
} from './types';
import type { DamageType } from './damage';
import { symbolOf } from './dice';
import { rollDie } from './rng';
import {
  addStatus,
  drawCards,
  gainCp,
  limitFor,
  removeStatus,
  statusCount,
  teamOf,
  type GameState,
  type PlayerState,
} from './state';

/** What a player answered when the engine put a `ChoiceSpec` to them. */
export interface ChoiceAnswer {
  /** Index of the player picked, for `pick: 'player'`. */
  player?: number;
  /** Token picked, for `pick: 'status'`. */
  status?: { player: number; statusId: string };
  /** Die picked, for `pick: 'die'`. */
  dieId?: string;
  /** Pip value picked, for `pick: 'dieValue'`. */
  value?: number;
  /** Set when an optional choice was declined. */
  skipped?: boolean;
}

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
  /** The answer bound by the enclosing `choose` effect. */
  chosen?: ChoiceAnswer;
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

export function emptyOutcome(): EffectOutcome {
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

/* ------------------------------------------------------------------ */
/* Suspension                                                           */
/* ------------------------------------------------------------------ */

/**
 * What the engine is waiting on before the rest of an effect list can run.
 *
 * Sub-rolls and choices both stop resolution mid-list: the dice are rolled by
 * the player they belong to rather than by the engine, and a choice is theirs
 * to make. Whatever is left over travels in `rest` and runs on resumption.
 */
export type EffectRequest =
  | { kind: 'choice'; spec: ChoiceSpec }
  | {
      kind: 'roll';
      dice: number;
      outcomes: SubRollOutcome[];
      otherwise: Effect[];
      rerolls: number;
    };

export interface Suspension {
  request: EffectRequest;
  /** Effects still owed once the request is answered. */
  rest: Effect[];
  /**
   * How many of `rest` belong to the question rather than to what follows it.
   *
   * Declining an optional choice drops exactly those and keeps the remainder,
   * so "re-roll up to 2 dice" still offers the second die after the first is
   * waved away.
   */
  bodyLength: number;
}

export interface EffectRun {
  outcome: EffectOutcome;
  /** Set when resolution stopped to ask the player something. */
  suspend: Suspension | null;
}

/* ------------------------------------------------------------------ */
/* Amounts                                                              */
/* ------------------------------------------------------------------ */

/** Resolves `base + sum(perSymbol[s] * count of s among the dice)`. */
export function resolveAmount(
  amount: number | DynamicAmount,
  hero: Hero,
  dice: readonly Die[],
  holder?: PlayerState,
): number {
  if (typeof amount === 'number') return amount;
  let total = amount.base ?? 0;
  if (amount.perSymbol) {
    for (const die of dice) {
      const symbol = symbolOf(hero, die.value);
      total += amount.perSymbol[symbol] ?? 0;
    }
  }
  if (amount.perStatus && holder) {
    for (const [statusId, per] of Object.entries(amount.perStatus)) {
      total += per * statusCount(holder, statusId);
    }
  }
  if (amount.halve) total = Math.ceil(total / 2);
  return total;
}

/* ------------------------------------------------------------------ */
/* Targets                                                              */
/* ------------------------------------------------------------------ */

/** Resolves a target keyword to a player index. */
function indexFor(ctx: EffectContext, target: Target | undefined): number {
  switch (target) {
    case undefined:
    case 'self':
      return ctx.self;
    // "A chosen player" includes yourself, and for the effects that use it
    // (Retaliate's Retribution, Smoke Screen's Ninjutsu, Tend's Wellspring)
    // that is always the sensible choice, so the engine picks it.
    case 'chosenPlayer':
      return ctx.self;
    case 'chosen':
      return ctx.chosen?.player ?? ctx.chosen?.status?.player ?? ctx.self;
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

/**
 * Every die a card could act on: the main tray plus whatever sub-roll is
 * waiting to be confirmed, so "change any 1 die" reaches a defence roll too.
 */
export function diceOnTable(state: GameState): Die[] {
  const pending = state.pending[state.pending.length - 1] ?? null;
  return [...(state.roll?.dice ?? []), ...(pending?.rolled ? pending.dice : [])];
}

/** The die the enclosing `choose` picked, if it is still on the table. */
function chosenDie(ctx: EffectContext): Die | undefined {
  const id = ctx.chosen?.dieId;
  if (!id) return undefined;
  return diceOnTable(ctx.state).find((d) => d.id === id);
}

/* ------------------------------------------------------------------ */
/* The walker                                                           */
/* ------------------------------------------------------------------ */

/**
 * Walks an ability's effects, mutating the state for everything immediate and
 * accumulating whatever the damage pipeline has to see.
 *
 * Resolution stops at the first effect that needs a player — a sub-roll to be
 * thrown by hand, or a choice to be made — and reports it through `suspend`
 * along with whatever is left to run.
 */
export function runEffects(
  effects: readonly Effect[],
  ctx: EffectContext,
  out: EffectOutcome = emptyOutcome(),
): EffectRun {
  const self = ctx.state.players[ctx.self];

  for (let i = 0; i < effects.length; i++) {
    const effect = effects[i];
    const remaining = effects.slice(i + 1);

    switch (effect.t) {
      /* --- suspending effects ------------------------------------- */

      case 'choose':
        return {
          outcome: out,
          suspend: {
            request: { kind: 'choice', spec: effect.request },
            // The body runs first with the answer bound, then whatever follows.
            rest: [...effect.effects, ...remaining],
            bodyLength: effect.effects.length,
          },
        };

      case 'subRoll':
        return {
          outcome: out,
          suspend: {
            request: {
              kind: 'roll',
              dice: effect.dice,
              outcomes: effect.outcomes,
              otherwise: effect.otherwise ?? [],
              rerolls: effect.rerolls ?? 0,
            },
            rest: remaining,
            bodyLength: 0,
          },
        };

      case 'when': {
        const branch = holds(ctx, effect.cond) ? effect.effects : (effect.otherwise ?? []);
        // Run the branch in place so anything inside it can suspend too.
        return runEffects([...branch, ...remaining], ctx, out);
      }

      /* --- immediate effects -------------------------------------- */

      case 'damage': {
        const amount = resolveAmount(effect.amount, ctx.hero, ctx.usedDice, self);
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
        const amount = resolveAmount(effect.amount, ctx.hero, ctx.usedDice, self);
        const who = changeHealth(ctx, effect.target, amount);
        out.log.push(`${who.name} heals ${amount}`);
        break;
      }

      case 'gainCP': {
        const amount = resolveAmount(effect.amount, ctx.hero, ctx.usedDice, self);
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
        out.log.push(`${who.name} discards ${discarded.length}`);
        break;
      }

      case 'gainStatus': {
        const who = playerFor(ctx, effect.target);
        const amount = resolveAmount(effect.amount ?? 1, ctx.hero, ctx.usedDice, self);
        if (amount > 0) {
          addStatus(who, effect.status, amount, limitFor(ctx.state, who, ctx.hero, effect.status));
          out.log.push(`${who.name} gains ${amount} ${effect.status}`);
        }
        break;
      }

      case 'removeStatus': {
        const picked = ctx.chosen?.status;
        if (effect.status) {
          const who = playerFor(ctx, effect.target);
          removeStatus(who, effect.status, effect.amount ?? 1);
          out.log.push(`${who.name} loses ${effect.status}`);
        } else if (picked) {
          const who = ctx.state.players[picked.player];
          removeStatus(who, picked.statusId, effect.amount ?? 1);
          out.log.push(`${who.name} loses ${picked.statusId}`);
        } else {
          out.notes.push('Remove a status effect token of your choice.');
        }
        break;
      }

      case 'removeAllStatus': {
        const who = playerFor(ctx, effect.target);
        const had = Object.keys(who.statuses).length;
        who.statuses = {};
        out.log.push(`${who.name} loses every status token (${had})`);
        break;
      }

      case 'transferStatus': {
        const picked = ctx.chosen?.status;
        const to = indexFor(ctx, effect.to);
        if (picked && to !== picked.player) {
          const from = ctx.state.players[picked.player];
          const dest = ctx.state.players[to];
          removeStatus(from, picked.statusId, effect.amount);
          addStatus(
            dest,
            picked.statusId,
            effect.amount,
            limitFor(ctx.state, dest, ctx.hero, picked.statusId),
          );
          out.log.push(`${picked.statusId} moves from ${from.name} to ${dest.name}`);
        } else {
          out.notes.push('Transfer a status effect token between chosen players.');
        }
        break;
      }

      case 'setHealth': {
        teamOf(ctx.state, indexFor(ctx, effect.target)).health = effect.amount;
        break;
      }

      case 'prevent':
        out.prevention += resolveAmount(effect.amount, ctx.hero, ctx.usedDice, self);
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

      /* --- the dice on the table ---------------------------------- */

      case 'setDie': {
        const die = chosenDie(ctx);
        if (!die) break;
        const before = die.value;
        if (effect.value !== undefined) die.value = effect.value;
        else if (ctx.chosen?.value !== undefined && effect.fromChoice) die.value = ctx.chosen.value;
        else if (effect.delta !== undefined) {
          die.value = Math.max(1, Math.min(6, die.value + effect.delta));
        }
        out.log.push(`a die changes from ${before} to ${die.value}`);
        break;
      }

      case 'rerollDie': {
        const die = chosenDie(ctx);
        if (!die) break;
        const before = die.value;
        die.value = rollDie(ctx.state.rng);
        out.log.push(`a die is re-rolled: ${before} -> ${die.value}`);
        break;
      }

      case 'extraRollAttempt': {
        const who = indexFor(ctx, effect.target);
        const roll = ctx.state.roll;
        const pending = ctx.state.pending[ctx.state.pending.length - 1] ?? null;
        if (roll && roll.playerIndex === who && roll.kind === effect.phase) {
          roll.maxAttempts += 1;
          out.log.push(`${ctx.state.players[who].name} gains an extra Roll Attempt`);
        } else if (
          effect.phase === 'defensive' &&
          pending &&
          pending.who === who &&
          pending.request.kind === 'roll'
        ) {
          // A defence roll lives in the pending step, so its extra attempt is
          // one more re-roll of the dice already in front of the defender.
          pending.rerolls += 1;
          out.log.push(`${ctx.state.players[who].name} gains an extra defence re-roll`);
        } else {
          ctx.state.players[who].extraAttempts[effect.phase] += 1;
          out.log.push(`${ctx.state.players[who].name} is owed an extra Roll Attempt`);
        }
        break;
      }

      /* --- the attack on the table -------------------------------- */

      case 'preventDamage': {
        const amount = resolveAmount(effect.amount, ctx.hero, ctx.usedDice, self);
        out.prevention += amount;
        break;
      }

      case 'attackBonus': {
        const amount = resolveAmount(effect.amount, ctx.hero, ctx.usedDice, self);
        out.damage += amount;
        break;
      }

      case 'statusOnDefender': {
        const attack = ctx.state.attack;
        const index = attack ? attack.defender : ctx.target;
        const who = ctx.state.players[index];
        const amount = effect.amount ?? 1;
        addStatus(who, effect.status, amount, limitFor(ctx.state, who, ctx.hero, effect.status));
        out.log.push(`${who.name} gains ${amount} ${effect.status}`);
        break;
      }

      /* --- Treant's spirit ladder ---------------------------------- */

      case 'growSpirit': {
        const steps = resolveAmount(effect.amount, ctx.hero, ctx.usedDice, self);
        for (let n = 0; n < steps; n++) growOnce(ctx, self, out);
        break;
      }

      case 'harvestSpirits': {
        let removed = 0;
        // Spent from the top of the ladder down, which is what the CP is for.
        for (const tier of ['dryad', 'sapling', 'seedling'] as const) {
          while (removed < effect.max && statusCount(self, tier) > 0) {
            removeStatus(self, tier, 1);
            removed += 1;
          }
        }
        if (removed > 0) {
          gainCp(self, removed);
          out.log.push(`${self.name} harvests ${removed} spirits for ${removed} CP`);
        }
        break;
      }

      /* --- misc ---------------------------------------------------- */

      case 'stackLimitBonus': {
        const current = self.stackLimits[effect.status] ?? limitFor(ctx.state, self, ctx.hero, effect.status);
        self.stackLimits[effect.status] = current + effect.amount;
        out.log.push(`${effect.status} stack limit rises to ${self.stackLimits[effect.status]}`);
        break;
      }

      case 'spendCpForStatus': {
        // Spending "any amount" is a judgement call; the engine converts every
        // CP the player has left, which is what the card is for.
        const spend = self.cp;
        if (spend > 0) {
          gainCp(self, -spend);
          addStatus(
            self,
            effect.status,
            spend,
            limitFor(ctx.state, self, ctx.hero, effect.status),
          );
          out.log.push(`${self.name} spends ${spend} CP for ${spend} ${effect.status}`);
        }
        break;
      }

      case 'manual':
        out.notes.push(effect.note);
        break;
    }
  }

  return { outcome: out, suspend: null };
}

/**
 * Back-compatible wrapper for callers that cannot suspend.
 *
 * Anything the walker wanted to ask is recorded as a note instead, so a caller
 * that has no way to prompt still gets a sane result.
 */
export function resolveEffects(
  effects: readonly Effect[],
  ctx: EffectContext,
  out: EffectOutcome = emptyOutcome(),
): EffectOutcome {
  const run = runEffects(effects, ctx, out);
  if (run.suspend) run.outcome.notes.push('Waiting on a player decision.');
  return run.outcome;
}

/** Expands a finished sub-roll into the effects its faces call for. */
export function subRollEffects(
  hero: Hero,
  dice: readonly Die[],
  outcomes: readonly SubRollOutcome[],
  otherwise: readonly Effect[],
): Effect[] {
  const out: Effect[] = [];

  // Outcomes with `atLeast` fire once for the whole roll, not once per die.
  for (const outcome of outcomes) {
    if (!outcome.atLeast) continue;
    const hits = dice.filter((d) => matches(hero, d, outcome.on)).length;
    if (hits >= outcome.atLeast) out.push(...outcome.effects);
  }

  for (const die of dice) {
    let matched = false;
    for (const outcome of outcomes) {
      if (outcome.atLeast) continue;
      if (!matches(hero, die, outcome.on)) continue;
      matched = true;
      out.push(...outcome.effects);
    }
    if (!matched && otherwise.length > 0) out.push(...otherwise);
  }

  return out;
}

/**
 * One Grow step on the Treant's ladder.
 *
 * The rules let the player choose which spirit to grow; the engine promotes the
 * most advanced one it can — sapling to dryad before seedling to sapling —
 * and plants a new seedling only when nothing can be promoted, which is the
 * line that gets the most out of a Grow.
 */
function growOnce(ctx: EffectContext, self: PlayerState, out: EffectOutcome): void {
  const limit = (id: string) => limitFor(ctx.state, self, ctx.hero, id);

  if (statusCount(self, 'sapling') > 0 && statusCount(self, 'dryad') < limit('dryad')) {
    removeStatus(self, 'sapling', 1);
    addStatus(self, 'dryad', 1, limit('dryad'));
    out.log.push(`${self.name} grows a Sapling into a Dryad`);
    return;
  }
  if (statusCount(self, 'seedling') > 0 && statusCount(self, 'sapling') < limit('sapling')) {
    removeStatus(self, 'seedling', 1);
    addStatus(self, 'sapling', 1, limit('sapling'));
    out.log.push(`${self.name} grows a Seedling into a Sapling`);
    return;
  }
  if (statusCount(self, 'seedling') < limit('seedling')) {
    addStatus(self, 'seedling', 1, limit('seedling'));
    out.log.push(`${self.name} plants a Seedling`);
  }
}

/** Evaluates a `when` condition against the table as it stands. */
function holds(ctx: EffectContext, cond: Condition): boolean {
  const self = ctx.state.players[ctx.self];
  if ('has' in cond) return statusCount(self, cond.has) >= (cond.min ?? 1);
  return (ctx.state.attack?.incoming ?? 0) >= cond.attackAtLeast;
}

function matches(hero: Hero, die: Die, on: string | number): boolean {
  return typeof on === 'number' ? on === die.value : on === symbolOf(hero, die.value);
}
