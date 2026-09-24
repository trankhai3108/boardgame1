import type { Ability, Card, Effect, Hero, PassiveOption } from './types';
import type { Action } from './actions';
import { resolveDamage, type DamageModifier, type DamageType } from './damage';
import { makeDice, rerollUnkept } from './dice';
import { bestAbilities, levelOf, matchRequirement, passiveAt, tiersAt } from './combos';
import {
  diceOnTable,
  emptyOutcome,
  runEffects,
  subRollEffects,
  type ChoiceAnswer,
  type EffectContext,
  type EffectOutcome,
} from './effects';
import { behaviourOf } from './statusBehaviour';
import { rollDie } from './rng';
import {
  RULES,
  drawCards,
  gainCp,
  healthOf,
  isAlive,
  opponentOf,
  opponentsOf,
  removeStatus,
  statusCount,
  teamOf,
  topPending,
  type GameState,
  type PendingActivation,
  type PendingAttack,
  type PendingCtx,
  type PendingSink,
  type PendingStep,
  type PlayerState,
} from './state';
import { dealDamage } from './health';
import { needsTargetingRoll, resolveTargetRoll } from './targeting';

/** Heroes are looked up by id, so the reducer stays free of the data layer. */
export type HeroLookup = (heroId: string) => Hero;

function log(state: GameState, message: string, player?: PlayerState): void {
  state.log.push({ round: state.round, phase: state.phase, player: player?.name, message });
}

function heroOf(lookup: HeroLookup, player: PlayerState): Hero {
  return lookup(player.heroId);
}

function cardOf(hero: Hero, instanceId: string): Card | undefined {
  const baseId = instanceId.split('#')[0];
  return hero.cards.find((c) => c.id === baseId);
}

/* ------------------------------------------------------------------ */
/* Phase entry                                                          */
/* ------------------------------------------------------------------ */

/** Upkeep: burn, poison, Fire Mastery cool-off and the like. */
function runUpkeep(state: GameState, lookup: HeroLookup): void {
  const player = state.players[state.active];
  let damage = 0;

  for (const [statusId, count] of Object.entries(player.statuses)) {
    const upkeep = behaviourOf(statusId).upkeep;
    if (!upkeep) continue;
    if (upkeep.damagePerToken) {
      damage += upkeep.damagePerToken * count;
      log(state, `${statusId}: ${upkeep.damagePerToken * count} dmg in Upkeep`, player);
    }
    if (upkeep.removeTokens) removeStatus(player, statusId, upkeep.removeTokens);
  }

  runUpkeepPassives(state, lookup);

  // Upkeep damage accumulates and is applied simultaneously at the end of the
  // phase — after the passives, and only once the holder has had their say.
  if (damage > 0) openDamageWindow(state, state.active, damage, 'Upkeep');
  void lookup;
}

/** Passive abilities that do something every Upkeep Phase, e.g. Fertilize. */
function runUpkeepPassives(state: GameState, lookup: HeroLookup): void {
  const index = state.active;
  const player = state.players[index];
  const hero = heroOf(lookup, player);

  for (const ability of hero.abilities) {
    const effects = passiveAt(ability, levelOf(ability, player.abilityLevels))?.upkeep;
    if (!effects?.length) continue;
    startRun(
      state,
      lookup,
      effects,
      {
        self: index,
        target: opponentOf(state, index),
        heroId: hero.id,
        usedDice: [],
        defensive: false,
        chosen: null,
      },
      { kind: 'passive', abilityId: ability.id, optionId: 'upkeep', playerIndex: index },
      ability.name,
    );
  }
}

/** Spends the CP a passive option costs and runs it. */
function activatePassive(
  state: GameState,
  lookup: HeroLookup,
  playerIndex: number,
  abilityId: string,
  optionId: string,
): void {
  const player = state.players[playerIndex];
  const hero = heroOf(lookup, player);
  const ability = findAbility(hero, abilityId);
  const spec = passiveAt(ability, levelOf(ability, state.players[playerIndex].abilityLevels));
  const option = spec?.options?.find((o) => o.id === optionId);
  if (!option) throw new Error(`${ability.name} has no option "${optionId}"`);
  if (option.window === 'roll' && !state.roll) throw new Error('No dice on the table');
  if (player.cp < option.cp) throw new Error(`Not enough CP for ${option.label}`);

  gainCp(player, -option.cp);
  log(state, `pays ${option.cp} CP for ${ability.name}: ${option.label}`, player);

  startRun(
    state,
    lookup,
    option.effects,
    {
      self: playerIndex,
      target: opponentOf(state, playerIndex),
      heroId: hero.id,
      usedDice: [],
      defensive: false,
      chosen: null,
    },
    { kind: 'passive', abilityId, optionId, playerIndex },
    ability.name,
  );
}

/** Passive options the given seat could pay for right now. */
export function passiveOptionsFor(
  state: GameState,
  lookup: HeroLookup,
  playerIndex: number,
): { abilityId: string; option: PassiveOption }[] {
  const player = state.players[playerIndex];
  if (!player) return [];
  const hero = heroOf(lookup, player);
  const out: { abilityId: string; option: PassiveOption }[] = [];
  for (const ability of hero.abilities) {
    const spec = passiveAt(ability, levelOf(ability, player.abilityLevels));
    for (const option of spec?.options ?? []) {
      if (option.cp > player.cp) continue;
      if (option.window === 'roll' && !state.roll) continue;
      out.push({ abilityId: ability.id, option });
    }
  }
  return out;
}

function runIncome(state: GameState): void {
  const player = state.players[state.active];

  if (statusCount(player, 'concussion') > 0) {
    removeStatus(player, 'concussion', 1);
    log(state, 'Concussion: Income Phase skipped', player);
    return;
  }

  gainCp(player, RULES.incomeCp);
  drawCards(state, player, RULES.incomeDraw);
  log(state, `gains ${RULES.incomeCp} CP and draws ${RULES.incomeDraw}`, player);
}

/** Starts the Offensive Roll Phase, honouring Knockdown and Entangle. */
function startOffensiveRoll(state: GameState, lookup: HeroLookup): void {
  const player = state.players[state.active];

  const knockdown = behaviourOf('knockdown').skipOrpUnlessPaid;
  if (knockdown !== undefined && statusCount(player, 'knockdown') > 0 && player.cp < knockdown) {
    removeStatus(player, 'knockdown', 1);
    log(state, `Knockdown: cannot pay ${knockdown} CP, Offensive Roll Phase skipped`, player);
    state.phase = 'main2';
    return;
  }

  let attempts = RULES.rollAttempts;
  if (statusCount(player, 'entangle') > 0) {
    attempts -= behaviourOf('entangle').rollAttemptPenalty ?? 0;
    log(state, 'Entangle: 1 fewer Roll Attempt', player);
  }
  // Roll Attempts a card promised before the phase opened.
  attempts += player.extraAttempts.offensive;
  player.extraAttempts.offensive = 0;

  state.roll = {
    kind: 'offensive',
    playerIndex: state.active,
    dice: makeDice(RULES.diceCount, state.rng),
    attemptsUsed: 1,
    maxAttempts: Math.max(1, attempts),
  };
  applyBarbedVine(state, lookup, player, 1);
  log(state, `rolls ${describeDice(state, lookup, player)}`, player);
}

function describeDice(state: GameState, lookup: HeroLookup, player: PlayerState): string {
  if (!state.roll) return '';
  const hero = heroOf(lookup, player);
  return state.roll.dice
    .map((d) => `${hero.dieFaces[d.value - 1].symbol}(${d.value})`)
    .join(' ');
}

/** Barbed Vine hurts for every Roll Attempt past the first, capped per turn. */
function applyBarbedVine(
  state: GameState,
  lookup: HeroLookup,
  player: PlayerState,
  attemptNumber: number,
): void {
  if (attemptNumber <= 1) return;
  const rule = behaviourOf('barbed-vine').damagePerExtraRollAttempt;
  if (!rule || statusCount(player, 'barbed-vine') === 0) return;

  const room = rule.maxPerTurn - player.barbedVineDamageThisTurn;
  const amount = Math.min(rule.amount, Math.max(0, room));
  if (amount === 0) return;

  player.barbedVineDamageThisTurn += amount;
  log(state, `Barbed Vine: ${amount} dmg for an extra Roll Attempt`, player);
  openDamageWindow(state, state.players.indexOf(player), amount, 'Barbed Vine');
  void lookup;
}

/* ------------------------------------------------------------------ */
/* Damage application                                                   */
/* ------------------------------------------------------------------ */

