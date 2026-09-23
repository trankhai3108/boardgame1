import type { DamageType } from './damage';
import {
  removeStatus,
  statusCount,
  teamOf,
  type GameState,
} from './state';
import { behaviourOf } from './statusBehaviour';

/**
 * The one way health ever goes down.
 *
 * Losing health is never only arithmetic: it can be refused by Blessing of
 * Divinity, it can put a team out, and a team going out can end the game. It
 * also has to be reported so the table can show it.
 *
 * Collateral damage used to subtract from a team's health directly, because it
 * is dealt outside the attack being resolved and so never passed through the
 * attack pipeline. That skipped all four of those things: a game could be won
 * by collateral damage and the engine would not notice until the next ordinary
 * hit landed.
 */
export function dealDamage(
  state: GameState,
  index: number,
  amount: number,
  type: DamageType = 'normal',
): void {
  if (amount <= 0) return;

  const player = state.players[index];
  const team = teamOf(state, index);

  team.health -= amount;
  state.events.push({ kind: 'damage', player: index, amount, type });

  const say = (message: string, named = true): void => {
    state.log.push({
      round: state.round,
      phase: state.phase,
      player: named ? player.name : undefined,
      message,
    });
  };

  if (team.health <= 0) {
    const rescue = behaviourOf('blessing-of-divinity').preventDefeatSetHealth;
    // An Ultimate cannot be prevented or avoided by anything, and refusing to
    // be defeated by it is both.
    const refusable = type !== 'ultimate';
    if (refusable && rescue !== undefined && statusCount(player, 'blessing-of-divinity') > 0) {
      removeStatus(player, 'blessing-of-divinity', 1);
      team.health = rescue;
      say(`Blessing of Divinity: health set to ${rescue}`);
    }
  }

  if (team.health > 0) return;

  team.health = 0;
  say(`${team.name} is out`, false);

  // With three teams on the table, one going out does not end the game: play
  // continues until a single team is left.
  const survivors = state.teams.filter((t) => t.health > 0);
  if (survivors.length > 1) return;

  state.phase = 'gameOver';
  state.pending = [];
  state.winner = survivors.length === 1 ? survivors[0].id : null;
  say(survivors.length === 1 ? `${survivors[0].name} wins` : 'draw', false);
}
