import { HEROES } from '../../data/heroes';
import { legalActions, reduce, type HeroLookup } from '../reducer';
import type { GameState } from '../state';

export const lookup: HeroLookup = (id) => HEROES[id];

/**
 * Activates an ability and lets the table finish answering it.
 *
 * Declaring an Offensive Ability no longer resolves it: the rules give every
 * opponent holding a Roll Phase card a last chance to alter the dice first
 * (rulebook p.5, p.7). A test that only cares what the ability *does* should
 * not have to spell out each opponent waving it through, so this passes for
 * everyone who has nothing to say and hands back the settled state.
 */
export function activateThrough(
  state: GameState,
  abilityId: string,
  tierIndex?: number,
): GameState {
  let game = reduce(state, { type: 'activateAbility', abilityId, tierIndex }, lookup);
  // Each pass is one seat leaving the window, and playing a card reopens it,
  // so bound the loop rather than trusting it to drain.
  for (let i = 0; i < 24 && game.response; i++) {
    const pass = legalActions(game, lookup).find((a) => a.type === 'passResponse');
    if (!pass) break;
    game = reduce(game, pass, lookup);
  }
  return game;
}