/**
 * Pauses for the target to answer damage that came from outside an Attack.
 *
 * Typeless damage is avoidable, so Burn, Poison and a Defensive Ability's
 * return damage all have to stop and give their target the same chance to
 * spend a token or play an Instant that an attack does. It is not an attack
 * and never ends a Roll Phase, so it rides on `state.attack` with `window`
 * set rather than moving anybody into a Defensive Roll Phase.
 */
function openDamageWindow(
  state: GameState,
  target: number,
  amount: number,
  source: string,
  from = target,
): void {
  if (amount <= 0 || state.phase === 'gameOver') return;

  // A window already open takes the new damage with it, so two Burn-like
  // sources in one phase are one decision rather than two.
  if (state.attack?.window && state.attack.defender === target) {
    state.attack.incoming += amount;
    return;
  }

  state.attack = {
    attacker: from,
    defender: target,
    abilityId: '',
    abilityName: source,
    incoming: amount,
    type: 'typeless',
    modifiers: [],
    afterDamage: [],
    // There is no Defensive Ability against it, so there is nothing to roll.
    defenseResolved: true,
    window: true,
  };
}

/**
 * Notes damage the attacker has earned back, to be dealt once this attack is
 * out of the way.
 *
 * Every source of it — a Defensive Ability, a card played in defence,
 * Retribution — is damage from outside the attack, so they all leave by the
 * same door: typeless, and into a window the attacker may answer.
 */
function sendDamageBack(attack: PendingAttack, amount: number, source: string): void {
  if (amount <= 0) return;
  attack.damageBack = {
    amount: (attack.damageBack?.amount ?? 0) + amount,
    source: attack.damageBack?.source ?? source,
  };
}

/**
 * Reduces the target's Health Dial — which their whole team shares — honouring
 * Blessing of Divinity, and ends the game if only one team is left standing.
 */
function applyDamage(state: GameState, lookup: HeroLookup, index: number, amount: number): void {
  dealDamage(state, index, amount, state.attack?.type ?? 'normal');
  void lookup;
}

/* ------------------------------------------------------------------ */
/* The suspend / resume machinery                                       */
/* ------------------------------------------------------------------ */

function contextFrom(state: GameState, lookup: HeroLookup, ctx: PendingCtx): EffectContext {
  return {
    state,
    self: ctx.self,
    target: ctx.target,
    hero: lookup(ctx.heroId),
    usedDice: ctx.usedDice,
    defensive: ctx.defensive,
    chosen: ctx.chosen ?? undefined,
  };
}

/**
 * Runs an effect list, parking it on the pending stack if it stops to ask the
 * player something. Nothing is logged until the list finishes, so a suspended
 * run reads as one event rather than two.
 */
function startRun(
  state: GameState,
  lookup: HeroLookup,
  effects: readonly Effect[],
  ctx: PendingCtx,
  sink: PendingSink,
  source: string,
  carried: EffectOutcome = emptyOutcome(),
): void {
  const run = runEffects(effects, contextFrom(state, lookup, ctx), carried);

  if (run.suspend) {
    const { request, rest, bodyLength } = run.suspend;
    state.pending.push({
      who: ctx.self,
      source,
      request,
      dice: [],
      rolled: false,
      rerolls: request.kind === 'roll' ? request.rerolls : 0,
      rest,
      bodyLength,
      outcome: run.outcome,
      ctx,
      sink,
    });

    // A question with no answers would leave the table with nothing legal to
    // do — Bye Bye! played when the board is clean, say. Drop what it would
    // have driven and carry on rather than deadlocking.
    if (request.kind === 'choice' && choiceOptions(state, lookup).length === 0) {
      state.pending.pop();
      log(state, `${source}: nothing to choose`, state.players[ctx.self]);
      startRun(state, lookup, rest.slice(bodyLength), ctx, sink, source, run.outcome);
    }
    return;
  }

  finishRun(state, lookup, run.outcome, ctx, sink, source);
}

/** Continues the step on top of the pending stack once the player has acted. */
function resumePending(state: GameState, lookup: HeroLookup, answer: ChoiceAnswer | null): void {
  const step = state.pending.pop();
  if (!step) throw new Error('Nothing is pending');

  const ctx: PendingCtx = { ...step.ctx, chosen: answer ?? step.ctx.chosen };
  let effects: readonly Effect[] = step.rest;

  if (step.request.kind === 'roll') {
    const hero = lookup(ctx.heroId);
    const shown = step.dice
      .map((d) => `${hero.dieFaces[d.value - 1].symbol}(${d.value})`)
      .join(' ');
    log(state, `${step.source} roll: ${shown}`, state.players[step.who]);

    if (step.sink.kind === 'status') {
      finishStatusRoll(state, lookup, step);
      return;
    }

    // "N x symbol" amounts and `rollAtLeast` read from the dice just thrown,
    // so the context is switched before the faces are expanded.
    ctx.usedDice = step.dice;
    const rolled = subRollEffects(
      hero,
      step.dice,
      step.request.outcomes,
      step.request.otherwise,
      step.request.total,
    );
    effects = [...rolled, ...step.rest];
  }

  startRun(state, lookup, effects, ctx, step.sink, step.source, step.outcome);
}

/** Applies a finished effect run wherever its result belongs. */
function finishRun(
  state: GameState,
  lookup: HeroLookup,
  outcome: EffectOutcome,
  ctx: PendingCtx,
  sink: PendingSink,
  source: string,
): void {
  outcome.log.forEach((line) => log(state, line));
  outcome.notes.forEach((note) => log(state, `manual: ${note}`, state.players[ctx.self]));

  switch (sink.kind) {
    case 'ability':
      finishAbility(state, lookup, outcome, sink.abilityId, sink.defender);
      break;
    case 'defense':
      finishDefense(state, lookup, outcome, sink.abilityId);
      break;
    case 'card':
      finishCard(state, lookup, outcome, sink.playerIndex, ctx.target, source);
      break;
    case 'status':
      break;
    case 'token':
      // A token cashed in acts on its owner, so the healing and CP are already
      // applied; only the log and any damage it produced still need a home.
      finishCard(state, lookup, outcome, sink.playerIndex, ctx.target, source);
      break;
    case 'passive':
      finishCard(state, lookup, outcome, sink.playerIndex, ctx.target, source);
      break;
  }
}

/* ------------------------------------------------------------------ */
/* Ability activation                                                   */
/* ------------------------------------------------------------------ */

function findAbility(hero: Hero, abilityId: string): Ability {
  const ability = hero.abilities.find((a) => a.id === abilityId);
  if (!ability) throw new Error(`${hero.name} has no ability "${abilityId}"`);
  return ability;
}

/**
 * Announces an ability. With more than one possible defender the rules insert a
 * Targeting Roll Phase, and the ability does not resolve until that settles,
 * because most of its effects need to know who they hit.
 */
/**
 * Opponents who still have something they could say about an attack.
 *
 * Only a seat that can actually act needs asking: a table where nobody holds
 * a Roll Phase card or a spendable token should never pause.
 */
export function respondersTo(state: GameState, attacker: number, lookup: HeroLookup): number[] {
  const out: number[] = [];
  for (const [index, player] of state.players.entries()) {
    if (index === attacker || !isAlive(state, index)) continue;
    if (state.players[index].team === state.players[attacker].team) continue;
    if (stunned(state, index)) continue;

    const hero = heroOf(lookup, player);
    const hasCard = player.hand.some((cardId) => {
      const card = cardOf(hero, cardId);
      return card ? canPlayCard(state, index, card, cardId, lookup) : false;
    });
    if (hasCard) out.push(index);
  }
  return out;
}

/** Runs the declared attack now that everybody has had their say. */
function resumeActivation(state: GameState, lookup: HeroLookup): void {
  const waiting = state.response;
  if (!waiting) return;
  state.response = null;

  const attacker = state.players[state.active];
  const hero = heroOf(lookup, attacker);
  const ability = findAbility(hero, waiting.abilityId);
  const tier = tiersAt(ability, levelOf(ability, attacker.abilityLevels))[waiting.tierIndex];

  // The dice may not be what they were: that is the whole point of the window.
  if (!tier || !state.roll || !matchRequirement(hero, state.roll.dice, tier.requirement)) {
    log(state, `${ability.name} no longer activates`, attacker);
    endOffensivePhase(state);
    return;
  }

  runActivation(state, lookup, waiting.abilityId, waiting.tierIndex);
}

