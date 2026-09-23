import type { Action } from './actions';
import { canAct } from './authority';
import { symbolOf } from './dice';
import { legalActions, type HeroLookup } from './reducer';
import {
  RULES,
  healthOf,
  opponentsOf,
  statusCount,
  topPending,
  type GameState,
} from './state';
import type { DiceRequirement, Effect } from './types';
import type { PendingStep } from './state';

/**
 * A bot good enough to test the game with.
 *
 * It is not trying to play well — it is trying to exercise every path: roll,
 * keep, activate, target, defend, spend tokens, sell down to the hand limit,
 * and end its turn. If a bot can finish a game, the rules loop closes.
 */

/** Rough value of a tier, used to decide what to aim the dice at. */
function scoreTier(effects: readonly Effect[]): number {
  let score = 0;
  for (const effect of effects) {
    const raw = 'amount' in effect ? effect.amount : undefined;
    const amount = typeof raw === 'number' ? raw : 2;
    switch (effect.t) {
      case 'damage':
        score += amount * 2;
        break;
      case 'heal':
        score += amount;
        break;
      case 'gainCP':
      case 'drawCard':
        score += amount;
        break;
      case 'gainStatus':
        score += 2;
        break;
      case 'subRoll':
        score += 3;
        break;
      default:
        score += 1;
    }
  }
  return score;
}

/** How many of a requirement's dice the hand already shows, and which ones. */
function progress(
  state: GameState,
  lookup: HeroLookup,
  playerIndex: number,
  req: DiceRequirement,
): { matched: string[]; need: number } {
  const hero = lookup(state.players[playerIndex].heroId);
  const dice = state.roll?.dice ?? [];

  if (req.kind === 'symbols') {
    const want = new Map<string, number>(Object.entries(req.symbols));
    const keep: string[] = [];
    for (const die of dice) {
      const symbol = symbolOf(hero, die.value);
      const left = want.get(symbol) ?? 0;
      if (left > 0) {
        want.set(symbol, left - 1);
        keep.push(die.id);
      }
    }
    const need = [...want.values()].reduce((a, b) => a + Math.max(0, b), 0);
    return { matched: keep, need };
  }

  if (req.kind === 'straight') {
    // Keep one die per distinct value; duplicates are what we want to reroll.
    const seen = new Set<number>();
    const keep: string[] = [];
    for (const die of dice) {
      if (!seen.has(die.value)) {
        seen.add(die.value);
        keep.push(die.id);
      }
    }
    return { matched: keep, need: Math.max(0, req.length - seen.size) };
  }

  if (req.kind === 'ofAKind') {
    const counts = new Map<number, string[]>();
    for (const die of dice) {
      counts.set(die.value, [...(counts.get(die.value) ?? []), die.id]);
    }
    let best: string[] = [];
    for (const ids of counts.values()) if (ids.length > best.length) best = ids;
    return { matched: best, need: Math.max(0, req.count - best.length) };
  }

  return { matched: [], need: 99 };
}

/** The offensive tier the bot is aiming at: closest to done, then most valuable. */
function aim(state: GameState, lookup: HeroLookup, playerIndex: number) {
  const hero = lookup(state.players[playerIndex].heroId);
  const options = hero.abilities
    .filter((a) => a.kind === 'offensive')
    .flatMap((ability) =>
      ability.tiers.map((tier, tierIndex) => {
        const { matched, need } = progress(state, lookup, playerIndex, tier.requirement);
        return {
          abilityId: ability.id,
          tierIndex,
          keep: matched,
          need,
          score: scoreTier(tier.effects) + (ability.ultimate ? 20 : 0),
        };
      }),
    );

  options.sort((a, b) => a.need - b.need || b.score - a.score);
  return options[0] ?? null;
}

/**
 * The bot's move, or null when it has nothing to do. Always one of the actions
 * the rules currently allow.
 */
