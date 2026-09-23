/**
 * What every hero's status tokens actually do.
 *
 * A token whose behaviour table entry is empty, or which only carries a
 * `manual` note, is a token the players have to apply by hand: the engine
 * will hold it and count it and never act on it.
 */
import { HERO_LIST } from '../src/data/heroes';
import { STATUS_BEHAVIOUR } from '../src/engine/statusBehaviour';

const ACTS = [
  'spendToPrevent', 'spendToBoost', 'spendToAvoid', 'autoAvoid', 'spendFreely',
  'upkeep', 'endOfTurn', 'rollAttemptPenalty', 'skipOrpUnlessPaid', 'skipIncome',
  'damagePerExtraRollAttempt', 'incomingBonus', 'failOrpOn', 'preventDefeatSetHealth',
  'grantsExtraOrpToInflicter',
];

let inert = 0;
let partial = 0;
let total = 0;

for (const hero of HERO_LIST) {
  const rows = [];
  for (const status of hero.statusEffects) {
    total += 1;
    const b = STATUS_BEHAVIOUR[status.id] ?? {};
    const does = ACTS.filter((k) => b[k] !== undefined);
    const mark = does.length === 0 ? 'NOTHING' : b.manual ? 'partial' : 'ok';
    if (mark === 'NOTHING') inert += 1;
    if (mark === 'partial') partial += 1;
    rows.push(
      `    ${mark.padEnd(8)} ${status.id.padEnd(22)} ${does.join(',') || '-'}` +
        (b.manual ? `\n             still by hand: ${b.manual}` : ''),
    );
  }
  console.log(`\n${hero.name}`);
  console.log(rows.join('\n'));
}

console.log(`\n${total} tokens: ${inert} do nothing, ${partial} partly by hand`);
