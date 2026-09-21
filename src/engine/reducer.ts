import type { Ability, Card, Hero } from './types';
import type { Action } from './actions';
import { resolveDamage, type DamageModifier, type DamageType } from './damage';
import { makeDice, rerollUnkept } from './dice';
import { bestAbilities, matchRequirement } from './combos';
import { resolveEffects, type EffectContext, type EffectOutcome } from './effects';
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
  type GameState,
  type PendingActivation,
  type PlayerState,
} from './state';
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

  // Upkeep damage accumulates and is applied simultaneously at the end of the phase.
  if (damage > 0) applyDamage(state, lookup, state.active, damage);
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
  applyDamage(state, lookup, state.players.indexOf(player), amount);
}

/* ------------------------------------------------------------------ */
/* Damage application                                                   */
/* ------------------------------------------------------------------ */

/**
 * Reduces the target's Health Dial — which their whole team shares — honouring
 * Blessing of Divinity, and ends the game if only one team is left standing.
 */
function applyDamage(state: GameState, lookup: HeroLookup, index: number, amount: number): void {
  const player = state.players[index];
  const team = teamOf(state, index);
  if (amount <= 0) return;

  team.health -= amount;

  if (team.health <= 0) {
    const rescue = behaviourOf('blessing-of-divinity').preventDefeatSetHealth;
    if (rescue !== undefined && statusCount(player, 'blessing-of-divinity') > 0) {
      removeStatus(player, 'blessing-of-divinity', 1);
      team.health = rescue;
      log(state, `Blessing of Divinity: health set to ${rescue}`, player);
    }
  }

  if (team.health <= 0) {
    team.health = 0;
    log(state, `${team.name} is out`);
    // With three teams on the table, one going out does not end the game: play
    // continues until a single team is left.
    const survivors = state.teams.filter((t) => t.health > 0);
    if (survivors.length <= 1) {
      state.phase = 'gameOver';
      state.winner = survivors.length === 1 ? survivors[0].id : null;
      log(state, survivors.length === 1 ? `${survivors[0].name} wins` : 'draw');
    }
  }
  void lookup;
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
  const index =
    tierIndex ?? bestAbilities(hero, roll.dice).find((m) => m.ability.id === abilityId)?.tierIndex;
  if (index === undefined) throw new Error(`Dice do not activate ${ability.name}`);
  const tier = ability.tiers[index];
  const usedDice = matchRequirement(hero, roll.dice, tier.requirement);
  if (!usedDice) throw new Error(`Dice do not activate ${ability.name}`);

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
  const tier = ability.tiers[pending.tierIndex];

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

  const ctx: EffectContext = {
    state,
    self: attackerIndex,
    target: defenderIndex,
    hero,
    usedDice: pending.usedDice,
  };
  const outcome = resolveEffects(tier.effects, ctx);
  // These lines already name whoever they concern, so they carry no attribution.
  outcome.log.forEach((line) => log(state, line));
  outcome.notes.forEach((note) => log(state, `manual: ${note}`, attacker));

  const type: DamageType = ability.ultimate
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
    abilityId: pending.abilityId,
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

  const defender = state.players[attack.defender];
  const hero = heroOf(lookup, defender);

  if (abilityId && attack.type !== 'normal') {
    throw new Error(`${attack.type} damage cannot be defended against`);
  }

  if (abilityId) {
    const ability = findAbility(hero, abilityId);
    if (ability.kind !== 'defensive') throw new Error(`${ability.name} is not a Defensive Ability`);

    const ctx: EffectContext = {
      state,
      self: attack.defender,
      target: attack.attacker,
      hero,
      usedDice: [],
      defensive: true,
    };
    const outcome: EffectOutcome = resolveEffects(ability.tiers[0].effects, ctx);
    outcome.log.forEach((line) => log(state, line));
    outcome.notes.forEach((note) => log(state, `manual: ${note}`, defender));
    log(state, `defends with ${ability.name}`, defender);

    if (outcome.prevention > 0) {
      attack.modifiers.push({ source: ability.name, kind: 'prevent', amount: outcome.prevention });
    }
    for (const divisor of outcome.preventionDivisors) {
      attack.modifiers.push({ source: ability.name, kind: 'preventFraction', divisor });
    }
    if (outcome.damageToAttacker > 0) {
      applyDamage(state, lookup, attack.attacker, outcome.damageToAttacker);
      log(state, `deals ${outcome.damageToAttacker} dmg back`, defender);
    }
  } else {
    log(state, 'declines to defend', defender);
  }

  attack.defenseResolved = true;
}