function activateOffensive(
  state: GameState,
  lookup: HeroLookup,
  abilityId: string,
  tierIndex: number | undefined,
): void {
  const attackerIndex = state.active;
  const attacker = state.players[attackerIndex];
  const hero = heroOf(lookup, attacker);
  const ability = findAbility(hero, abilityId);
  const roll = state.roll;
  if (!roll) throw new Error('No dice to activate with');

  // Pick the requested tier, else the strongest one the dice satisfy.
  // The slot plays by the rules of the level its owner has upgraded it to.
  const levels = attacker.abilityLevels;
  const index =
    tierIndex ??
    bestAbilities(hero, roll.dice, levels).find((m) => m.ability.id === abilityId)?.tierIndex;
  if (index === undefined) throw new Error(`Dice do not activate ${ability.name}`);
  const tier = tiersAt(ability, levelOf(ability, levels))[index];
  if (!tier) throw new Error(`Dice do not activate ${ability.name}`);
  if (!matchRequirement(hero, roll.dice, tier.requirement)) {
    throw new Error(`Dice do not activate ${ability.name}`);
  }

  /*
   * Declared, not yet resolved.
   *
   * Anyone who could still answer gets their last chance first — to change a
   * die, to force a re-roll, to take the ability away entirely. Nobody able
   * to respond means nothing to wait for.
   */
  const responders = respondersTo(state, attackerIndex, lookup);
  if (responders.length > 0) {
    state.response = {
      abilityId,
      abilityName: ability.name,
      tierIndex: index,
      waiting: responders,
    };
    log(state, `declares ${ability.name}`, attacker);
    return;
  }

  runActivation(state, lookup, abilityId, index);
}

/** Everything activating an ability does once it is actually going ahead. */
function runActivation(
  state: GameState,
  lookup: HeroLookup,
  abilityId: string,
  index: number,
): void {
  const attackerIndex = state.active;
  const attacker = state.players[attackerIndex];
  const hero = heroOf(lookup, attacker);
  const ability = findAbility(hero, abilityId);
  const roll = state.roll;
  if (!roll) throw new Error('No dice to activate with');
  /*
   * The whole roll goes to the effects, not only the dice the requirement
   * asked for.
   *
   * "Draw 1 card per Card face", "2 Fire Mastery per Fiery Soul" and "if
   * there are 4 matching numbers" all read the dice on the table. Handing
   * them the minimum that satisfied the requirement made Carducopia draw
   * exactly two cards however many Cards were showing.
   */
  const usedDice = roll.dice.slice();

  // Blind resolves as the Offensive Roll Phase concludes.
  if (statusCount(attacker, 'blind') > 0) {
    removeStatus(attacker, 'blind', 1);
    const die = rollDie(state.rng);
    const fails = behaviourOf('blind').failOrpOn ?? [];
    if (fails.includes(die)) {
      log(state, `Blind: rolled ${die}, Offensive Roll Phase fails`, attacker);
      endOffensivePhase(state);
      return;
    }
    log(state, `Blind: rolled ${die}, ability resolves`, attacker);
  }

  log(state, `activates ${ability.name}`, attacker);

  const opponents = opponentsOf(state, attackerIndex);
  if (opponents.length === 0) {
    endOffensivePhase(state);
    return;
  }

  const pending: PendingActivation = {
    abilityId,
    tierIndex: index,
    usedDice,
    opponents,
    roll: null,
    chooser: null,
  };

  if (!needsTargetingRoll(state.mode, opponents)) {
    resolveActivation(state, lookup, pending, opponents[0]);
    return;
  }

  state.targeting = pending;
  state.roll = null;
  state.phase = 'targetingRoll';
}

/** Rolls the targeting die and either fixes a defender or defers the choice. */
function rollTarget(state: GameState, lookup: HeroLookup): void {
  const pending = state.targeting;
  if (!pending) throw new Error('Not in a Targeting Roll Phase');
  if (pending.roll !== null) throw new Error('The targeting die has already been rolled');

  const die = rollDie(state.rng);
  pending.roll = die;
  const outcome = resolveTargetRoll(state.mode, pending.opponents, die);
  log(state, `targeting roll: ${die}`, state.players[state.active]);

  if (outcome.kind === 'fixed') {
    resolveActivation(state, lookup, pending, outcome.target);
  } else {
    pending.chooser = outcome.kind === 'attackerChooses' ? 'attacker' : 'defenders';
    log(state, `targeting: ${pending.chooser} choose the defender`);
  }
}

function chooseTarget(state: GameState, lookup: HeroLookup, target: number): void {
  const pending = state.targeting;
  if (!pending) throw new Error('Not in a Targeting Roll Phase');
  if (pending.chooser === null) throw new Error('The die has not deferred the choice');
  if (!pending.opponents.includes(target)) throw new Error('That player is not a legal target');
  resolveActivation(state, lookup, pending, target);
}

/** Runs the announced ability now that a defender is known. */
function resolveActivation(
  state: GameState,
  lookup: HeroLookup,
  pending: PendingActivation,
  defenderIndex: number,
): void {
  const attackerIndex = state.active;
  const attacker = state.players[attackerIndex];
  const hero = heroOf(lookup, attacker);
  const ability = findAbility(hero, pending.abilityId);
  const tier = tiersAt(ability, levelOf(ability, attacker.abilityLevels))[pending.tierIndex];

  state.targeting = null;

  // King of the Hill rewards attacking whoever is in front.
  if (state.mode === 'koth') {
    const best = Math.max(...state.teams.map((t) => t.health));
    const attackerLeads = teamOf(state, attackerIndex).health === best;
    if (!attackerLeads && healthOf(state, defenderIndex) === best) {
      drawCards(state, attacker, 1);
      log(state, 'draws a bonus card for attacking the Leader', attacker);
    }
  }

  const ctx: PendingCtx = {
    self: attackerIndex,
    target: defenderIndex,
    heroId: hero.id,
    usedDice: pending.usedDice,
    defensive: false,
    chosen: null,
  };

  startRun(
    state,
    lookup,
    tier.effects,
    ctx,
    {
      kind: 'ability',
      abilityId: pending.abilityId,
      tierIndex: pending.tierIndex,
      defender: defenderIndex,
    },
    ability.name,
  );
}

/** Turns a finished Offensive Ability into a pending attack, or ends the phase. */
function finishAbility(
  state: GameState,
  lookup: HeroLookup,
  outcome: EffectOutcome,
  abilityId: string,
  defenderIndex: number,
): void {
  const attackerIndex = state.active;
  const attacker = state.players[attackerIndex];
  const hero = heroOf(lookup, attacker);
  const ability = findAbility(hero, abilityId);

  // Pure dmg outranks everything: nothing may defend, reduce or avoid it.
  const type: DamageType =
    outcome.damageType !== 'normal'
      ? outcome.damageType
      : ability.ultimate
        ? 'ultimate'
        : outcome.undefendable
          ? 'undefendable'
          : 'normal';

  if (outcome.damage <= 0 || state.phase === 'gameOver') {
    if (state.phase !== 'gameOver') endOffensivePhase(state);
    return;
  }

  const modifiers: DamageModifier[] = [];
  const targeted = behaviourOf('targeted');
  if (targeted.incomingBonus && statusCount(state.players[defenderIndex], 'targeted') > 0) {
    modifiers.push({ source: 'Targeted', kind: 'add', amount: targeted.incomingBonus });
  }

  state.attack = {
    attacker: attackerIndex,
    defender: defenderIndex,
    abilityId,
    abilityName: ability.name,
    incoming: outcome.damage,
    type,
    modifiers,
    afterDamage: [],
    defenseResolved: false,
  };
  state.phase = 'defensiveRoll';
  state.roll = null;
}

function endOffensivePhase(state: GameState): void {
  // Whatever was declared is over, one way or the other.
  state.response = null;
  const player = state.players[state.active];
  // Entangle is removed at the conclusion of the Roll Phase.
  if (statusCount(player, 'entangle') > 0) removeStatus(player, 'entangle', 1);
  if (statusCount(player, 'barbed-vine') > 0) removeStatus(player, 'barbed-vine', 1);
  state.roll = null;
  state.phase = 'main2';
}

/* ------------------------------------------------------------------ */
/* Defence                                                              */
/* ------------------------------------------------------------------ */

