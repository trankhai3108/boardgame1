// Runs many bot games and reports what the engine still leaves to the players.
import { HERO_LIST, HEROES } from './src/data/heroes/index.ts';
import { runBots, seatToAct, chooseBotAction } from './src/engine/bot.ts';
import { reduce } from './src/engine/reducer.ts';
import { createGame, playerCountFor } from './src/engine/state.ts';

const lookup = (id) => HEROES[id];
const step = (g, a) => reduce(g, a, lookup);
const manual = new Map();
const results = { finished: 0, stalled: 0, rounds: [], turns: [] };

const MODES = ['1v1', '2v2', '3v3', '2v2v2', 'koth'];

for (const mode of MODES) {
  const count = mode === 'koth' ? 4 : playerCountFor(mode);
  for (let run = 0; run < 12; run++) {
    let game = createGame(
      Array.from({ length: count }, (_, i) => ({
        id: `p${i}`, name: `P${i}`,
        hero: HERO_LIST[(i + run) % HERO_LIST.length], isBot: true,
      })),
      { mode, seed: run * 7919 + mode.length },
    );
    let turns = 0;
    while (game.phase !== 'gameOver' && turns < 4000) {
      const before = game;
      const seat = seatToAct(game);
      const action = chooseBotAction(game, seat, lookup);
      if (!action) break;
      game = step(game, action);
      if (game === before) break;
      turns++;
    }
    for (const entry of game.log) {
      if (entry.message.startsWith('manual: ')) {
        const note = entry.message.slice(8);
        manual.set(note, (manual.get(note) ?? 0) + 1);
      }
    }
    if (game.phase === 'gameOver') {
      results.finished++; results.rounds.push(game.round); results.turns.push(turns);
    } else {
      results.stalled++;
      console.log(`STALLED ${mode} run ${run} at ${game.phase} after ${turns} actions`);
    }
  }
}

const avg = (a) => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1);
console.log(`\ngames finished: ${results.finished}, stalled: ${results.stalled}`);
console.log(`average rounds: ${avg(results.rounds)}, average actions: ${avg(results.turns)}`);
console.log(`\nrules the engine left to the players (${manual.size} distinct):`);
[...manual.entries()].sort((a, b) => b[1] - a[1]).forEach(([note, n]) =>
  console.log(`  ${String(n).padStart(4)}x  ${note}`));
void runBots;