/* ------------------------------------------------------------------ */
/* Spending status tokens against a pending attack                      */
/* ------------------------------------------------------------------ */

function spendStatus(state: GameState, playerId: string, statusId: string): void {
  const attack = state.attack;
  if (!attack) throw new Error('Status tokens are spent against a pending attack');

  const index = state.players.findIndex((p) => p.id === playerId);
  const player = state.players[index];
  if (statusCount(player, statusId) === 0) throw new Error(`${player.name} has no ${statusId}`);

  const behaviour = behaviourOf(statusId);
  const isDefender = index === attack.defender;
  const isAttacker = index === attack.attacker;

  if (isDefender && behaviour.spendToPrevent) {
    attack.modifiers.push(behaviour.spendToPrevent);
    removeStatus(player, statusId, 1);
    log(state, `spends ${statusId}`, player);
    return;
  }

  if (isDefender && behaviour.autoAvoid) {
    attack.modifiers.push({ source: statusId, kind: 'avoid' });
    log(state, `is hidden by ${statusId}`, player);
    return;
  }

  if (isDefender && behaviour.spendToAvoid) {
    removeStatus(player, statusId, 1);
    const die = rollDie(state.rng);
    if (behaviour.spendToAvoid.avoidOn.includes(die)) {
      attack.modifiers.push({ source: statusId, kind: 'avoid' });
      log(state, `spends ${statusId}, rolled ${die} — damage avoided`, player);
    } else {
      log(state, `spends ${statusId}, rolled ${die} — no effect`, player);
    }
    return;
  }

  if (isAttacker && behaviour.spendToBoost) {
    const boost = behaviour.spendToBoost;
    if (boost.minDamage !== undefined && attack.incoming < boost.minDamage) {
      throw new Error(`${statusId} needs an attack of at least ${boost.minDamage} dmg`);
    }
    removeStatus(player, statusId, 1);
    if (boost.undefendable) {
      attack.type = 'undefendable';
      log(state, `spends ${statusId}: the attack becomes undefendable`, player);
    } else if (boost.rollAdd) {
      const die = rollDie(state.rng);
      const amount = boost.rollAdd(die);
      attack.modifiers.push({ source: statusId, kind: 'add', amount });
      log(state, `spends ${statusId}, rolled ${die}: +${amount} dmg`, player);
    } else if (boost.add !== undefined) {
      attack.modifiers.push({ source: statusId, kind: 'add', amount: boost.add });
      log(state, `spends ${statusId}: +${boost.add} dmg`, player);
    }
    return;
  }

  throw new Error(`${statusId} cannot be spent here`);
}

/* ------------------------------------------------------------------ */
/* Resolving the attack                                                 */
/* ------------------------------------------------------------------ */