export function chooseBotAction(
  state: GameState,
  playerIndex: number,
  lookup: HeroLookup,
): Action | null {
  const options = legalActions(state, lookup).filter((a) => canAct(state, playerIndex, a));
  if (options.length === 0) return null;

  const pick = <T extends Action['type']>(type: T) =>
    options.find((a): a is Extract<Action, { type: T }> => a.type === type);

  /* --- a roll or a decision the engine stopped for --- */
  const step = topPending(state);
  if (step) {
    if (step.request.kind === 'roll') {
      // The first throw stands. Toggling keeps and re-rolling would let the
      // bot fiddle with the dice forever without advancing the game.
      return pick('rollPending') ?? pick('confirmPending') ?? null;
    }
    return answerChoice(step, options) ?? options[0] ?? null;
  }

  /* --- picking a target --- */
  if (state.phase === 'targetingRoll') {
    const roll = pick('rollTarget');
    if (roll) return roll;
    // Given the choice, go for whoever is closest to being out.
    const targets = options.filter((a) => a.type === 'chooseTarget');
    if (targets.length > 0) {
      return targets.reduce((weakest, option) =>
        healthOf(state, option.target) < healthOf(state, weakest.target) ? option : weakest,
      );
    }
  }

  /* --- defending, and spending tokens while damage is pending --- */
  if (state.phase === 'defensiveRoll' && state.attack) {
    const attack = state.attack;
    if (!attack.defenseResolved && attack.defender === playerIndex) {
      const defend = options.find((a) => a.type === 'chooseDefense' && a.abilityId !== null);
      return defend ?? pick('chooseDefense') ?? null;
    }

    const spend = (statusId: string) =>
      options.find((a) => a.type === 'spendStatus' && a.statusId === statusId);

    if (attack.attacker === playerIndex && attack.incoming >= 5) {
      const crit = spend('crit');
      if (crit) return crit;
    }
    if (attack.defender === playerIndex && attack.incoming >= 6) {
      const protect = spend('protect') ?? spend('retribution');
      if (protect) return protect;
    }
    return pick('resolveAttack') ?? null;
  }

  /* --- the offensive roll --- */
  if (state.phase === 'offensiveRoll' && state.roll) {
    const roll = state.roll;
    const hero = lookup(state.players[playerIndex].heroId);
    const activations = options.filter((a) => a.type === 'activateAbility');

    const best = activations
      .map((option) => {
        const ability = hero.abilities.find((a) => a.id === option.abilityId)!;
        const tier = ability.tiers[option.tierIndex ?? 0];
        return { option, score: scoreTier(tier.effects) + (ability.ultimate ? 20 : 0) };
      })
      .sort((a, b) => b.score - a.score)[0];

    const attemptsLeft = roll.maxAttempts - roll.attemptsUsed;

    // Out of rerolls, or already holding something strong: commit.
    if (best && (attemptsLeft === 0 || best.score >= 14)) return best.option;

    if (attemptsLeft > 0) {
      const target = aim(state, lookup, playerIndex);
      if (target) {
        const keeping = new Set(target.keep);
        const wrong = roll.dice.filter((d) => d.kept !== keeping.has(d.id));
        if (wrong.length > 0) return { type: 'setKeep', dieIds: [...keeping] };
      }
      return pick('rollDice') ?? null;
    }

    return best?.option ?? pick('skipAttack') ?? null;
  }

  /* --- main phases: take the upgrades it can afford --- */
  if (state.phase === 'main1' || state.phase === 'main2') {
    const knockdown = pick('payKnockdown');
    if (knockdown && statusCount(state.players[playerIndex], 'knockdown') > 0) return knockdown;

    const hero = lookup(state.players[playerIndex].heroId);
    const upgrade = options.find((a) => {
      if (a.type !== 'playCard') return false;
      const card = hero.cards.find((c) => c.id === a.cardId.split('#')[0]);
      return card?.type === 'upgrade';
    });
    if (upgrade) return upgrade;
    return pick('nextPhase') ?? null;
  }

  /* --- discard: sell down to the hand limit, and no further --- */
  if (state.phase === 'discard') {
    // Selling is on offer at any hand size now, so the bot has to stop itself
    // rather than take every sale the rules allow.
    if (state.players[playerIndex].hand.length > RULES.handLimit) {
      return pick('sellCard') ?? pick('nextPhase') ?? null;
    }
    return pick('nextPhase') ?? null;
  }

  return pick('nextPhase') ?? options[0] ?? null;
}

