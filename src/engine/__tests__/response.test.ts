import { describe, expect, it } from 'vitest';
import { HEROES } from '../../data/heroes';
import { legalActions, reduce, type HeroLookup } from '../reducer';
import { createGame, type GameState } from '../state';

const lookup: HeroLookup = (id) => HEROES[id];
const act = (s: GameState, a: Parameters<typeof reduce>[1]) => reduce(s, a, lookup);
const options = (s: GameState) => legalActions(s, lookup);

/** The attacker mid-roll, with the defender holding dice-manipulation cards. */
function rolling(defenderCards: string[] = []): GameState {
  let game = createGame(
    [
      { id: 'p1', name: 'Attacker', hero: HEROES.barbarian },
      { id: 'p2', name: 'Defender', hero: HEROES['moon-elf'] },
    ],
    { seed: 5 },
  );
  game.players[1].cp = 15;
  game.players[1].hand = defenderCards.map((id) => `${id}#x`);
  game = act(game, { type: 'nextPhase' });
  // Three Swords: enough for Smack's first tier.
  game.roll!.dice = [1, 1, 1, 6, 6].map((value, i) => ({ id: `d${i}`, value, kept: true }));
  return game;
}

describe('answering an attack before it is activated', () => {
  /*
   * Rulebook p.7: a Roll Phase card "may be played on anyone's turn during the
   * Offensive, Targeting, and/or Defensive Roll Phase. Even after the dice
   * have finished rolling, there is one last chance to play these cards
   * before the game proceeds."
   *
   * Without that last chance the attacker simply activates, and an opponent
   * holding a card to stop them never gets to use it.
   */
  it('pauses for an opponent who has something to play', () => {
    let game = rolling(['common-card-give-hand']);
    game = act(game, { type: 'activateAbility', abilityId: 'smack', tierIndex: 0 });

    expect(game.response, 'the attack waits').not.toBeNull();
    expect(game.attack, 'and has not landed yet').toBeNull();

    // It is the defender's move, and the attacker may not push past them.
    const mine = options(game).filter((o) => o.type === 'playCard');
    expect(mine.length).toBeGreaterThan(0);
    expect(options(game).some((o) => o.type === 'activateAbility')).toBe(false);
  });

  it('does not pause when no opponent can do anything', () => {
    let game = rolling([]);
    game = act(game, { type: 'activateAbility', abilityId: 'smack', tierIndex: 0 });

    expect(game.response).toBeNull();
    expect(game.attack, 'the attack goes straight through').not.toBeNull();
  });

  it('goes ahead once the opponent passes', () => {
    let game = rolling(['common-card-give-hand']);
    game = act(game, { type: 'activateAbility', abilityId: 'smack', tierIndex: 0 });

    const pass = options(game).find((o) => o.type === 'passResponse');
    expect(pass).toBeDefined();
    game = act(game, pass!);

    expect(game.response).toBeNull();
    expect(game.attack?.abilityId).toBe('smack');
  });

  it('lets an opponent change a die and cancel the attack outright', () => {
    let game = rolling(['common-card-surprise']);
    game = act(game, { type: 'activateAbility', abilityId: 'smack', tierIndex: 0 });
    expect(game.response).not.toBeNull();

    // Surprise! changes any one die to any value: take a Sword away.
    const play = options(game).find(
      (o) => o.type === 'playCard' && o.cardId.startsWith('common-card-surprise'),
    );
    expect(play).toBeDefined();
    game = act(game, play!);

    // Answer whatever the card asks, steering the die off a Sword.
    for (let i = 0; i < 8 && game.pending.length > 0; i++) {
      const answers = options(game).filter((o) => o.type === 'answerChoice');
      const die = answers.find((o) => o.answer.dieId === 'd0');
      const value = answers.find((o) => o.answer.value === 6);
      const next = die ?? value ?? answers[0];
      if (!next) break;
      game = act(game, next);
    }

    const pass = options(game).find((o) => o.type === 'passResponse');
    if (pass) game = act(game, pass);

    // Smack needed three Swords and no longer has them, so nothing landed.
    const swords = game.roll?.dice.filter((d) => d.value <= 3).length ?? 0;
    if (swords < 3) {
      expect(game.attack, 'the ability was cancelled').toBeNull();
      expect(game.response).toBeNull();
    }
  });
});
