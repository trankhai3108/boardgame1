import { describe, expect, it } from 'vitest';
import { HEROES } from '../../data/heroes';
import type { Action } from '../actions';
import { canPlayCard, legalActions, reduce } from '../reducer';
import { createGame, topPending, type GameState } from '../state';
import { lookup } from './support';

const act = (s: GameState, a: Action) => reduce(s, a, lookup);

/** Seat 0 is rolling; seat 1 is not. */
function rolling(seed = 6): GameState {
  let game = createGame(
    [
      { id: 'p1', name: 'Active', hero: HEROES.ninja },
      { id: 'p2', name: 'Other', hero: HEROES['shadow-thief'] },
    ],
    { seed },
  );
  game = act(game, { type: 'nextPhase' });
  game.roll!.dice = [1, 2, 3, 4, 5].map((value, i) => ({ id: `d${i}`, value, kept: false }));
  return game;
}

function give(game: GameState, seat: number, cardId: string): string {
  const id = `${cardId}#0`;
  game.players[seat].hand.unshift(id);
  game.players[seat].cp = 12;
  return id;
}

const cardOf = (heroId: string, cardId: string) =>
  HEROES[heroId].cards.find((c) => c.id === cardId)!;

const offered = (game: GameState, seat: number, id: string) =>
  legalActions(game, lookup).some(
    (o) => o.type === 'playCard' && o.cardId === id && o.playerId === game.players[seat].id,
  );

/** Plays the card and answers every question with the first option. */
function playThrough(game: GameState, seat: number, id: string): GameState {
  let next = act(game, { type: 'playCard', cardId: id, playerId: game.players[seat].id });
  for (let i = 0; i < 12 && topPending(next); i++) {
    const answer = legalActions(next, lookup).find((o) => o.type === 'answerChoice');
    if (!answer) break;
    next = act(next, answer);
  }
  return next;
}

const dice = (game: GameState) => game.roll!.dice.map((d) => d.value).join(' ');

/*
 * Only the seat whose Roll Phase it is has dice on the table. A card that
 * reaches for a die of a particular owner is therefore playable by one side
 * and not the other, and the engine has to say so before the card is spent.
 */
describe('cards that reach for a die are offered to the seat that can use them', () => {
  const cases: [string, string, 0 | 1, 0 | 1][] = [
    // card                                    hero            can       cannot
    ['common-card-play-six', 'ninja', 0, 1],
    ['common-card-me-too', 'ninja', 0, 1],
    ['common-card-worthy-of-me', 'ninja', 0, 1],
    ['common-card-give-hand', 'shadow-thief', 1, 0],
  ];

  for (const [cardId, heroId, can, cannot] of cases) {
    it(`${cardId} suits one side of the table only`, () => {
      const game = rolling();
      const a = give(game, can, cardId);
      const b = give(game, cannot, cardId);
      const card = cardOf(heroId, cardId);

      expect(canPlayCard(game, can, card, a, lookup), 'the seat that can act').toBe(true);
      expect(canPlayCard(game, cannot, card, b, lookup), 'the seat that cannot').toBe(false);
    });
  }

  for (const cardId of [
    'common-card-surprise',
    'common-card-unexpected',
    'common-card-flick',
    'shadow-thief-action-shadow-manipulation',
  ]) {
    it(`${cardId} reaches any die, so either seat may play it`, () => {
      const game = rolling();
      const a = give(game, 0, cardId);
      const b = give(game, 1, cardId);
      // Shadow Manipulation is a Shadow Thief card; the Ninja never holds one.
      const hero = cardId.startsWith('shadow-thief') ? 'shadow-thief' : 'ninja';
      if (!cardId.startsWith('shadow-thief')) {
        expect(canPlayCard(game, 0, cardOf(hero, cardId), a, lookup)).toBe(true);
      }
      expect(canPlayCard(game, 1, cardOf('shadow-thief', cardId), b, lookup)).toBe(true);
    });
  }
});

describe('and then they actually change the dice', () => {
  it('Play Six! sets one of your own dice to 6', () => {
    const game = rolling();
    const id = give(game, 0, 'common-card-play-six');
    const next = playThrough(game, 0, id);

    expect(topPending(next)).toBeNull();
    expect(next.roll!.dice.some((d) => d.value === 6), dice(next)).toBe(true);
  });

  it("Give a Hand! re-rolls an opponent's die", () => {
    const game = rolling();
    const id = give(game, 1, 'common-card-give-hand');
    const next = playThrough(game, 1, id);

    expect(topPending(next)).toBeNull();
    // The die is thrown again, so the log records it whatever it lands on.
    expect(next.log.some((e) => /re-rolled/.test(e.message)), 'a re-roll is logged').toBe(true);
  });

  it('Surprise! sets any die to the value picked', () => {
    const game = rolling();
    const id = give(game, 1, 'common-card-surprise');

    let next = act(game, { type: 'playCard', cardId: id, playerId: 'p2' });
    // Pick the die showing 1, then ask for a 6 — answering with the first
    // option each time would have set it to 1 and proved nothing.
    next = act(next, { type: 'answerChoice', answer: { dieId: 'd0' } });
    next = act(next, { type: 'answerChoice', answer: { value: 6 } });

    expect(topPending(next)).toBeNull();
    expect(dice(next)).toBe('6 2 3 4 5');
  });

  it('Flick! moves a die by exactly one', () => {
    const game = rolling();
    const id = give(game, 1, 'common-card-flick');
    const next = playThrough(game, 1, id);

    expect(topPending(next)).toBeNull();
    const before = [1, 2, 3, 4, 5];
    const after = next.roll!.dice.map((d) => d.value);
    const moved = after.map((v, i) => v - before[i]).filter((d) => d !== 0);
    expect(moved, dice(next)).toHaveLength(1);
    expect(Math.abs(moved[0])).toBe(1);
  });

  it('Me Too! copies a value another of your dice already shows', () => {
    const game = rolling();
    const id = give(game, 0, 'common-card-me-too');
    const next = playThrough(game, 0, id);

    expect(topPending(next)).toBeNull();
    const after = next.roll!.dice.map((d) => d.value);
    // One die changed, and it now matches one of the others.
    const changed = after.filter((v, i) => v !== [1, 2, 3, 4, 5][i]);
    expect(changed.length).toBeLessThanOrEqual(1);
    if (changed.length === 1) {
      expect(after.filter((v) => v === changed[0]).length).toBeGreaterThanOrEqual(2);
    }
  });

  it('never spends a card without asking something first', () => {
    // Every die card that is on offer must open a question; if it cannot, it
    // should not have been offered at all.
    const ids = [
      'common-card-play-six',
      'common-card-me-too',
      'common-card-surprise',
      'common-card-unexpected',
      'common-card-flick',
      'common-card-worthy-of-me',
      'common-card-give-hand',
    ];
    for (const cardId of ids) {
      for (const seat of [0, 1] as const) {
        const game = rolling();
        const id = give(game, seat, cardId);
        if (!offered(game, seat, id)) continue;
        const next = act(game, {
          type: 'playCard',
          cardId: id,
          playerId: game.players[seat].id,
        });
        expect(topPending(next), `${cardId} from seat ${seat}`).not.toBeNull();
        expect(
          next.log.some((e) => /nothing to choose/.test(e.message)),
          `${cardId} from seat ${seat} was spent for nothing`,
        ).toBe(false);
      }
    }
  });
});