function chooseDefense(state: GameState, lookup: HeroLookup, abilityId: string | null): void {
  const attack = state.attack;
  if (!attack) throw new Error('No attack to defend against');
  if (attack.defenseResolved) throw new Error('The defence has already been settled');

  const defender = state.players[attack.defender];
  const hero = heroOf(lookup, defender);

  if (abilityId && attack.type !== 'normal') {
    throw new Error(`${attack.type} damage cannot be defended against`);
  }

  if (!abilityId) {
    log(state, 'declines to defend', defender);
    attack.defenseResolved = true;
    return;
  }

  const ability = findAbility(hero, abilityId);
  if (ability.kind !== 'defensive') throw new Error(`${ability.name} is not a Defensive Ability`);

  const ctx: PendingCtx = {
    self: attack.defender,
    target: attack.attacker,
    heroId: hero.id,
    usedDice: [],
    defensive: true,
    chosen: null,
  };

  // A Defensive Ability whose dice the engine used to roll behind the scenes is
  // now thrown by the defender: its sub-roll suspends and waits for them.
  const defenceTiers = tiersAt(ability, levelOf(ability, defender.abilityLevels));
  startRun(state, lookup, defenceTiers[0].effects, ctx, { kind: 'defense', abilityId }, ability.name);
}

function finishDefense(
  state: GameState,
  lookup: HeroLookup,
  outcome: EffectOutcome,
  abilityId: string,
): void {
  const attack = state.attack;
  if (!attack) return;
  const defender = state.players[attack.defender];
  const hero = heroOf(lookup, defender);
  const ability = findAbility(hero, abilityId);

  log(state, `defends with ${ability.name}`, defender);

  if (outcome.prevention > 0) {
    attack.modifiers.push({ source: ability.name, kind: 'prevent', amount: outcome.prevention });
  }
  for (const divisor of outcome.preventionDivisors) {
    attack.modifiers.push({ source: ability.name, kind: 'preventFraction', divisor });
  }
  if (outcome.damageToAttacker > 0) {
    sendDamageBack(attack, outcome.damageToAttacker, ability.name);
    log(state, `deals ${outcome.damageToAttacker} dmg back`, defender);
  }

  attack.defenseResolved = true;
}

/* ------------------------------------------------------------------ */
/* Spending status tokens against a pending attack                      */
/* ------------------------------------------------------------------ */

function spendStatus(
  state: GameState,
  lookup: HeroLookup,
  playerId: string,
  statusId: string,
  optionId?: string,
): void {
  const index = state.players.findIndex((p) => p.id === playerId);
  const player = state.players[index];
  if (index < 0) throw new Error('No such player');
  if (statusCount(player, statusId) === 0) throw new Error(`${player.name} has no ${statusId}`);

  const behaviour = behaviourOf(statusId);

  // Tokens that answer nothing: Cleanse, a Sapling cashed in, Wellspring
  // rolled in a Main Phase, a Seedling spent over your own dice.
  const free = (behaviour.spendFreely ?? []).filter((o) =>
    canSpendFreely(state, index, o.when),
  );
  const chosen = optionId ? free.find((o) => o.id === optionId) : free[0];
  if (chosen) {
    removeStatus(player, statusId, 1);
    log(state, `spends ${statusId}: ${chosen.label}`, player);
    const hero = heroOf(lookup, player);
    startRun(
      state,
      lookup,
      chosen.effects,
      { self: index, target: index, heroId: hero.id, usedDice: [], defensive: false, chosen: null },
      { kind: 'token', playerIndex: index, statusId },
      statusId,
    );
    return;
  }

  const attack = state.attack;
  if (!attack) throw new Error('Status tokens are spent against a pending attack');
  if (attack.window && index !== attack.defender) {
    throw new Error('Only the player taking the damage may answer it');
  }
  const isDefender = index === attack.defender;
  const isAttacker = index === attack.attacker;

  if (isDefender && behaviour.spendToPrevent) {
    attack.modifiers.push(behaviour.spendToPrevent);
    removeStatus(player, statusId, 1);
    log(state, `spends ${statusId}`, player);
    return;
  }

  // The rolling spends are thrown by hand: the token comes off now and the die
  // waits on its owner, so they see the result rather than reading it in a log.
  if (isDefender && behaviour.spendToAvoid) {
    removeStatus(player, statusId, 1);
    pushTokenRoll(state, lookup, index, statusId);
    return;
  }

  if (isAttacker && behaviour.spendToBoost) {
    const boost = behaviour.spendToBoost;
    if (boost.minDamage !== undefined && attack.incoming < boost.minDamage) {
      throw new Error(`${statusId} needs an attack of at least ${boost.minDamage} dmg`);
    }
    if (boost.notTheTurnGained && player.gainedThisTurn.includes(statusId)) {
      throw new Error(`${statusId} cannot add damage on the turn it was gained`);
    }
    removeStatus(player, statusId, 1);
    if (boost.undefendable) {
      attack.type = 'undefendable';
      log(state, `spends ${statusId}: the attack becomes undefendable`, player);
    } else if (boost.rollAdd) {
      pushTokenRoll(state, lookup, index, statusId);
    } else if (boost.add !== undefined) {
      attack.modifiers.push({ source: statusId, kind: 'add', amount: boost.add });
      log(state, `spends ${statusId}: +${boost.add} dmg`, player);
    }
    return;
  }

  throw new Error(`${statusId} cannot be spent here`);
}

/**
 * True when a token with no attack to answer may be cashed in right now.
 *
 * It is your own turn's business, so it waits for your turn and for the
 * engine not to be mid-question; a token spent over dice also needs dice.
 */
function canSpendFreely(state: GameState, index: number, when: 'any' | 'roll'): boolean {
  if (state.attack) return false;
  if (state.pending.length > 0) return false;
  if (index !== state.active) return false;
  if (when === 'roll') return state.roll !== null;
  return state.phase === 'main1' || state.phase === 'main2' || state.roll !== null;
}

/** Parks a one-die token roll on the pending stack for its owner to throw. */
function pushTokenRoll(
  state: GameState,
  lookup: HeroLookup,
  index: number,
  statusId: string,
): void {
  const player = state.players[index];
  state.pending.push({
    who: index,
    source: statusId,
    request: { kind: 'roll', dice: 1, outcomes: [], otherwise: [], rerolls: 0, total: [] },
    dice: [],
    rolled: false,
    rerolls: 0,
    rest: [],
    bodyLength: 0,
    outcome: emptyOutcome(),
    ctx: {
      self: index,
      target: index,
      heroId: player.heroId,
      usedDice: [],
      defensive: false,
      chosen: null,
    },
    sink: { kind: 'status', statusId, playerIndex: index },
  });
  void lookup;
}

/** Reads a spent token's die and applies what its behaviour says. */
function finishStatusRoll(state: GameState, lookup: HeroLookup, step: PendingStep): void {
  const attack = state.attack;
  if (step.sink.kind !== 'status') return;
  const { statusId, playerIndex } = step.sink;
  const player = state.players[playerIndex];
  const die = step.dice[0]?.value ?? 1;
  const behaviour = behaviourOf(statusId);

  if (!attack) {
    log(state, `spends ${statusId}, rolled ${die} — the attack is gone`, player);
    return;
  }

  if (behaviour.spendToAvoid) {
    if (behaviour.spendToAvoid.avoidOn.includes(die)) {
      attack.modifiers.push({ source: statusId, kind: 'avoid' });
      log(state, `spends ${statusId}, rolled ${die} — damage avoided`, player);
    } else {
      log(state, `spends ${statusId}, rolled ${die} — no effect`, player);
    }
    return;
  }

  const boost = behaviour.spendToBoost;
  if (!boost?.rollAdd) {
    void lookup;
    return;
  }

  const amount = boost.rollAdd(die);

  /*
   * Some faces hand the decision back: Ninjutsu on a six may add its damage,
   * inflict Delayed Poison, or make the attack undefendable instead.
   */
  if (boost.rollChoice?.on.includes(die)) {
    const hero = heroOf(lookup, player);
    startRun(
      state,
      lookup,
      [
        {
          t: 'choose',
          request: { pick: 'oneOf', options: boost.rollChoice.options },
          effects: [
            {
              t: 'when',
              cond: { chose: 'ninjutsu-poison' },
              effects: [{ t: 'gainStatus', status: 'delayed-poison', target: 'opponent' }],
              otherwise: [
                {
                  t: 'when',
                  cond: { chose: 'ninjutsu-undefendable' },
                  effects: [{ t: 'undefendable' }],
                  otherwise: [{ t: 'attackBonus', amount }],
                },
              ],
            },
          ],
        },
      ],
      {
        self: playerIndex,
        target: attack.defender,
        heroId: hero.id,
        usedDice: [],
        defensive: false,
        chosen: null,
      },
      { kind: 'token', statusId, playerIndex },
      statusId,
    );
    return;
  }

  attack.modifiers.push({ source: statusId, kind: 'add', amount });
  log(state, `spends ${statusId}, rolled ${die}: +${amount} dmg`, player);
}

