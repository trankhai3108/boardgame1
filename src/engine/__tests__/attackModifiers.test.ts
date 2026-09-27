import { describe, expect, it } from 'vitest';
import { HEROES } from '../../data/heroes';
import type { Action } from '../actions';
import { legalActions, reduce } from '../reducer';
import { createGame, topPending, type GameState } from '../state';
import { activateThrough, lookup } from './support';

const act = (state: GameState, action: Action) => reduce(state, action, lookup);

/**
 * An attack declared and answered, stopped at the Defensive Roll Phase with
 * the defence still open.
 *
 * `attacker` picks who swings, so a test can hand the modifier tokens to the
 * hero that actually prints them.
 */
function pendingAttack(attackerHero: string, abilityId: string, seed = 4): GameState {
  let game = createGame(
    [
      { id: 'p1', name: 'One', hero: HEROES[attackerHero] },
      { id: 'p2', name: 'Two', hero: HEROES.barbarian },
    ],
    { seed },
  );
  game = act(game, { type: 'nextPhase' }); // -> offensiveRoll

  // Give the attacker exactly the dice the ability asks for.
  const hero = HEROES[attackerHero];
  const ability = hero.abilities.find((a) => a.id === abilityId)!;
  const req = ability.tiers[0].requirement;
  if (req.kind !== 'symbols') throw new Error(`${abilityId} is not a symbol combo`);
  const faces: number[] = [];
  for (const [symbol, count] of Object.entries(req.symbols)) {
    const face = hero.dieFaces.find((f) => f.symbol === symbol)!;
    for (let i = 0; i < count; i++) faces.push(face.value);
  }
  while (faces.length < 5) faces.push(faces[0]);
  game.roll!.dice = faces.slice(0, 5).map((value, i) => ({ id: `d${i}`, value, kept: false }));

  game = activateThrough(game, abilityId, 0);

  // An ability that throws dice of its own parks them; the attack is only
  // declared once they land.
  for (let i = 0; i < 12 && topPending(game); i++) {
    const options = legalActions(game, lookup);
    const pick =
      options.find((o) => o.type === 'rollPending') ??
      options.find((o) => o.type === 'confirmPending') ??
      options.find((o) => o.type === 'answerChoice');
    if (!pick) break;
    game = act(game, pick);
  }
  return game;
}

const types = (game: GameState) =>
  legalActions(game, lookup).map((o) =>
    o.type === 'spendStatus' ? `spendStatus:${o.statusId}` : o.type,
  );

describe('Attack Modifiers are spent before the defence, not after it', () => {
  it('offers Accuracy while the defence is still open', () => {
    const game = pendingAttack('paladin', 'righteous-combat');
    game.players[0].statuses.accuracy = 1;

    expect(game.phase).toBe('defensiveRoll');
    expect(game.attack!.defenseResolved, 'the defence has not happened yet').toBe(false);

    // Accuracy reads "spend it at the conclusion of their Offensive Roll Phase
    // to make their Attack undefendable" — after the defence it is worthless.
    expect(types(game)).toContain('spendStatus:accuracy');
  });

  it('shuts the defence out once Accuracy has been spent', () => {
    let game = pendingAttack('paladin', 'righteous-combat');
    game.players[0].statuses.accuracy = 1;

    game = act(game, { type: 'spendStatus', playerId: 'p1', statusId: 'accuracy' });

    expect(game.attack!.type).toBe('undefendable');
    const defences = legalActions(game, lookup).filter(
      (o) => o.type === 'chooseDefense' && o.abilityId !== null,
    );
    expect(defences, 'an undefendable attack cannot be defended').toHaveLength(0);
  });

  it('still offers a damage modifier after the defence, as Chi may be', () => {
    let game = pendingAttack('paladin', 'righteous-combat');
    game.players[0].statuses.crit = 1;
    game = act(game, { type: 'chooseDefense', abilityId: null });
    expect(game.attack!.defenseResolved).toBe(true);
    expect(types(game)).toContain('spendStatus:crit');
  });
});

describe("Ninjutsu's sixth face", () => {
  /** Spends Ninjutsu and forces the die to `value`. */
  function spendNinjutsu(value: number): GameState {
    let game = pendingAttack('ninja', 'slash');
    game.players[0].statuses.ninjutsu = 1;

    game = act(game, { type: 'spendStatus', playerId: 'p1', statusId: 'ninjutsu' });
    game = act(game, { type: 'rollPending' });
    topPending(game)!.dice[0].value = value;
    return act(game, { type: 'confirmPending' });
  }

  it('adds 1 on a low roll and 2 on a middling one', () => {
    for (const [die, bonus] of [
      [1, 1],
      [3, 1],
      [4, 2],
      [5, 2],
    ] as const) {
      const game = spendNinjutsu(die);
      const added = game.attack!.modifiers.filter((m) => m.kind === 'add');
      expect(added.at(-1), `die ${die}`).toMatchObject({ amount: bonus });
    }
  });

  it('asks which of the three the six buys', () => {
    const game = spendNinjutsu(6);
    const step = topPending(game);
    expect(step?.request.kind).toBe('choice');
    const ids = legalActions(game, lookup).flatMap((o) =>
      o.type === 'answerChoice' && o.answer.optionId ? [o.answer.optionId] : [],
    );
    expect(ids).toEqual(
      expect.arrayContaining([
        'ninjutsu-damage',
        'ninjutsu-poison',
        'ninjutsu-undefendable',
      ]),
    );
  });

  it('makes the attack undefendable when that is what was chosen', () => {
    let game = spendNinjutsu(6);
    game = act(game, {
      type: 'answerChoice',
      answer: { optionId: 'ninjutsu-undefendable' },
    });

    expect(topPending(game)).toBeNull();
    expect(game.attack!.type, 'the choice has to reach the attack').toBe('undefendable');
  });

  it('inflicts Delayed Poison when that is what was chosen', () => {
    let game = spendNinjutsu(6);
    const defender = game.attack!.defender;
    game = act(game, { type: 'answerChoice', answer: { optionId: 'ninjutsu-poison' } });

    expect(game.players[defender].statuses['delayed-poison']).toBe(1);
    expect(game.attack!.type).toBe('normal');
  });

  it('adds the damage when that is what was chosen', () => {
    let game = spendNinjutsu(6);
    game = act(game, { type: 'answerChoice', answer: { optionId: 'ninjutsu-damage' } });

    const added = game.attack!.modifiers.filter((m) => m.kind === 'add');
    expect(added.at(-1)).toMatchObject({ amount: 2 });
    expect(game.attack!.type).toBe('normal');
  });
});