/**
 * Which answer to give a card's question.
 *
 * The bot cannot read a card, but it can read the effects the answer is about
 * to drive: anything that strips tokens, deals damage or forces a discard is
 * aimed at someone else, and everything else is aimed at itself.
 */
function answerChoice(step: PendingStep, options: Action[]): Action | undefined {
  const answers = options.filter(
    (a): a is Extract<Action, { type: 'answerChoice' }> => a.type === 'answerChoice',
  );
  if (answers.length === 0) return undefined;

  const body = step.rest.slice(0, step.bodyLength);
  const hostile = body.some(
    (e) => e.t === 'removeAllStatus' || e.t === 'damage' || e.t === 'discardCard',
  );

  const mine = (seat: number | undefined) => seat === step.who;

  // A seat to point at: away from itself when the effect bites, at itself when
  // it helps.
  const seated = answers.filter((a) => a.answer.player !== undefined);
  if (seated.length > 0) {
    const wanted = seated.find((a) =>
      hostile ? !mine(a.answer.player) : mine(a.answer.player),
    );
    return wanted ?? seated[0];
  }

  // A token: take a burden off itself first, otherwise a gift off an opponent.
  const tokens = answers.filter((a) => a.answer.status !== undefined);
  if (tokens.length > 0) {
    return tokens.find((a) => mine(a.answer.status?.player)) ?? tokens[0];
  }

  // A value: the biggest on offer is the one worth having.
  const values = answers.filter((a) => a.answer.value !== undefined);
  if (values.length > 0) {
    return values.reduce((best, a) => ((a.answer.value ?? 0) > (best.answer.value ?? 0) ? a : best));
  }

  // A die, or a choice it may decline: take the first rather than skip, so the
  // card is actually exercised.
  return answers.find((a) => !a.answer.skipped) ?? answers[0];
}

/** Whoever the game is waiting on, or -1 when it is nobody's move. */
export function seatToAct(state: GameState): number {
  if (state.phase === 'gameOver') return -1;
  // A parked roll or choice belongs to one seat and blocks everyone else.
  const step = topPending(state);
  if (step) return step.who;
  if (state.targeting?.chooser === 'defenders') return state.targeting.opponents[0];
  if (state.phase === 'defensiveRoll' && state.attack) {
    return state.attack.defenseResolved ? state.active : state.attack.defender;
  }
  return state.active;
}

/** True when the game is waiting on a seat the engine plays. */
export function waitingOnBot(state: GameState): boolean {
  const seat = seatToAct(state);
  return seat >= 0 && (state.players[seat]?.isBot ?? false);
}

/**
 * Runs bot seats until a human has to act.
 *
 * `step` applies one action and returns the new state, so the caller decides
 * whether that is a local reducer call or a server-side one. The cap stops a
 * bug in the bot from spinning forever.
 */
export function runBots(
  state: GameState,
  lookup: HeroLookup,
  step: (state: GameState, action: Action) => GameState,
  cap = 400,
): GameState {
  let current = state;
  /*
   * A whole bot turn reaches the table as one state, and every reduce clears
   * the event list before it runs, so without this the table would only ever
   * animate the bot's last action — its attack would land in silence and only
   * the health number would move.
   */
  const events = [...state.events];

  for (let i = 0; i < cap; i++) {
    if (current.phase === 'gameOver') break;
    const seat = seatToAct(current);
    if (seat < 0 || !current.players[seat]?.isBot) break;
    const action = chooseBotAction(current, seat, lookup);
    if (!action) break;
    const next = step(current, action);
    // A bot that cannot change the state would loop forever.
    if (next === current) break;
    events.push(...next.events);
    current = next;
  }

  return current === state ? current : { ...current, events };
}

/** Opponents a bot would consider, for tests and debugging. */
export function botTargets(state: GameState, playerIndex: number): number[] {
  return opponentsOf(state, playerIndex);
}