/* ------------------------------------------------------------------ */
/* Resolving the attack                                                 */
/* ------------------------------------------------------------------ */

function resolveAttack(state: GameState, lookup: HeroLookup): void {
  const attack = state.attack;
  if (!attack) throw new Error('No attack to resolve');

  /*
   * Shadows and its like are not spent and are not chosen: a player holding
   * one simply takes no damage from an opponent's attack, and makes no
   * defence. It applies to the attack only — damage from outside one is not
   * "damage as a result of an opponent's Offensive Roll Phase" — so a window
   * goes through it.
   */
  if (!attack.window) {
    const hidden = state.players[attack.defender];
    for (const statusId of Object.keys(hidden.statuses)) {
      if (statusCount(hidden, statusId) === 0) continue;
      if (!behaviourOf(statusId).autoAvoid) continue;
      if (attack.modifiers.some((m) => m.kind === 'avoid' && m.source === statusId)) continue;
      attack.modifiers.push({ source: statusId, kind: 'avoid' });
      log(state, `is hidden by ${statusId}`, hidden);
    }
  }

  const result = resolveDamage(attack.incoming, attack.type, attack.modifiers);
  result.steps.forEach((step) => log(state, step));

  applyDamage(state, lookup, attack.defender, result.final);

  // Stun gives the player who inflicted it another Offensive Roll Phase.
  const defender = state.players[attack.defender];
  if (
    !attack.window &&
    behaviourOf('stun').grantsExtraOrpToInflicter &&
    statusCount(defender, 'stun') > 0 &&
    state.phase !== 'gameOver'
  ) {
    removeStatus(defender, 'stun', 1);
    state.extraOrp += 1;
    log(state, 'Stun: the attacker takes another Offensive Roll Phase');
  }

  state.attack = null;
  if (state.phase === 'gameOver') return;

  // Everything the attacker has earned back, from whatever source.
  const back = result.reflected + (attack.damageBack?.amount ?? 0);
  const backFrom = attack.damageBack?.source ?? attack.abilityName;

  // A window was a pause, not an attack: the turn picks up where it was, or
  // finishes if the window was what was holding it open.
  if (attack.window) {
    // Already outside an attack, so there is no second window to open: it
    // lands, typeless, as it would have done had it been dealt on the spot.
    if (back > 0) dealDamage(state, attack.attacker, back, 'typeless');
    if (attack.resumeEndTurn) finishEndTurn(state, lookup);
    return;
  }

  if (state.extraOrp > 0) {
    state.extraOrp -= 1;
    state.phase = 'offensiveRoll';
    startOffensiveRoll(state, lookup);
  } else {
    endOffensivePhase(state);
  }

  /*
   * Damage sent back by a Defensive Ability, by a card played in defence or
   * by Retribution comes from outside the Attack, so it is typeless and its
   * target may answer it too.
   *
   * Opened last, after this attack is cleared away and the Roll Phase has
   * ended: the window does not depend on the phase, so ending the phase first
   * means settling it cannot leave the attacker's turn stuck in a Defensive
   * Roll Phase that is already over.
   */
  if (back > 0) {
    openDamageWindow(state, attack.attacker, back, backFrom);
  }
}

/* ------------------------------------------------------------------ */
/* Turn progression                                                     */
/* ------------------------------------------------------------------ */

function endTurn(state: GameState, lookup: HeroLookup): void {
  const player = state.players[state.active];

  // End-of-turn statuses, e.g. Delayed Poison.
  let damage = 0;
  for (const [statusId, count] of Object.entries(player.statuses)) {
    const rule = behaviourOf(statusId).endOfTurn;
    if (!rule) continue;
    if (rule.damagePerToken) damage += rule.damagePerToken * count;
    if (rule.removeTokens) removeStatus(player, statusId, rule.removeTokens);
  }
  if (damage > 0) {
    log(state, `takes ${damage} dmg at the end of their turn`, player);
    // The turn does not pass until its holder has had the chance to answer.
    openDamageWindow(state, state.active, damage, 'End of turn');
    if (state.attack) state.attack.resumeEndTurn = true;
    return;
  }

  finishEndTurn(state, lookup);
}

/** Everything a turn does once its end-of-turn damage has been settled. */
function finishEndTurn(state: GameState, lookup: HeroLookup): void {
  if (state.phase === 'gameOver') return;
  const player = state.players[state.active];

  player.gainedThisTurn = [];
  player.barbedVineDamageThisTurn = 0;
  player.hasTakenTurn = true;

  // Shadows is discarded once its holder has started and concluded a turn.
  if (statusCount(player, 'shadows') > 0) removeStatus(player, 'shadows', 1);

  beginNextTurn(state, lookup);
}

/**
 * Hands the turn to the next player still standing.
 *
 * Walks clockwise. Seats are dealt so that this alternates teams, which is the
 * rulebook's zigzag order.
 */
function beginNextTurn(state: GameState, lookup: HeroLookup): void {
  const n = state.players.length;
  let next = state.active;
  for (let step = 1; step <= n; step++) {
    const candidate = (state.active + step) % n;
    if (isAlive(state, candidate)) {
      next = candidate;
      if (candidate <= state.active) state.round += 1;
      break;
    }
  }
  state.active = next;
  state.phase = 'upkeep';
  runUpkeep(state, lookup);
}

/**
 * Ends the turn of a player who has just been knocked out of it.
 *
 * With three or more teams a defeat does not end the game, and the player who
 * took it may be the one whose turn it is — damage sent back by a defence,
 * Retribution, an end-of-turn token. They are out, so the rest of their turn
 * is not theirs to take: it used to carry on, and they went on rolling,
 * attacking and selling cards after leaving the game.
 *
 * Nothing is cut short to do it: a pending step, an attack being resolved or
 * an unanswered window all finish first, and this runs once the table is quiet.
 */
function endTurnOfTheDefeated(state: GameState, lookup: HeroLookup): void {
  if (state.phase === 'gameOver') return;
  if (isAlive(state, state.active)) return;
  if (state.pending.length > 0 || state.attack || state.response) return;

  log(state, `is out, so their turn ends`, state.players[state.active]);
  state.roll = null;
  state.targeting = null;
  state.extraOrp = 0;
  beginNextTurn(state, lookup);
}

function nextPhase(state: GameState, lookup: HeroLookup): void {
  switch (state.phase) {
    case 'upkeep':
      state.phase = 'income';
      runIncome(state);
      break;
    case 'income':
      state.phase = 'main1';
      break;
    case 'main1':
      state.phase = 'offensiveRoll';
      startOffensiveRoll(state, lookup);
      break;
    case 'offensiveRoll':
      endOffensivePhase(state);
      break;
    case 'targetingRoll':
      throw new Error('Settle the Targeting Roll Phase before moving on');
    case 'defensiveRoll':
      throw new Error('Resolve the pending attack before leaving the Defensive Roll Phase');
    case 'main2':
      state.phase = 'discard';
      break;
    case 'discard':
      endTurn(state, lookup);
      break;
    case 'gameOver':
      break;
  }
}

/* ------------------------------------------------------------------ */
/* Cards                                                                */
/* ------------------------------------------------------------------ */

function sellCard(state: GameState, cardId: string): void {
  const player = state.players[state.active];
  const at = player.hand.indexOf(cardId);
  if (at < 0) throw new Error('That card is not in hand');
  player.hand.splice(at, 1);
  player.discard.push(cardId);
  gainCp(player, RULES.sellValue);
  log(state, `sells a card for ${RULES.sellValue} CP`, player);
}

/**
 * Which seats may play a card of each kind, and when.
 *
 * Main Phase cards and upgrades belong to the active player's Main Phases.
 * Roll Phase cards need dice on the table, Instants need only a game in
 * progress — and either may come from any seat, which is what makes an
 * opponent's hand worth fearing.
 */
/**
 * True while an Ultimate Ability locks this player out.
 *
 * Rulebook v2.4.1 p.10: "The damage and effects of an Ultimate Ability can be
 * enhanced, but cannot be reduced, prevented, avoided, responded to, or
 * interrupted by anything. Opponents may take no action of any kind from the
 * time it is Activated until the conclusion of the Roll Phase."
 *
 * The attacker is not an opponent of their own Ultimate, so they may still
 * add to it — an Ultimate is Modifiable, increase-only.
 */
export function lockedOutByUltimate(state: GameState, playerIndex: number): boolean {
  const attack = state.attack;
  if (!attack || attack.type !== 'ultimate') return false;
  return playerIndex !== attack.attacker;
}

