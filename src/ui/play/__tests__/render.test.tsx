import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import { HEROES } from '../../../data/heroes';
import { NINJA } from '../../../data/heroes/season1/ninja';
import { TREANT } from '../../../data/heroes/season1/treant';
import type { Action } from '../../../engine/actions';
import { legalActions, reduce, type HeroLookup } from '../../../engine/reducer';
import { createGame, topPending, type GameState } from '../../../engine/state';
import { EN } from '../../../i18n/en';
import { I18nContext, type I18nValue } from '../../../i18n/I18nContext';
import { GameTable } from '../GameTable';

const lookup: HeroLookup = (id) => HEROES[id];
const act = (state: GameState, action: Action) => reduce(state, action, lookup);

/**
 * The real provider reads localStorage and touches `document`, neither of
 * which exists here, so the test supplies the same value directly.
 */
const i18n: I18nValue = {
  lang: 'en',
  setLang: () => {},
  t: (key, fallback) => EN[key] ?? fallback ?? key,
  tList: (keyFor, fallback) => fallback.map((line, i) => EN[keyFor(i)] ?? line),
};

function render(node: ReactNode): string {
  return renderToStaticMarkup(
    <I18nContext.Provider value={i18n}>{node}</I18nContext.Provider>,
  );
}

function newGame(seed = 5): GameState {
  return createGame(
    [
      { id: 'p1', name: 'One', hero: NINJA },
      { id: 'p2', name: 'Two', hero: TREANT },
    ],
    seed,
  );
}

const table = (game: GameState, you = -1) =>
  render(<GameTable game={game} you={you} onAction={() => {}} />);

describe('the play table renders', () => {
  it('draws both ends of the table from the first turn', () => {
    const html = table(newGame());
    expect(html).toContain('seat seat--near');
    expect(html).toContain('seat seat--far');
    expect(html).toContain('board__wing');
    expect(html).toContain('rail__token');
    // Ninja's own tokens are listed whether or not any are in front of them.
    expect(html).toContain('Smoke Bomb');
    expect(html).toContain('Ninjutsu');
  });

  it('marks the abilities the dice on the table already satisfy', () => {
    let game = act(newGame(), { type: 'nextPhase' }); // -> offensiveRoll
    game.roll!.dice = [
      { id: 'd0', value: 1, kept: false },
      { id: 'd1', value: 1, kept: false },
      { id: 'd2', value: 1, kept: false },
      { id: 'd3', value: 6, kept: false },
      { id: 'd4', value: 6, kept: false },
    ];
    const html = table(game);
    expect(html).toContain('board__slot--live');
    expect(html).toContain('board__ready');
  });

  it('draws a sub-roll as dice the player has yet to throw', () => {
    let game = act(newGame(), { type: 'nextPhase' });
    game.roll!.dice = [
      { id: 'd0', value: 1, kept: false },
      { id: 'd1', value: 2, kept: false },
      { id: 'd2', value: 3, kept: false },
      { id: 'd3', value: 4, kept: false },
      { id: 'd4', value: 5, kept: false },
    ];
    game = act(game, { type: 'activateAbility', abilityId: 'death-blossom', tierIndex: 0 });
    expect(topPending(game)).not.toBeNull();

    const html = table(game);
    expect(html).toContain('pending');
    expect(html).toContain('die--blank');
    expect(html).toContain('Roll');
  });

  it('draws the choices a card asks for as buttons', () => {
    let game = newGame();
    game.players[0].hand.unshift('common-card-what-status#0');
    game.players[0].cp = 9;
    game = act(game, { type: 'playCard', cardId: 'common-card-what-status#0' });

    const html = table(game);
    expect(html).toContain('choice-row');
    // One button per player who could be stripped.
    expect(html.match(/class="choice"/g)?.length).toBe(2);
  });

  it('gives a shared screen a tab per seat so anyone can answer with an Instant', () => {
    const html = table(newGame());
    expect(html).toContain('hand__seats');
    expect(html).toContain('hand__seat');
  });

  it('shows only your own hand online', () => {
    const html = table(newGame(), 1);
    expect(html).not.toContain('hand__seats');
  });

  it('seats you at the near end and your opponent across the table', () => {
    const html = table(newGame(), 1); // you are seat 1, the Treant

    const near = html.indexOf('seat seat--near');
    const far = html.indexOf('seat seat--far');
    expect(near).toBeGreaterThan(-1);
    expect(far).toBeGreaterThan(-1);
    // The opponent is drawn first, so they are across the table rather than
    // under your own board.
    expect(far).toBeLessThan(near);

    expect(html).toContain('data-seat="1"');
    expect(html).toContain('data-seat="0"');
    // Only the two of them, so there is no row of spare seats.
    expect(html).not.toContain('table__other');
  });

  it('survives the end of the game', () => {
    const game = newGame();
    game.teams[1].health = 0;
    game.phase = 'gameOver';
    game.winner = game.teams[0].id;
    expect(table(game)).toContain('winner-banner');
  });

  it('offers a sell button in the Discard Phase', () => {
    let game = newGame();
    game = act(game, { type: 'nextPhase' });
    game = act(game, { type: 'skipAttack' });
    game = act(game, { type: 'nextPhase' }); // -> discard
    expect(game.phase).toBe('discard');
    expect(legalActions(game, lookup).some((o) => o.type === 'sellCard')).toBe(true);

    const html = table(game);
    // A disabled Sell button would carry the attribute; these must not.
    expect(html).toContain('Sell');
    expect(html).not.toContain('disabled="">Sell');
  });
});
