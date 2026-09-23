/**
 * Plays every ability, every card and every token of every hero.
 *
 * The other audits read the data and ask whether a rule is written down.
 * This one puts each rule on a table and takes it through the engine: it
 * builds dice that satisfy the requirement, activates the ability, answers
 * whatever the engine stops for, and resolves the attack. Anything that
 * throws, stalls, or resolves without doing anything is reported.
 *
 *   npm run playtest            every hero
 *   npm run playtest -- monk    one hero
 */
import { HEROES, HERO_LIST } from '../src/data/heroes';
import { levelOf, tiersAt } from '../src/engine/combos';
import { canPlayCard, legalActions, reduce } from '../src/engine/reducer';
import { behaviourOf } from '../src/engine/statusBehaviour';
import { createGame, topPending } from '../src/engine/state';

const lookup = (id) => HEROES[id];
const LEVELS = ['I', 'II', 'III'];

/** A fresh 1v1 with `hero` on seat 0. */
function table(hero, seed = 7) {
  const foe = HERO_LIST.find((h) => h.id !== hero.id);
  return createGame(
    [
      { id: 'p1', name: 'Me', hero },
      { id: 'p2', name: 'You', hero: foe },
    ],
    { seed },
  );
}

/** Dice that satisfy a requirement, or null if it cannot be built. */
function diceFor(hero, req) {
  const faceFor = (symbol) => hero.dieFaces.find((f) => f.symbol === symbol)?.value;
  const values = [];

  if (req.kind === 'symbols') {
    for (const [symbol, n] of Object.entries(req.symbols)) {
      const v = faceFor(symbol);
      if (v === undefined) return null;
      for (let i = 0; i < n; i++) values.push(v);
    }
  } else if (req.kind === 'straight') {
    for (let v = 1; v <= req.length; v++) values.push(v);
  } else if (req.kind === 'ofAKind') {
    for (let i = 0; i < req.count; i++) values.push(1);
  } else {
    return null;
  }

  if (values.length > 5) return null;
  // Pad with a face that cannot accidentally complete a longer straight.
  while (values.length < 5) values.push(values[0]);
  return values.map((value, i) => ({ id: `d${i}`, value, kept: true }));
}

/**
 * Takes whatever the engine is waiting for until it is waiting for nothing.
 *
 * Every step is one of the actions the rules currently allow, so this cannot
 * push the game anywhere it would not go on its own.
 */
function settle(state, limit = 60) {
  let game = state;
  for (let i = 0; i < limit; i++) {
    const options = legalActions(game, lookup);
    const pick =
      // A declared attack waits on its opponents; wave it through so the
      // ability underneath actually gets to resolve.
      options.find((o) => o.type === 'passResponse') ??
      options.find((o) => o.type === 'rollPending') ??
      options.find((o) => o.type === 'confirmPending') ??
      options.find((o) => o.type === 'answerChoice') ??
      (topPending(game) ? null : options.find((o) => o.type === 'chooseTarget')) ??
      options.find((o) => o.type === 'rollTarget') ??
      options.find((o) => o.type === 'chooseDefense' && o.abilityId === null) ??
      options.find((o) => o.type === 'resolveAttack');
    if (!pick) return { game, settled: true };
    const next = reduce(game, pick, lookup);
    if (next === game) return { game, settled: false, why: 'the game stopped changing' };
    game = next;
  }
  return { game, settled: false, why: `still busy after ${limit} steps` };
}

/** Did anything at all happen between these two states? */
function moved(before, after) {
  return (
    JSON.stringify(before.teams) !== JSON.stringify(after.teams) ||
    JSON.stringify(before.players.map((p) => [p.cp, p.statuses, p.hand.length, p.abilityLevels])) !==
      JSON.stringify(after.players.map((p) => [p.cp, p.statuses, p.hand.length, p.abilityLevels])) ||
    after.log.length > before.log.length + 1
  );
}

const fails = [];
const report = (kind, hero, what, why) => fails.push({ kind, hero, what, why });

/* ---------------------------------------------------------------- */
/* Abilities, at every level they can reach                          */
/* ---------------------------------------------------------------- */

