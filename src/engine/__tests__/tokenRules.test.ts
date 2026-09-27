import { describe, expect, it } from 'vitest';
import { HEROES } from '../../data/heroes';
import type { Action } from '../actions';
import { legalActions, reduce } from '../reducer';
import { createGame, topPending, type GameState } from '../state';
import { activateThrough, lookup } from './support';

const act = (state: GameState, action: Action) => reduce(state, action, lookup);

function newGame(a: string, b: string, seed = 4): GameState {
  return createGame(
    [
      { id: 'p1', name: 'One', hero: HEROES[a] },
      { id: 'p2', name: 'Two', hero: HEROES[b] },
    ],
    { seed },
  );
}

/** Puts a card in hand with the CP to play it. */
function deal(game: GameState, seat: number, cardId: string): string {
  const instance = `${cardId}#0`;
  game.players[seat].hand.unshift(instance);
  game.players[seat].cp = 12;
  return instance;
}

/** Settles rolls and questions until the table is waiting on nobody. */
function settle(game: GameState): GameState {
  for (let i = 0; i < 40; i++) {
    const options = legalActions(game, lookup);
    const pick =
      options.find((o) => o.type === 'rollPending') ??
      options.find((o) => o.type === 'confirmPending') ??
      options.find((o) => o.type === 'answerChoice') ??
      (game.response ? options.find((o) => o.type === 'passResponse') : undefined);
    if (!pick) return game;
    game = act(game, pick);
  }
  return game;
}

describe('Blessing of Divinity cannot be taken off', () => {
  // "This token may not be removed or transferred by any other means."

  it('survives Bye Bye!', () => {
    let game = newGame('paladin', 'barbarian');
    game.players[0].statuses['blessing-of-divinity'] = 1;
    const card = deal(game, 1, 'common-card-bye-bye');
    game.active = 1;
    game.phase = 'main1';

    game = act(game, { type: 'playCard', cardId: card, playerId: 'p2' });

    const offered = legalActions(game, lookup).flatMap((o) =>
      o.type === 'answerChoice' && o.answer.status ? [o.answer.status.statusId] : [],
    );
    expect(offered, 'the Blessing is not a legal pick').not.toContain('blessing-of-divinity');

    game = settle(game);
    expect(game.players[0].statuses['blessing-of-divinity']).toBe(1);
  });

  it('survives What Status?', () => {
    let game = newGame('paladin', 'barbarian');
    game.players[0].statuses['blessing-of-divinity'] = 1;
    game.players[0].statuses.crit = 1;
    const card = deal(game, 1, 'common-card-what-status');
    game.active = 1;
    game.phase = 'main1';

    game = act(game, { type: 'playCard', cardId: card, playerId: 'p2' });
    game = act(
      game,
      legalActions(game, lookup).find(
        (o) => o.type === 'answerChoice' && o.answer.player === 0,
      )!,
    );

    expect(game.players[0].statuses.crit, 'everything else goes').toBeUndefined();
    expect(game.players[0].statuses['blessing-of-divinity'], 'the Blessing stays').toBe(1);
  });

  it('survives Transfer Status!', () => {
    let game = newGame('paladin', 'barbarian');
    game.players[0].statuses['blessing-of-divinity'] = 1;
    const card = deal(game, 1, 'common-card-transfer-status');
    game.active = 1;
    game.phase = 'main1';

    game = act(game, { type: 'playCard', cardId: card, playerId: 'p2' });
    const offered = legalActions(game, lookup).flatMap((o) =>
      o.type === 'answerChoice' && o.answer.status ? [o.answer.status.statusId] : [],
    );
    expect(offered).not.toContain('blessing-of-divinity');
  });
});

describe('a Dryad ward turns aside the token an Attack Modifier brings', () => {
  it('stops Entangle arriving on a Volley!', () => {
    // Moon Elf swings, the Treant across the table has already warded.
    let game = newGame('moon-elf', 'treant');
    game = act(game, { type: 'nextPhase' }); // -> offensiveRoll

    const elf = HEROES['moon-elf'];
    const arrow = elf.dieFaces.find((f) => f.symbol === 'arrow')!.value;
    game.roll!.dice = Array.from({ length: 5 }, (_, i) => ({
      id: `d${i}`,
      value: arrow,
      kept: false,
    }));

    // Arrow Volley is the 4-arrow combo; take whichever ability the dice give.
    const ready = legalActions(game, lookup).find((o) => o.type === 'activateAbility');
    expect(ready, 'five arrows activate something').toBeDefined();
    game = activateThrough(game, ready!.abilityId, ready!.tierIndex);
    game = settle(game);
    expect(game.attack, 'an attack is on the table').not.toBeNull();

    const defender = game.attack!.defender;
    game.players[defender].statusWard = 1;
    const before = game.players[defender].statuses.entangle ?? 0;

    const card = deal(game, 0, 'moon-elf-volley');
    game = act(game, { type: 'playCard', cardId: card, playerId: 'p1' });
    game = settle(game);

    expect(topPending(game)).toBeNull();
    expect(
      game.players[defender].statuses.entangle ?? 0,
      'the ward should have turned the Entangle aside',
    ).toBe(before);
    expect(game.players[defender].statusWard, 'and been spent doing it').toBe(0);
  });
});