export function canPlayCard(
  state: GameState,
  playerIndex: number,
  card: Card,
  cardId: string,
  lookup: HeroLookup,
): boolean {
  if (state.phase === 'gameOver') return false;
  if (lockedOutByUltimate(state, playerIndex) || stunned(state, playerIndex)) return false;
  const player = state.players[playerIndex];
  if (!player || !player.hand.includes(cardId)) return false;
  if (!isAlive(state, playerIndex)) return false;
  if (player.cp < costOf(lookup(player.heroId), player, card)) return false;

  const window = card.window;
  if (window?.needsAttack && !state.attack) return false;
  if (window?.who === 'defender' && state.attack?.defender !== playerIndex) return false;
  if (window?.who === 'attacker' && state.attack?.attacker !== playerIndex) return false;
  if (window?.needsRoll && !state.roll) return false;
  if (window?.needsOwnRoll && state.roll?.playerIndex !== playerIndex) return false;

  switch (card.type) {
    case 'upgrade':
    case 'mainPhase':
      // Yours to play, on your own turn, with the dice put away.
      return (
        playerIndex === state.active &&
        (state.phase === 'main1' || state.phase === 'main2') &&
        state.pending.length === 0
      );

    case 'rollPhase':
      // Any Roll Phase card needs dice somewhere on the table to act on.
      return (
        state.roll !== null ||
        state.phase === 'defensiveRoll' ||
        state.phase === 'targetingRoll' ||
        topPending(state)?.request.kind === 'roll'
      );

    case 'instant':
      return true;
  }
}

/** An upgrade from II to III costs only the difference between the two cards. */
function costOf(hero: Hero, player: PlayerState, card: Card): number {
  if (card.type !== 'upgrade' || !card.upgrades) return card.cp;
  if (player.abilityLevels[card.upgrades] !== 'II' || card.upgradeLevel !== 'III') return card.cp;
  const levelTwo = hero.cards.find((c) => c.upgrades === card.upgrades && c.upgradeLevel === 'II');
  return Math.max(0, card.cp - (levelTwo?.cp ?? 0));
}

function playCard(
  state: GameState,
  lookup: HeroLookup,
  cardId: string,
  playerIndex: number,
): void {
  const player = state.players[playerIndex];
  const hero = heroOf(lookup, player);
  const at = player.hand.indexOf(cardId);
  if (at < 0) throw new Error('That card is not in hand');

  const card = cardOf(hero, cardId);
  if (!card) throw new Error(`Unknown card ${cardId}`);
  if (!canPlayCard(state, playerIndex, card, cardId, lookup)) {
    throw new Error(`${card.name} cannot be played right now`);
  }

  state.events.push({ kind: 'card', player: playerIndex, cardId: card.id });

  if (card.type === 'upgrade') {
    if (!card.upgrades || !card.upgradeLevel) throw new Error(`${card.name} has no upgrade target`);
    const current = player.abilityLevels[card.upgrades];
    // Upgrading from II to III costs only the difference between the two cards.
    let cost = card.cp;
    if (current === 'II' && card.upgradeLevel === 'III') {
      const levelTwo = hero.cards.find(
        (c) => c.upgrades === card.upgrades && c.upgradeLevel === 'II',
      );
      cost = Math.max(0, card.cp - (levelTwo?.cp ?? 0));
    }
    if (player.cp < cost) throw new Error(`Not enough CP for ${card.name}`);
    gainCp(player, -cost);
    player.abilityLevels[card.upgrades] = card.upgradeLevel;
    player.hand.splice(at, 1);
    log(state, `upgrades ${card.upgrades} to ${card.upgradeLevel}`, player);
    return;
  }

  if (player.cp < card.cp) throw new Error(`Not enough CP for ${card.name}`);
  gainCp(player, -card.cp);
  player.hand.splice(at, 1);
  player.discard.push(cardId);
  log(state, `plays ${card.name}`, player);

  if (!card.effects?.length) return;

  // A card played into someone else's attack aims at the other side of it.
  const target = defaultTargetFor(state, playerIndex);
  const ctx: PendingCtx = {
    self: playerIndex,
    target,
    heroId: hero.id,
    usedDice: [],
    defensive: state.attack?.defender === playerIndex,
    chosen: null,
  };

  startRun(
    state,
    lookup,
    card.effects,
    ctx,
    { kind: 'card', cardId, cardName: card.name, playerIndex },
    card.name,
  );
}

/** Who a card aims at when it does not say: the other side of a live attack. */
function defaultTargetFor(state: GameState, playerIndex: number): number {
  const attack = state.attack;
  if (attack) {
    if (attack.attacker === playerIndex) return attack.defender;
    if (attack.defender === playerIndex) return attack.attacker;
  }
  return opponentOf(state, playerIndex);
}

/**
 * Sends a finished card's outcome where it belongs.
 *
 * Damage and prevention from a card fold into the pending attack when there is
 * one — that is what makes an Attack Modifier a modifier — and are applied
 * directly when there is not.
 */
function finishCard(
  state: GameState,
  lookup: HeroLookup,
  outcome: EffectOutcome,
  playerIndex: number,
  target: number,
  source: string,
): void {
  const attack = state.attack;
  const player = state.players[playerIndex];

  if (outcome.damage > 0) {
    if (attack && attack.attacker === playerIndex) {
      attack.modifiers.push({ source, kind: 'add', amount: outcome.damage });
      log(state, `${source}: +${outcome.damage} dmg to the attack`, player);
    } else {
      // Outside an attack a card's damage lands straight on the dial.
      applyDamage(state, lookup, target, outcome.damage);
      log(state, `${source}: ${outcome.damage} dmg to ${state.players[target].name}`, player);
    }
  }

  const prevention = outcome.prevention;
  if (prevention > 0 && attack) {
    attack.modifiers.push({ source, kind: 'prevent', amount: prevention });
    log(state, `${source}: prevents ${prevention} dmg`, player);
  }
  for (const divisor of outcome.preventionDivisors) {
    if (attack) attack.modifiers.push({ source, kind: 'preventFraction', divisor });
  }
  if (outcome.damageToAttacker > 0 && attack) {
    sendDamageBack(attack, outcome.damageToAttacker, source);
  }
}

/* ------------------------------------------------------------------ */
/* Pending-step actions                                                 */
/* ------------------------------------------------------------------ */

function rollPending(state: GameState, lookup: HeroLookup, reroll: boolean): void {
  const step = topPending(state);
  if (!step) throw new Error('Nothing is pending');
  if (step.request.kind !== 'roll') throw new Error('This step is not a roll');

  if (!reroll) {
    if (step.rolled) throw new Error('These dice have already been thrown');
    step.dice = makeDice(step.request.dice, state.rng).map((d, i) => ({ ...d, id: `p${i}` }));
    step.rolled = true;
    state.events.push({ kind: 'roll', player: step.who, dieIds: step.dice.map((d) => d.id) });
  } else {
    if (!step.rolled) throw new Error('Throw the dice before re-rolling them');
    if (step.rerolls <= 0) throw new Error('No re-rolls left');
    step.rerolls -= 1;
    const moved = step.dice.filter((d) => !d.kept).map((d) => d.id);
    step.dice = rerollUnkept(step.dice, state.rng);
    state.events.push({ kind: 'roll', player: step.who, dieIds: moved });
  }

  void lookup;
}

/* ------------------------------------------------------------------ */
/* Choices                                                              */
/* ------------------------------------------------------------------ */