function tryAbility(hero, ability, level, tierIndex) {
  const what = `${ability.name} ${level}${ability.tiers.length > 1 ? ` tier ${tierIndex}` : ''}`;
  let game = table(hero);
  if (level !== 'I') game.players[0].abilityLevels[ability.id] = level;
  /*
   * Enough CP that a cost never gets in the way, and half a stack of the
   * hero's own helpful tokens: enough that "1 dmg per Spirit" has Spirits to
   * count, with room left that "grow 6 Spirits" still has somewhere to grow.
   */
  game.players[0].cp = 15;
  for (const status of hero.statusEffects) {
    if (status.polarity === 'negative') continue;
    game.players[0].statuses[status.id] = Math.ceil(status.stackLimit / 2);
  }

  const tiers = tiersAt(ability, levelOf(ability, game.players[0].abilityLevels));
  const tier = tiers[tierIndex];
  if (!tier) return;

  if (ability.kind === 'defensive') {
    // A defence needs an attack to answer, so let the opponent throw one.
    game.attack = {
      attacker: 1,
      defender: 0,
      abilityId: 'x',
      abilityName: 'Test attack',
      incoming: 8,
      type: 'normal',
      modifiers: [],
      afterDamage: [],
      defenseResolved: false,
    };
    game.phase = 'defensiveRoll';
    try {
      const before = game;
      game = reduce(game, { type: 'chooseDefense', abilityId: ability.id }, lookup);
      const out = settle(game);
      if (!out.settled) return report('ability', hero.name, what, out.why);
      if (!moved(before, out.game)) report('ability', hero.name, what, 'resolved but changed nothing');
    } catch (err) {
      report('ability', hero.name, what, String(err.message ?? err));
    }
    return;
  }

  const dice = diceFor(hero, tier.requirement);
  if (!dice) return report('ability', hero.name, what, 'could not build dice for it');

  try {
    game = reduce(game, { type: 'nextPhase' }, lookup);
    if (game.phase !== 'offensiveRoll' || !game.roll) {
      return report('ability', hero.name, what, `no Offensive Roll Phase (in ${game.phase})`);
    }
    game.roll.dice = dice;
    const before = game;
    game = reduce(game, { type: 'activateAbility', abilityId: ability.id, tierIndex }, lookup);
    const out = settle(game);
    if (!out.settled) return report('ability', hero.name, what, out.why);
    if (!moved(before, out.game)) report('ability', hero.name, what, 'resolved but changed nothing');
  } catch (err) {
    report('ability', hero.name, what, String(err.message ?? err));
  }
}

/* ---------------------------------------------------------------- */
/* Cards                                                             */
/* ---------------------------------------------------------------- */

function tryCard(hero, card) {
  const instance = `${card.id}#t`;

  // Try each window a card of this type can legally be played in.
  const setups = [
    ['Main Phase 1', (g) => g],
    [
      'Offensive Roll Phase',
      (g) => {
        const next = reduce(g, { type: 'nextPhase' }, lookup);
        if (next.roll) {
          next.roll.dice = [1, 2, 3, 4, 5].map((value, i) => ({ id: `d${i}`, value, kept: true }));
        }
        return next;
      },
    ],
    [
      'while attacking',
      (g) => {
        const next = structuredClone(g);
        next.attack = {
          attacker: 0,
          defender: 1,
          abilityId: 'x',
          abilityName: 'Test attack',
          incoming: 8,
          type: 'normal',
          modifiers: [],
          afterDamage: [],
          defenseResolved: true,
        };
        next.phase = 'defensiveRoll';
        return next;
      },
    ],
    [
      'while being attacked',
      (g) => {
        const next = structuredClone(g);
        next.attack = {
          attacker: 1,
          defender: 0,
          abilityId: 'x',
          abilityName: 'Test attack',
          incoming: 8,
          type: 'normal',
          modifiers: [],
          afterDamage: [],
          defenseResolved: true,
        };
        next.phase = 'defensiveRoll';
        return next;
      },
    ],
  ];

  const refusals = [];
  for (const [where, prepare] of setups) {
    let game = table(hero);
    game.players[0].cp = 15;
    game.players[0].hand.unshift(instance);
    game.players[0].statuses = Object.fromEntries(
      hero.statusEffects.map((s) => [s.id, s.stackLimit]),
    );
    game = prepare(game);

    if (!canPlayCard(game, 0, card, instance, lookup)) {
      refusals.push(where);
      continue;
    }
    try {
      const before = game;
      game = reduce(game, { type: 'playCard', cardId: instance, playerId: game.players[0].id }, lookup);
      const out = settle(game);
      if (!out.settled) return report('card', hero.name, card.name, out.why);
      if (!moved(before, out.game)) {
        report('card', hero.name, card.name, `played in ${where} and changed nothing`);
      }
      return;
    } catch (err) {
      return report('card', hero.name, card.name, `${where}: ${err.message ?? err}`);
    }
  }
  report('card', hero.name, card.name, `never playable (tried: ${refusals.join('; ')})`);
}

/* ---------------------------------------------------------------- */
/* Tokens                                                            */
/* ---------------------------------------------------------------- */