function resolveAttack(state: GameState, lookup: HeroLookup): void {
  const attack = state.attack;
  if (!attack) throw new Error('No attack to resolve');

  const result = resolveDamage(attack.incoming, attack.type, attack.modifiers);
  result.steps.forEach((step) => log(state, step));

  applyDamage(state, lookup, attack.defender, result.final);
  if (result.reflected > 0) applyDamage(state, lookup, attack.attacker, result.reflected);

  // Stun gives the player who inflicted it another Offensive Roll Phase.
  const defender = state.players[attack.defender];
  if (
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

  if (state.extraOrp > 0) {
    state.extraOrp -= 1;
    state.phase = 'offensiveRoll';
    startOffensiveRoll(state, lookup);
  } else {
    endOffensivePhase(state);
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
    applyDamage(state, lookup, state.active, damage);
  }
  if (state.phase === 'gameOver') return;

  player.gainedThisTurn = [];
  player.barbedVineDamageThisTurn = 0;
  player.hasTakenTurn = true;

  // Shadows is discarded once its holder has started and concluded a turn.
  if (statusCount(player, 'shadows') > 0) removeStatus(player, 'shadows', 1);

  // Walk clockwise to the next player whose team is still standing. Seats are
  // dealt so that this alternates teams, which is the rulebook's zigzag order.
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

function playCard(state: GameState, lookup: HeroLookup, cardId: string): void {
  const player = state.players[state.active];
  const hero = heroOf(lookup, player);
  const at = player.hand.indexOf(cardId);
  if (at < 0) throw new Error('That card is not in hand');

  const card = cardOf(hero, cardId);
  if (!card) throw new Error(`Unknown card ${cardId}`);

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

  if (card.effects?.length) {
    const ctx: EffectContext = {
      state,
      self: state.active,
      target: opponentOf(state, state.active),
      hero,
      usedDice: [],
    };
    const outcome = resolveEffects(card.effects, ctx);
    outcome.log.forEach((line) => log(state, line));
    outcome.notes.forEach((note) => log(state, `manual: ${note}`, player));
  }
  log(state, `plays ${card.name}`, player);
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
  if (next.phase === 'gameOver') return next;

  const player = next.players[next.active];

  switch (action.type) {
    case 'rollDice': {
      const roll = next.roll;
      if (!roll || roll.kind !== 'offensive') throw new Error('Not in an Offensive Roll Phase');
      if (roll.attemptsUsed >= roll.maxAttempts) throw new Error('No Roll Attempts left');
      roll.attemptsUsed += 1;
      roll.dice = rerollUnkept(roll.dice, next.rng);
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

    case 'spendStatus':
      spendStatus(next, action.playerId, action.statusId);
      break;

    case 'resolveAttack':
      resolveAttack(next, lookup);
      break;

    case 'sellCard':
      sellCard(next, action.cardId);
      break;

    case 'playCard':
      playCard(next, lookup, action.cardId);
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

    case 'nextPhase':
      nextPhase(next, lookup);
      break;
  }

  return next;
}

/* ------------------------------------------------------------------ */
/* Legal actions                                                        */
/* ------------------------------------------------------------------ */

/** The actions available right now, for a UI or a bot to choose from. */
export function legalActions(state: GameState, lookup: HeroLookup): Action[] {
  if (state.phase === 'gameOver') return [];

  const player = state.players[state.active];
  const hero = heroOf(lookup, player);
  const out: Action[] = [];

  switch (state.phase) {
    case 'upkeep':
    case 'income':
    case 'main2':
      out.push({ type: 'nextPhase' });
      break;

    case 'main1': {
      for (const cardId of player.hand) {
        out.push({ type: 'sellCard', cardId });
        const card = cardOf(hero, cardId);
        if (card && card.type !== 'instant' && card.type !== 'rollPhase' && player.cp >= card.cp) {
          out.push({ type: 'playCard', cardId });
        }
      }
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
      for (const match of bestAbilities(hero, roll.dice)) {
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
        if (attack.type === 'normal') {
          for (const ability of defHero.abilities.filter((a) => a.kind === 'defensive')) {
            out.push({ type: 'chooseDefense', abilityId: ability.id });
          }
        }
        out.push({ type: 'chooseDefense', abilityId: null });
        break;
      }

      for (const [index, p] of state.players.entries()) {
        for (const statusId of Object.keys(p.statuses)) {
          const behaviour = behaviourOf(statusId);
          const usable =
            (index === attack.defender &&
              (behaviour.spendToPrevent || behaviour.spendToAvoid || behaviour.autoAvoid)) ||
            (index === attack.attacker && behaviour.spendToBoost);
          if (usable) out.push({ type: 'spendStatus', playerId: p.id, statusId });
        }
      }
      out.push({ type: 'resolveAttack' });
      break;
    }

    case 'discard': {
      if (player.hand.length > RULES.handLimit) {
        for (const cardId of player.hand) out.push({ type: 'sellCard', cardId });
      } else {
        out.push({ type: 'nextPhase' });
      }
      break;
    }
  }

  return out;
}