/** Every answer the pending choice would accept, for a UI or a bot. */
export function choiceOptions(state: GameState, lookup: HeroLookup): ChoiceAnswer[] {
  const step = topPending(state);
  if (!step || step.request.kind !== 'choice') return [];
  const spec = step.request.spec;
  const me = step.who;
  const out: ChoiceAnswer[] = [];

  switch (spec.pick) {
    case 'player': {
      const scope = spec.scope ?? 'any';
      for (const [index] of state.players.entries()) {
        if (!isAlive(state, index)) continue;
        if (scope === 'others' && index === me) continue;
        if (scope === 'opponents' && state.players[index].team === state.players[me].team) continue;
        out.push({ player: index });
      }
      break;
    }

    case 'status': {
      const scope = spec.scope ?? 'any';
      for (const [index, player] of state.players.entries()) {
        if (scope === 'own' && index !== me) continue;
        if (scope === 'opponents' && player.team === state.players[me].team) continue;
        const hero = lookup(player.heroId);
        for (const [statusId, count] of Object.entries(player.statuses)) {
          if (count <= 0) continue;
          if (spec.only && !spec.only.includes(statusId)) continue;
          if (spec.polarity) {
            const printed = hero.statusEffects.find((s) => s.id === statusId);
            if (printed && printed.polarity !== spec.polarity) continue;
          }
          out.push({ status: { player: index, statusId } });
        }
      }
      break;
    }

    case 'die': {
      const scope = spec.scope ?? 'any';
      const roll = state.roll;
      if (roll) {
        const mine = state.players[roll.playerIndex].team === state.players[me].team;
        const allowed =
          scope === 'any' || (scope === 'own' && mine) || (scope === 'opponents' && !mine);
        if (allowed) for (const die of roll.dice) out.push({ dieId: die.id });
      }
      // A sub-roll waiting to be confirmed is on the table as much as the tray.
      const below = state.pending[state.pending.length - 2] ?? null;
      if (below?.request.kind === 'roll' && below.rolled) {
        const mine = below.who === me;
        const allowed =
          scope === 'any' || (scope === 'own' && mine) || (scope === 'opponents' && !mine);
        if (allowed) for (const die of below.dice) out.push({ dieId: die.id });
      }
      break;
    }

    case 'dieValue': {
      const mode = spec.mode ?? 'any';
      if (mode === 'shown') {
        const seen = new Set(diceOnTable(state).map((d) => d.value));
        // Matching a die means matching one of the others, not itself.
        const picked = diceOnTable(state).find((d) => d.id === step.ctx.chosen?.dieId);
        for (const v of [...seen].sort()) {
          if (picked && v === picked.value && diceOnTable(state).filter((d) => d.value === v).length < 2) {
            continue;
          }
          out.push({ value: v });
        }
      } else if (mode === 'adjacent') {
        const picked = diceOnTable(state).find((d) => d.id === step.ctx.chosen?.dieId);
        const base = picked?.value ?? 1;
        for (const v of [base - 1, base + 1]) if (v >= 1 && v <= 6) out.push({ value: v });
      } else {
        for (let v = 1; v <= 6; v++) out.push({ value: v });
      }
      break;
    }

    case 'oneOf': {
      for (const option of spec.options) out.push({ optionId: option.id });
      break;
    }
  }

  // An optional question always offers the way out, whatever it asks for.
  if ('optional' in spec && spec.optional) out.push({ skipped: true });

  return out;
}

function answerChoice(state: GameState, lookup: HeroLookup, answer: ChoiceAnswer): void {
  const step = topPending(state);
  if (!step) throw new Error('Nothing is pending');
  if (step.request.kind !== 'choice') throw new Error('This step is not a choice');

  const legal = choiceOptions(state, lookup);
  const ok = legal.some((option) => sameAnswer(option, answer));
  if (!ok) throw new Error('That is not one of the options');

  // A declined optional choice drops the effects it would have driven and
  // carries on with whatever came after them.
  if (answer.skipped) {
    state.pending.pop();
    log(state, `declines ${step.source}`, state.players[step.who]);
    startRun(
      state,
      lookup,
      step.rest.slice(step.bodyLength),
      step.ctx,
      step.sink,
      step.source,
      step.outcome,
    );
    return;
  }

  resumePending(state, lookup, { ...step.ctx.chosen, ...answer });
}

function sameAnswer(a: ChoiceAnswer, b: ChoiceAnswer): boolean {
  return (
    a.player === b.player &&
    a.dieId === b.dieId &&
    a.value === b.value &&
    Boolean(a.skipped) === Boolean(b.skipped) &&
    a.status?.player === b.status?.player &&
    a.status?.statusId === b.status?.statusId
  );
}

/* ------------------------------------------------------------------ */
/* The reducer                                                          */
/* ------------------------------------------------------------------ */

/**
 * Applies one action and returns a new state. The input is never mutated, so
 * callers can keep previous states for undo or replay.
 *
 * Illegal actions throw; the caller is expected to offer only legal ones
 * (see `legalActions`).
 */
export function reduce(state: GameState, action: Action, lookup: HeroLookup): GameState {
  const next: GameState = structuredClone(state);
  // The events describe one action, so the previous action's are dropped
  // before this one runs.
  next.events = [];
  if (next.phase === 'gameOver') return next;

  const player = next.players[next.active];

  /*
   * A declared attack holds the table. Only the answers to it are allowed
   * through — the attacker must not be able to roll again or walk away while
   * an opponent still has a card in hand for them.
   */
  if (next.response) {
    const answering =
      action.type === 'playCard' ||
      action.type === 'passResponse' ||
      action.type === 'answerChoice' ||
      action.type === 'rollPending' ||
      action.type === 'rerollPending' ||
      action.type === 'keepPending' ||
      action.type === 'confirmPending' ||
      action.type === 'spendStatus';
    if (!answering) {
      throw new Error(`${next.response.abilityName} is waiting to be answered`);
    }
  }

  switch (action.type) {
    case 'rollDice': {
      const roll = next.roll;
      if (!roll || roll.kind !== 'offensive') throw new Error('Not in an Offensive Roll Phase');
      if (roll.attemptsUsed >= roll.maxAttempts) throw new Error('No Roll Attempts left');
      roll.attemptsUsed += 1;
      const moved = roll.dice.filter((d) => !d.kept).map((d) => d.id);
      roll.dice = rerollUnkept(roll.dice, next.rng);
      next.events.push({ kind: 'roll', player: roll.playerIndex, dieIds: moved });
      applyBarbedVine(next, lookup, player, roll.attemptsUsed);
      log(next, `rolls ${describeDice(next, lookup, player)}`, player);
      break;
    }

    case 'toggleKeep': {
      const die = next.roll?.dice.find((d) => d.id === action.dieId);
      if (!die) throw new Error('No such die');
      die.kept = !die.kept;
      break;
    }

    case 'setKeep': {
      if (!next.roll) throw new Error('No dice to keep');
      for (const die of next.roll.dice) die.kept = action.dieIds.includes(die.id);
      break;
    }

    case 'activateAbility':
      activateOffensive(next, lookup, action.abilityId, action.tierIndex);
      break;

    case 'passResponse': {
      const waiting = next.response;
      if (!waiting) throw new Error('Nothing is waiting to be answered');
      const seat = next.players.findIndex((p) => p.id === action.playerId);
      if (seat < 0) throw new Error('No such player');
      waiting.waiting = waiting.waiting.filter((i) => i !== seat);
      // Whether that was the last word is settled below, in one place.
      break;
    }

    case 'skipAttack':
      log(next, 'does not activate an Offensive Ability', player);
      endOffensivePhase(next);
      break;

    case 'rollTarget':
      rollTarget(next, lookup);
      break;

    case 'chooseTarget':
      chooseTarget(next, lookup, action.target);
      break;

    case 'chooseDefense':
      chooseDefense(next, lookup, action.abilityId);
      break;

    case 'spendStatus': {
      const at = next.players.findIndex((p) => p.id === action.playerId);
      spendStatus(next, lookup, action.playerId, action.statusId, action.optionId);
      if (at >= 0) next.events.push({ kind: 'spend', player: at, statusId: action.statusId });
      break;
    }

    case 'resolveAttack':
      if (next.pending.length > 0) throw new Error('Settle the pending roll first');
      resolveAttack(next, lookup);
      break;

    case 'sellCard':
      sellCard(next, action.cardId);
      break;

    case 'playCard': {
      const index = action.playerId
        ? next.players.findIndex((p) => p.id === action.playerId)
        : next.active;
      if (index < 0) throw new Error('No such player');
      playCard(next, lookup, action.cardId, index);
      break;
    }

    case 'usePassive':
      activatePassive(next, lookup, next.active, action.abilityId, action.optionId);
      break;

    case 'payKnockdown': {
      const cost = behaviourOf('knockdown').skipOrpUnlessPaid ?? 0;
      if (statusCount(player, 'knockdown') === 0) throw new Error('No Knockdown to pay off');
      if (player.cp < cost) throw new Error('Not enough CP');
      gainCp(player, -cost);
      removeStatus(player, 'knockdown', 1);
      log(next, `pays ${cost} CP to shake off Knockdown`, player);
      break;
    }

    case 'rollPending':
      rollPending(next, lookup, false);
      break;

    case 'rerollPending':
      rollPending(next, lookup, true);
      break;

    case 'keepPending': {
      const step = topPending(next);
      const die = step?.dice.find((d) => d.id === action.dieId);
      if (!step || !die) throw new Error('No such die');
      if (step.rerolls <= 0) throw new Error('Nothing left to re-roll');
      die.kept = !die.kept;
      break;
    }

    case 'confirmPending': {
      const step = topPending(next);
      if (!step) throw new Error('Nothing is pending');
      if (step.request.kind !== 'roll') throw new Error('This step is not a roll');
      if (!step.rolled) throw new Error('Throw the dice first');
      resumePending(next, lookup, null);
      break;
    }

    case 'answerChoice':
      answerChoice(next, lookup, action.answer);
      break;

    case 'nextPhase':
      if (next.pending.length > 0) throw new Error('Settle the pending step first');
      nextPhase(next, lookup);
      break;
  }

  /*
   * A declared attack waits only while somebody can still answer it.
   *
   * Playing a card reopens the window — the rules let both sides go back and
   * forth until everyone accepts the dice — and when the last opponent runs
   * out of answers the attack goes ahead by itself rather than leaving the
   * table with nothing legal to do.
   */
  if (next.response && next.pending.length === 0) {
    const able = respondersTo(next, next.active, lookup);
    next.response.waiting =
      action.type === 'playCard'
        ? able
        : next.response.waiting.filter((seat) => able.includes(seat));
    if (next.response.waiting.length === 0) resumeActivation(next, lookup);
  }

  endTurnOfTheDefeated(next, lookup);

  return next;
}