function tryToken(hero, status) {
  const b = behaviourOf(status.id);
  /*
   * Shadows and its like are never spent: holding one is enough, and the
   * attack simply fails to land. So the thing to check is not that it can be
   * used but that it works — and that it is not offered as something to use,
   * which it used to be, endlessly.
   */
  if (b.autoAvoid) {
    let game = table(hero);
    game.players[0].statuses[status.id] = 1;
    game.attack = {
      attacker: 1,
      defender: 0,
      abilityId: 'x',
      abilityName: 'Test attack',
      incoming: 9,
      type: 'normal',
      modifiers: [],
      afterDamage: [],
      defenseResolved: true,
    };
    game.phase = 'defensiveRoll';

    const offered = legalActions(game, lookup).some(
      (o) => o.type === 'spendStatus' && o.statusId === status.id,
    );
    if (offered) report('token', hero.name, status.name, 'offered as a spend, but it is automatic');

    const health = game.teams[0].health;
    const after = reduce(game, { type: 'resolveAttack' }, lookup);
    if (after.teams[0].health !== health) {
      report('token', hero.name, status.name, 'did not take the attack off by itself');
    }
    return;
  }

  const spendable = b.spendToPrevent || b.spendToBoost || b.spendToAvoid || b.spendFreely;
  if (!spendable) return; // Upkeep and passive tokens are covered by the game audit.

  for (const asAttacker of [true, false]) {
    let game = table(hero);
    game.players[0].cp = 15;
    game.players[0].statuses[status.id] = status.stackLimit;
    game.players[0].gainedThisTurn = [];

    if (b.spendFreely) {
      // These want a turn, not an attack.
      const roll = b.spendFreely.some((o) => o.when === 'roll');
      if (roll) {
        game = reduce(game, { type: 'nextPhase' }, lookup);
      }
    } else {
      game.attack = {
        attacker: asAttacker ? 0 : 1,
        defender: asAttacker ? 1 : 0,
        abilityId: 'x',
        abilityName: 'Test attack',
        incoming: 9,
        type: 'normal',
        modifiers: [],
        afterDamage: [],
        defenseResolved: true,
      };
      game.phase = 'defensiveRoll';
    }

    const options = legalActions(game, lookup).filter(
      (o) => o.type === 'spendStatus' && o.statusId === status.id && o.playerId === game.players[0].id,
    );
    if (options.length === 0) continue;

    for (const option of options) {
      try {
        const before = game;
        const after = settle(reduce(game, option, lookup));
        if (!after.settled) {
          report('token', hero.name, `${status.name} (${option.optionId ?? 'spend'})`, after.why);
        } else if (!moved(before, after.game)) {
          report('token', hero.name, `${status.name} (${option.optionId ?? 'spend'})`, 'spent and changed nothing');
        }
      } catch (err) {
        report('token', hero.name, status.name, String(err.message ?? err));
      }
    }
    return;
  }
  report('token', hero.name, status.name, 'never spendable');
}

/* ---------------------------------------------------------------- */

const only = process.argv[2];
const heroes = only ? HERO_LIST.filter((h) => h.id === only) : HERO_LIST;
if (heroes.length === 0) {
  console.log(`No hero "${only}". Try: ${HERO_LIST.map((h) => h.id).join(', ')}`);
  process.exit(1);
}

let abilities = 0;
let cards = 0;
let tokens = 0;

for (const hero of heroes) {
  for (const ability of hero.abilities) {
    if (ability.kind === 'passive') continue;
    for (const level of LEVELS) {
      const tiers = level === 'I' ? ability.tiers : ability.upgrades?.[level];
      if (!tiers) continue;
      for (let i = 0; i < tiers.length; i++) {
        abilities += 1;
        tryAbility(hero, ability, level, i);
      }
    }
  }
  for (const card of hero.cards) {
    cards += 1;
    tryCard(hero, card);
  }
  for (const status of hero.statusEffects) {
    tokens += 1;
    tryToken(hero, status);
  }
}

console.log(`played ${abilities} ability tiers, ${cards} cards, ${tokens} tokens`);
console.log(`across ${heroes.length} hero${heroes.length === 1 ? '' : 'es'}\n`);

if (fails.length === 0) {
  console.log('everything resolved.');
} else {
  const byKind = {};
  for (const f of fails) (byKind[f.kind] ??= []).push(f);
  for (const [kind, list] of Object.entries(byKind)) {
    console.log(`--- ${kind} (${list.length}) ---`);
    for (const f of list) console.log(`  ${f.hero.padEnd(13)} ${String(f.what).padEnd(34)} ${f.why}`);
  }
  console.log(`\n${fails.length} problems.`);
}