/* ------------------------------------------------------------------ */
/* Legal actions                                                        */
/* ------------------------------------------------------------------ */

/** Cards any seat could play right now, as actions. */
function cardActions(state: GameState, lookup: HeroLookup): Action[] {
  const out: Action[] = [];
  for (const [index, player] of state.players.entries()) {
    const hero = lookup(player.heroId);
    for (const cardId of player.hand) {
      const card = cardOf(hero, cardId);
      if (!card) continue;
      if (canPlayCard(state, index, card, cardId, lookup)) {
        out.push({ type: 'playCard', cardId, playerId: player.id });
      }
    }
  }
  return out;
}

/** The actions available right now, for a UI or a bot to choose from. */
/**
 * True while Stun stops this player doing anything.
 *
 * The token reads "while stunned the holder may take no actions of any kind";
 * it comes off when the player who inflicted it takes their extra Offensive
 * Roll Phase, which `grantsExtraOrpToInflicter` handles.
 */
export function stunned(state: GameState, playerIndex: number): boolean {
  if (playerIndex === state.active) return false;
  return (
    behaviourOf('stun').grantsExtraOrpToInflicter === true &&
    statusCount(state.players[playerIndex], 'stun') > 0
  );
}

export function legalActions(state: GameState, lookup: HeroLookup): Action[] {
  if (state.phase === 'gameOver') return [];

  const player = state.players[state.active];
  const hero = heroOf(lookup, player);
  const out: Action[] = [];

  // A pending roll or choice blocks everything except answering it — and the
  // Instants and Roll Phase cards the rules let you throw into the gap.
  const step = topPending(state);
  if (step) {
    if (step.request.kind === 'roll') {
      if (!step.rolled) out.push({ type: 'rollPending' });
      else {
        if (step.rerolls > 0) {
          out.push({ type: 'rerollPending' });
          for (const die of step.dice) out.push({ type: 'keepPending', dieId: die.id });
        }
        out.push({ type: 'confirmPending' });
      }
    } else {
      for (const answer of choiceOptions(state, lookup)) {
        out.push({ type: 'answerChoice', answer });
      }
    }
    out.push(...cardActions(state, lookup));
    return out;
  }

  /*
   * An attack has been declared and is waiting on the other side of the
   * table. Only they may act — the attacker cannot push past them, which is
   * the whole point of the pause.
   */
  const waiting = state.response;
  if (waiting) {
    for (const seat of waiting.waiting) {
      out.push({ type: 'passResponse', playerId: state.players[seat].id });
    }
    const attackerId = state.players[state.active].id;
    out.push(
      ...cardActions(state, lookup).filter(
        (o) => o.type === 'playCard' && o.playerId !== attackerId,
      ),
    );
    return out;
  }

  // Damage from outside an attack is waiting on its target. Nothing else may
  // happen until they have taken it or answered it.
  const window = state.attack?.window ? state.attack : null;
  if (window) {
    const target = state.players[window.defender];
    for (const statusId of Object.keys(target.statuses)) {
      if (statusCount(target, statusId) === 0) continue;
      const behaviour = behaviourOf(statusId);
      // Not `autoAvoid`: Shadows is not spent, it simply applies, so offering
      // it as something to click was both wrong and endless — each click
      // stacked another modifier and the token never went anywhere.
      if (behaviour.spendToPrevent || behaviour.spendToAvoid) {
        out.push({ type: 'spendStatus', playerId: target.id, statusId });
      }
    }
    out.push(...cardActions(state, lookup));
    out.push({ type: 'resolveAttack' });
    return out;
  }

  // Passive options say "at any time", so they are offered in every phase of
  // the owner's turn their window allows.
  for (const { abilityId, option } of passiveOptionsFor(state, lookup, state.active)) {
    out.push({ type: 'usePassive', abilityId, optionId: option.id });
  }

  // So are the tokens that answer no attack: Cleanse, a Sapling, Wellspring,
  // a Seedling over your own dice.
  const acting = state.players[state.active];
  for (const [statusId, count] of Object.entries(acting.statuses)) {
    if (count <= 0) continue;
    for (const option of behaviourOf(statusId).spendFreely ?? []) {
      if (!canSpendFreely(state, state.active, option.when)) continue;
      out.push({ type: 'spendStatus', playerId: acting.id, statusId, optionId: option.id });
    }
  }

  switch (state.phase) {
    case 'upkeep':
    case 'income':
      out.push({ type: 'nextPhase' });
      break;

    case 'main1':
    case 'main2': {
      for (const cardId of player.hand) out.push({ type: 'sellCard', cardId });
      if (statusCount(player, 'knockdown') > 0 && player.cp >= 2) out.push({ type: 'payKnockdown' });
      out.push({ type: 'nextPhase' });
      break;
    }

    case 'offensiveRoll': {
      const roll = state.roll;
      if (!roll) break;
      if (roll.attemptsUsed < roll.maxAttempts) {
        out.push({ type: 'rollDice' });
        for (const die of roll.dice) out.push({ type: 'toggleKeep', dieId: die.id });
      }
      for (const match of bestAbilities(hero, roll.dice, state.players[roll.playerIndex].abilityLevels)) {
        out.push({
          type: 'activateAbility',
          abilityId: match.ability.id,
          tierIndex: match.tierIndex,
        });
      }
      out.push({ type: 'skipAttack' });
      break;
    }

    case 'targetingRoll': {
      const pending = state.targeting;
      if (!pending) break;
      if (pending.roll === null) {
        out.push({ type: 'rollTarget' });
      } else if (pending.chooser) {
        for (const target of pending.opponents) out.push({ type: 'chooseTarget', target });
      }
      break;
    }

    case 'defensiveRoll': {
      const attack = state.attack;
      if (!attack) break;
      const defender = state.players[attack.defender];
      const defHero = heroOf(lookup, defender);

      if (!attack.defenseResolved) {
        if (attack.type === 'normal' && !stunned(state, attack.defender)) {
          for (const ability of defHero.abilities.filter((a) => a.kind === 'defensive')) {
            out.push({ type: 'chooseDefense', abilityId: ability.id });
          }
        }
        out.push({ type: 'chooseDefense', abilityId: null });
        break;
      }

      for (const [index, p] of state.players.entries()) {
        // An Ultimate shuts every opponent out completely; only the attacker
        // may still add to it. See `lockedOutByUltimate`.
        if (lockedOutByUltimate(state, index) || stunned(state, index)) continue;
        for (const statusId of Object.keys(p.statuses)) {
          const behaviour = behaviourOf(statusId);
          const boostable =
            behaviour.spendToBoost &&
            !(behaviour.spendToBoost.notTheTurnGained && p.gainedThisTurn.includes(statusId)) &&
            !(
              behaviour.spendToBoost.minDamage !== undefined &&
              attack.incoming < behaviour.spendToBoost.minDamage
            );
          const usable =
            // `autoAvoid` is deliberately absent: it is not spent and not
            // chosen, it applies on its own when the attack resolves.
            (index === attack.defender &&
              (behaviour.spendToPrevent || behaviour.spendToAvoid)) ||
            (index === attack.attacker && boostable);
          if (usable) out.push({ type: 'spendStatus', playerId: p.id, statusId });
        }
      }
      out.push({ type: 'resolveAttack' });
      break;
    }

    case 'discard': {
      // Selling is always on offer here; the phase cannot be left over the limit.
      for (const cardId of player.hand) out.push({ type: 'sellCard', cardId });
      if (player.hand.length <= RULES.handLimit) out.push({ type: 'nextPhase' });
      break;
    }
  }

  out.push(...cardActions(state, lookup));
  return out;
}
